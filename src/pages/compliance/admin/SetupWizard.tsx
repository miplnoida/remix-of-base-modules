import { ComplianceHelpButton } from '@/components/help/ComplianceHelpButton';
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CheckCircle2,
  Circle,
  AlertTriangle,
  MinusCircle,
  Ban,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";
import { useHasPermission } from "@/hooks/useNavigationMenu";
import {
  useComplianceSetupStatus,
  ComplianceSetupCounts,
  ComplianceSetupFlags,
} from "@/hooks/useComplianceSetupStatus";

type StepStatus =
  | "completed"
  | "incomplete"
  | "warning"
  | "disabled"
  | "not_applicable"
  | "unknown";

interface WizardStep {
  id: string;
  index: number;
  title: string;
  what: string;
  why: string;
  configure: string;
  skipImpact: string;
  critical: boolean;
  /** Deep-links to existing admin screens (or reserved placeholders). */
  links: Array<{ label: string; to: string }>;
  derive: (
    counts: ComplianceSetupCounts,
    flags: ComplianceSetupFlags
  ) => StepStatus;
}

function statusFromCount(n: number | null, min = 1): StepStatus {
  if (n === null) return "unknown";
  if (n >= min) return "completed";
  return "incomplete";
}

const STEPS: WizardStep[] = [
  {
    id: "basic",
    index: 1,
    title: "Basic Compliance Settings",
    what: "Capture foundational settings (jurisdiction, fiscal year, default currency) used across the Compliance & Enforcement module.",
    why: "Downstream calculations, notices and reports rely on these values being present.",
    configure: "Set jurisdiction, fiscal year start month and default currency in compliance.basic.* settings.",
    skipImpact: "Numbering, dates and currency on notices and reports may be inconsistent or blank.",
    critical: true,
    links: [
      { label: "Open General Settings", to: "/compliance/admin/settings" },
    ],
    derive: (_c, f) => (f.basicSettingsConfigured ? "completed" : "incomplete"),
  },
  {
    id: "features",
    index: 2,
    title: "Enable Optional Features",
    what: "Decide which optional Compliance feature areas (waivers, payment arrangements, automation, etc.) should be enabled for your jurisdiction.",
    why: "Disabled features stay hidden in menus and skipped by automation, preventing partial workflows from running.",
    configure: "Toggle compliance.feature.* keys via the Feature Toggles screen.",
    skipImpact: "All features remain in their default state; some may surface menus that are not yet operational.",
    critical: false,
    links: [
      { label: "Open Feature Toggles", to: "/compliance/admin/feature-toggles" },
    ],
    derive: (_c, f) =>
      Object.values(f.optionalFeatures).some(Boolean) ? "completed" : "incomplete",
  },
  {
    id: "violation-types",
    index: 3,
    title: "Define Violation Types",
    what: "Catalogue the types of compliance violations (late filing, unpaid contributions, missing returns, etc.).",
    why: "Violation type drives case family, calculation rule, escalation rule and notice template selection.",
    configure: "Create at least one active violation type with code, severity and default case family.",
    skipImpact: "Inspectors cannot record findings; rule engine has nothing to classify.",
    critical: true,
    links: [
      { label: "Open Violation Types", to: "/compliance/admin/settings/violation-types" },
    ],
    derive: (c) => statusFromCount(c.violationTypes),
  },
  {
    id: "rules",
    index: 4,
    title: "Define Rules (Detection)",
    what: "Author detection rules that scan source data (C3, payments, registrations) and raise candidate violations.",
    why: "Without rules, the system has no automated way to detect non-compliance.",
    configure: "Add detection rules in the Rule Engine. Each rule should point at a violation type.",
    skipImpact: "Only manually entered violations will exist; no proactive enforcement.",
    critical: true,
    links: [
      { label: "Open Rule Engine", to: "/compliance/admin/settings/rule-engine" },
    ],
    derive: (c) => statusFromCount(c.detectionRules),
  },
  {
    id: "calc-rules",
    index: 5,
    title: "Define Calculation Rules",
    what: "Define how penalties, interest and arrears are computed for each violation type.",
    why: "Case financials and notices depend on deterministic calculation rules.",
    configure: "Author calculation rules in ce_calculation_rules; bind to violation types.",
    skipImpact: "Cases will lack penalty amounts; legal pack and notices may be blocked.",
    critical: true,
    links: [
      { label: "Open Calculation Rules", to: "/compliance/admin/calculation-rules" },
    ],
    derive: (c) => statusFromCount(c.calculationRules),
  },
  {
    id: "case-families",
    index: 6,
    title: "Define Case Families",
    what: "Group violation types into case families that share workflow, severity scoring and SLA rules.",
    why: "Routing, escalation and reporting use case family as the primary grouping.",
    configure: "Create case families and map violation types to them.",
    skipImpact: "Cases cannot be routed or merged consistently.",
    critical: true,
    links: [
      { label: "Open Case Families", to: "/compliance/admin/case-families" },
    ],
    derive: (c) => statusFromCount(c.caseFamilies),
  },
  {
    id: "risk",
    index: 7,
    title: "Configure Risk Scoring",
    what: "Weight the factors that drive employer risk scores (history, size, sector, prior violations).",
    why: "Risk scoring feeds audit priority, watchlists and assignment routing.",
    configure: "Set audit priority weights and risk policy thresholds.",
    skipImpact: "Risk-based prioritisation falls back to defaults; high-risk employers may not surface.",
    critical: false,
    links: [
      { label: "Open Risk Policy", to: "/compliance/admin/settings/risk-policy" },
      { label: "Open Risk Operations", to: "/compliance/admin/risk-operations" },
    ],
    derive: (c) => statusFromCount(c.riskPriorityWeights),
  },
  {
    id: "workflows",
    index: 8,
    title: "Configure Workflows",
    what: "Map case families and actions to workflow definitions (intake, review, approval, closure).",
    why: "Every action (case advance, notice issue, legal handoff) is gated by a workflow assignment.",
    configure: "Ensure workflow definitions exist for compliance actions and map them via Workflow Mapping.",
    skipImpact: "Actions will fail with 'no workflow' errors and users cannot progress cases.",
    critical: true,
    links: [
      { label: "Open Workflow Mapping", to: "/compliance/admin/workflow-mapping" },
      { label: "Open Assignment Routing", to: "/compliance/admin/settings/assignment-routing" },
    ],
    derive: (c) => statusFromCount(c.workflowDefs),
  },
  {
    id: "notices",
    index: 9,
    title: "Configure Notices",
    what: "Author notice templates (first reminder, demand, intent to escalate) with merge fields.",
    why: "Notices are how the regulator communicates with employers; missing templates block notice generation.",
    configure: "Create at least one approved notice template per case family.",
    skipImpact: "Notice generation will fail; employers receive no formal communication.",
    critical: true,
    links: [
      { label: "Open Notice Templates", to: "/compliance/admin/communication-templates" },
      { label: "Open Document Templates", to: "/compliance/admin/settings/templates" },
    ],
    derive: (c) => statusFromCount(c.noticeTemplates),
  },
  {
    id: "arrangements",
    index: 10,
    title: "Configure Payment Arrangements",
    what: "Define which arrangements employers may request (term, down-payment, interest, breach rules).",
    why: "Without policies, arrangement requests cannot be evaluated or approved.",
    configure: "Author at least one active arrangement policy.",
    skipImpact: "Employers cannot enter payment arrangements; cases stall at financial step.",
    critical: false,
    links: [
      { label: "Open Payment Arrangement Rules", to: "/compliance/admin/payment-arrangement-rules" },
      { label: "Open Waiver Rules", to: "/compliance/admin/waiver-rules" },
    ],
    derive: (c) => statusFromCount(c.arrangementPolicies),
  },
  {
    id: "legal-handoff",
    index: 11,
    title: "Configure Legal Handoff",
    what: "Define when and how cases escalate to Legal (prerequisites, document pack, approver chain).",
    why: "Legal escalations are a sensitive boundary and must follow a documented policy.",
    configure: "Author legal escalation policies and escalation rules; ensure prerequisites are wired.",
    skipImpact: "Legal queue will accept ad-hoc escalations with no consistency or audit trail.",
    critical: false,
    links: [
      { label: "Open Legal Handoff Rules", to: "/compliance/admin/legal-handoff-rules" },
      { label: "Open Escalation Rules", to: "/compliance/admin/escalation-rules" },
    ],
    derive: (c) => {
      if (c.legalEscalationPolicies === null) return "unknown";
      const policies = c.legalEscalationPolicies ?? 0;
      const rules = c.escalationRules ?? 0;
      if (policies >= 1 && rules >= 1) return "completed";
      if (policies >= 1 || rules >= 1) return "warning";
      return "incomplete";
    },
  },
  {
    id: "automation",
    index: 12,
    title: "Configure Automation Jobs",
    what: "Schedule jobs that run detection rules, ageing, breach checks and notice dispatch.",
    why: "Without scheduled jobs, automation does nothing even if rules exist.",
    configure: "Enable and schedule jobs under Automation & Jobs.",
    skipImpact: "Detection, ageing and breach monitoring will not run automatically.",
    critical: false,
    links: [
      { label: "Open Automation Jobs", to: "/compliance/admin/automation/jobs" },
      { label: "Job History", to: "/compliance/admin/automation/history" },
    ],
    derive: (c) => statusFromCount(c.automationJobs),
  },
  {
    id: "simulators",
    index: 13,
    title: "Run Simulators",
    what: "Dry-run rules and risk scoring against historical data to validate configuration before activation.",
    why: "Catches mis-configured rules and unexpected penalty amounts without affecting live cases.",
    configure: "Open Rule Simulator and Risk Simulator and run at least one scenario.",
    skipImpact: "Activation will go live without validation; mistakes may generate incorrect notices.",
    critical: false,
    links: [
      { label: "Open Rule Simulator", to: "/compliance/admin/tools/rule-simulator" },
      { label: "Open Risk Simulator", to: "/compliance/admin/tools/risk-simulator" },
    ],
    derive: (_c, f) =>
      f.rawSettings.some(
        (r) => r.setting_key === "compliance.simulators.last_run_at"
      )
        ? "completed"
        : "warning",
  },
  {
    id: "activate",
    index: 14,
    title: "Activate Configuration",
    what: "Flip the activation flag so automation, notices and legal handoff begin operating on live data.",
    why: "Activation is the single switch that takes Compliance & Enforcement from configuration into production.",
    configure: "Resolve all critical steps above, then click Activate. Stored in compliance.activated.",
    skipImpact: "Module remains in configuration mode and automation will not run on live data.",
    critical: true,
    links: [],
    derive: (_c, f) => (f.activated ? "completed" : "incomplete"),
  },
];

const STATUS_META: Record<
  StepStatus,
  { label: string; tone: string; Icon: any }
> = {
  completed: {
    label: "Completed",
    tone: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
    Icon: CheckCircle2,
  },
  incomplete: {
    label: "Incomplete",
    tone: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
    Icon: Circle,
  },
  warning: {
    label: "Warning",
    tone: "bg-yellow-100 text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-100",
    Icon: AlertTriangle,
  },
  disabled: {
    label: "Disabled",
    tone: "bg-muted text-muted-foreground",
    Icon: Ban,
  },
  not_applicable: {
    label: "Not Applicable",
    tone: "bg-muted text-muted-foreground",
    Icon: MinusCircle,
  },
  unknown: {
    label: "Warning",
    tone: "bg-yellow-100 text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-100",
    Icon: AlertTriangle,
  },
};

function StatusBadge({ status }: { status: StepStatus }) {
  const meta = STATUS_META[status];
  const Icon = meta.Icon;
  return (
    <Badge variant="outline" className={`gap-1 ${meta.tone} border-transparent`}>
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </Badge>
  );
}

const SetupWizard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useSupabaseAuth();
  const canView = useHasPermission("ce_admin_setup_wizard", "view");
  const canEdit =
    useHasPermission("ce_admin_setup_wizard", "edit") ||
    useHasPermission("ce_admin_setup_wizard", "manage") ||
    useHasPermission("ce_admin_setup_wizard", "approve");

  const { counts, flags, isLoading, isError, refetch } =
    useComplianceSetupStatus();
  const [busy, setBusy] = useState(false);

  const stepStatuses = useMemo(
    () =>
      STEPS.map((s) => ({
        step: s,
        status: isLoading ? ("unknown" as StepStatus) : s.derive(counts, flags),
      })),
    [counts, flags, isLoading]
  );

  const criticalMissing = stepStatuses.filter(
    (s) =>
      s.step.critical &&
      s.step.id !== "activate" &&
      (s.status === "incomplete" || s.status === "warning" || s.status === "unknown")
  );

  const activationBlocked = criticalMissing.length > 0;

  const upsertSetting = async (
    key: string,
    value: string,
    category = "compliance"
  ) => {
    const userCode = profile?.user_code ?? null;
    const { error } = await supabase.from("ce_settings").upsert(
      {
        setting_key: key,
        setting_value: value,
        data_type: "boolean",
        category,
        updated_by: userCode,
        created_by: userCode,
      },
      { onConflict: "setting_key" }
    );
    if (error) throw error;
  };

  const activateMutation = useMutation({
    mutationFn: async () => {
      if (activationBlocked) {
        throw new Error("Resolve all critical steps before activation.");
      }
      await upsertSetting("compliance.activated", "true");
    },
    onSuccess: () => {
      toast.success("Compliance & Enforcement activated");
      queryClient.invalidateQueries({ queryKey: ["compliance-setup-status"] });
    },
    onError: (err: any) => {
      toast.error("Activation failed", {
        description: err?.message ?? "Unknown error",
      });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async () => {
      await upsertSetting("compliance.activated", "false");
    },
    onSuccess: () => {
      toast.success("Compliance & Enforcement deactivated");
      queryClient.invalidateQueries({ queryKey: ["compliance-setup-status"] });
    },
    onError: (err: any) => {
      toast.error("Deactivation failed", {
        description: err?.message ?? "Unknown error",
      });
    },
  });

  if (!canView) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTitle>Access denied</AlertTitle>
          <AlertDescription>
            You do not have permission to view the Compliance Setup Wizard.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Wand2 className="h-6 w-6 text-primary" />
            Compliance &amp; Enforcement — Setup Wizard
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Guided checklist for taking the Compliance &amp; Enforcement module
            from initial configuration into production. Each step reflects the
            current state of the system and deep-links to the relevant admin
            screen.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ComplianceHelpButton screenKey="admin-setup-wizard" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </header>

      {isError && (
        <Alert variant="destructive">
          <AlertTitle>Could not load configuration state</AlertTitle>
          <AlertDescription>
            Some counts could not be read. Status values shown as "Warning"
            below should be re-verified manually.
          </AlertDescription>
        </Alert>
      )}

      {/* Activation Readiness Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <CardTitle>Activation Readiness</CardTitle>
            </div>
            {flags.activated ? (
              <Badge className="bg-green-600 hover:bg-green-700">Active</Badge>
            ) : (
              <Badge variant="secondary">Not Activated</Badge>
            )}
          </div>
          <CardDescription>
            Activation enables automation jobs, notice dispatch and legal
            handoff against live data. It is blocked until all critical steps
            are satisfied.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          ) : criticalMissing.length === 0 ? (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>All critical configuration is in place</AlertTitle>
              <AlertDescription>
                You can proceed to activate. Optional steps may still be
                outstanding and are listed below.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>
                {criticalMissing.length} critical step
                {criticalMissing.length === 1 ? "" : "s"} outstanding
              </AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  {criticalMissing.map(({ step }) => (
                    <li key={step.id}>
                      {step.index}. {step.title}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <Separator />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              {flags.activatedAt
                ? `Last change: ${new Date(flags.activatedAt).toLocaleString()}${
                    flags.activatedBy ? ` by ${flags.activatedBy}` : ""
                  }`
                : "Never activated"}
            </div>
            <div className="flex gap-2">
              {flags.activated ? (
                <Button
                  variant="outline"
                  disabled={!canEdit || deactivateMutation.isPending}
                  onClick={() => {
                    setBusy(true);
                    deactivateMutation.mutate(undefined, {
                      onSettled: () => setBusy(false),
                    });
                  }}
                >
                  Deactivate
                </Button>
              ) : (
                <Button
                  disabled={
                    !canEdit ||
                    activationBlocked ||
                    activateMutation.isPending ||
                    busy
                  }
                  onClick={() => {
                    setBusy(true);
                    activateMutation.mutate(undefined, {
                      onSettled: () => setBusy(false),
                    });
                  }}
                  className="gap-2"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Activate Configuration
                </Button>
              )}
            </div>
          </div>
          {!canEdit && (
            <p className="text-xs text-muted-foreground">
              You can view this wizard but do not have permission to change the
              activation state.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Steps</CardTitle>
          <CardDescription>
            Each step links to the existing admin screen that owns the
            configuration. Status is derived from real data — no values are
            stubbed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {stepStatuses.map(({ step, status }) => (
              <AccordionItem key={step.id} value={step.id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center justify-between gap-3 w-full pr-3">
                    <div className="flex items-center gap-3 text-left">
                      <span className="text-xs text-muted-foreground w-6">
                        {step.index.toString().padStart(2, "0")}
                      </span>
                      <span className="font-medium">{step.title}</span>
                      {step.critical && (
                        <Badge variant="outline" className="text-[10px]">
                          Critical
                        </Badge>
                      )}
                    </div>
                    <StatusBadge status={status} />
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pl-9 pr-2 pb-2">
                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="font-medium text-foreground">What this step does</div>
                        <p className="text-muted-foreground mt-1">{step.what}</p>
                      </div>
                      <div>
                        <div className="font-medium text-foreground">Why it matters</div>
                        <p className="text-muted-foreground mt-1">{step.why}</p>
                      </div>
                      <div>
                        <div className="font-medium text-foreground">What to configure</div>
                        <p className="text-muted-foreground mt-1">{step.configure}</p>
                      </div>
                      <div>
                        <div className="font-medium text-foreground">If skipped</div>
                        <p className="text-muted-foreground mt-1">{step.skipImpact}</p>
                      </div>
                    </div>
                    {step.links.length > 0 && (
                      <>
                        <Separator />
                        <div className="flex flex-wrap gap-2">
                          {step.links.map((link) => (
                            <Button
                              key={link.to}
                              size="sm"
                              variant="outline"
                              className="gap-2"
                              onClick={() => navigate(link.to)}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              {link.label}
                            </Button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Need to revisit the high-level menu plan?{" "}
        <Link
          to="/compliance/admin/help"
          className="underline hover:text-foreground"
        >
          Open Help &amp; Instructions
        </Link>
        .
      </p>
    </div>
  );
};

export default SetupWizard;
