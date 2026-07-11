/**
 * EPIC CH-SAFE-1 — Event Gate Summary card.
 *
 * Reusable readiness summary for a specific module/event/channel. Combines
 * global control settings, event send policy, review policy, template map,
 * sender profile, and dedup rule into a plain-language verdict + card list.
 *
 * Read-only — never mutates settings or sends anything.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle, AlertTriangle, ArrowRight } from "lucide-react";
import { fetchControlSettings } from "../controlCenter/controlCenterService";
import { resolveSendPolicy } from "../sendPolicy/sendPolicyService";
import { getAutomationSetting } from "../services/moduleAutomationSettingsService";
import { explainBlocker } from "./plainLanguageBlockers";

type Tone = "success" | "warning" | "destructive" | "info";

interface GateCardModel {
  key: string;
  title: string;
  category: string;
  tone: Tone;
  message: string;
  blockerCode?: string;
  fixHref?: string;
}

export interface EventGateSummaryProps {
  moduleCode: string;
  eventCode: string;
  channel?: string;
  environmentScope?: string;
  showHeader?: boolean;
}

function toneClasses(t: Tone) {
  switch (t) {
    case "success": return "bg-success/10 text-success border-success/30";
    case "warning": return "bg-warning/10 text-warning border-warning/30";
    case "destructive": return "bg-destructive/10 text-destructive border-destructive/30";
    case "info": return "bg-info/10 text-info border-info/30";
  }
}

function toneIcon(t: Tone) {
  if (t === "success") return <CheckCircle2 className="h-4 w-4" />;
  if (t === "warning") return <AlertTriangle className="h-4 w-4" />;
  if (t === "destructive") return <XCircle className="h-4 w-4" />;
  return <ShieldCheck className="h-4 w-4" />;
}

export function EventGateSummary({ moduleCode, eventCode, channel = "email", environmentScope = "production", showHeader = true }: EventGateSummaryProps) {
  const [loading, setLoading] = useState(true);
  const [gates, setGates] = useState<GateCardModel[]>([]);
  const [verdict, setVerdict] = useState<{ label: string; tone: Tone; detail: string }>({ label: "Loading...", tone: "info", detail: "" });

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        // For LEGAL/INTERNAL_CASE_ASSIGNMENT_NOTICE we also read the shared
        // automation setting so the automation gate + verdict are dynamic.
        const isLegalAssignment = moduleCode === "LEGAL" && eventCode === "INTERNAL_CASE_ASSIGNMENT_NOTICE";
        const automationKey = "legal_auto_send_internal_assignment_notice";

        const [settings, policyResp, automation] = await Promise.all([
          fetchControlSettings(),
          resolveSendPolicy({ moduleCode, eventCode, channel, environmentScope }).catch(() => null),
          isLegalAssignment
            ? getAutomationSetting(moduleCode, automationKey, environmentScope).catch(() => null)
            : Promise.resolve(null),
        ]);
        if (!alive) return;
        const policy: any = (policyResp && (Array.isArray(policyResp) ? policyResp[0] : policyResp)) ?? {};

        const cards: GateCardModel[] = [];

        // System gate
        if (!settings.dispatch_enabled) {
          cards.push({ key: "system", title: "System Gate", category: "system", tone: "destructive",
            message: explainBlocker("dispatch_disabled").message, blockerCode: "dispatch_disabled",
            fixHref: "/admin/communication-hub/control-center" });
        } else if (settings.dry_run_only) {
          cards.push({ key: "system", title: "System Gate", category: "system", tone: "warning",
            message: explainBlocker("global_dry_run_only").message, blockerCode: "global_dry_run_only",
            fixHref: "/admin/communication-hub/safety" });
        } else if (!settings.email_live_enabled) {
          cards.push({ key: "system", title: "System Gate", category: "system", tone: "warning",
            message: explainBlocker("email_live_disabled").message, blockerCode: "email_live_disabled",
            fixHref: "/admin/communication-hub/safety" });
        } else {
          cards.push({ key: "system", title: "System Gate", category: "system", tone: "success",
            message: "Dispatcher on, live email on, dry-run off. System is ready to send." });
        }

        // Send policy
        const sp = policy?.send_policy ?? "prepare_only";
        if (["disabled","dry_run_only","prepare_only"].includes(sp)) {
          cards.push({ key: "send", title: "Send Policy Gate", category: "event", tone: "warning",
            message: `Send policy is ${sp}. The event will not send live.`,
            blockerCode: "send_policy_not_live",
            fixHref: "/admin/communication-hub/governance/send-policies" });
        } else if (sp === "manual_review") {
          cards.push({ key: "send", title: "Send Policy Gate", category: "event", tone: "info",
            message: "Send policy requires manual review before live send." });
        } else {
          cards.push({ key: "send", title: "Send Policy Gate", category: "event", tone: "success",
            message: `Send policy is ${sp}.` });
        }

        // Review policy
        const rp = policy?.review_policy ?? policy?.review ?? null;
        if (rp === "preview_required" || rp === "approval_required") {
          cards.push({ key: "review", title: "Review Policy Gate", category: "review", tone: "info",
            message: `Review policy: ${rp}.` });
        } else {
          cards.push({ key: "review", title: "Review Policy Gate", category: "review", tone: "success",
            message: rp ? `Review policy: ${rp}.` : "No review required for this event." });
        }

        // Template gate
        cards.push({ key: "template", title: "Template Gate", category: "template", tone: "info",
          message: "Ensure the active template version is approved for live sending.",
          fixHref: "/admin/communication-hub/design" });

        // Sender gate
        cards.push({ key: "sender", title: "Sender Gate", category: "sender", tone: "info",
          message: "Ensure the sender profile is verified with the provider.",
          fixHref: "/admin/communication-hub/design/sender-verification" });

        // Recipient allowlist
        const domains = settings.allowed_email_domains ?? [];
        if (domains.length === 0) {
          cards.push({ key: "recipient", title: "Recipient Gate", category: "recipient", tone: "warning",
            message: "No recipient domains are allowlisted. Live sends will be blocked.",
            blockerCode: "recipient_domain_not_allowlisted",
            fixHref: "/admin/communication-hub/control-center" });
        } else {
          cards.push({ key: "recipient", title: "Recipient Gate", category: "recipient", tone: "success",
            message: `Allowlisted domains: ${domains.join(", ")}.` });
        }

        // Duplicate — warn if assignment event still uses entity-only scope
        const dupScope = policy?.duplicate_scope ?? "entity";
        const dupWindow = policy?.duplicate_window_minutes ?? "?";
        if (isLegalAssignment && dupScope === "entity") {
          cards.push({ key: "dup", title: "Duplicate Gate", category: "duplicate", tone: "warning",
            message: `Duplicate scope is entity-only (window ${dupWindow} min). This is too broad for assignment notices — use an assignment-aware duplicate policy (entity_business_event).`,
            fixHref: "/admin/communication-hub/governance/send-policies" });
        } else {
          cards.push({ key: "dup", title: "Duplicate Gate", category: "duplicate", tone: "success",
            message: `Duplicate scope: ${dupScope} (window ${dupWindow} min).` });
        }

        // Automation — dynamic for Legal assignment
        const autoValue = (automation as any)?.setting_value ?? null;
        if (isLegalAssignment) {
          if (autoValue === "auto_live_internal") {
            cards.push({ key: "auto", title: "Automation Gate", category: "automation", tone: "success",
              message: "Legal assignment automation is set to auto_live_internal.",
              fixHref: "/admin/communication-hub/governance/automation-settings" });
          } else if (autoValue === "prepare_only") {
            cards.push({ key: "auto", title: "Automation Gate", category: "automation", tone: "warning",
              message: "Legal assignment automation is prepare_only — notices are prepared but not sent.",
              blockerCode: "automation_prepare_only",
              fixHref: "/admin/communication-hub/governance/automation-settings" });
          } else if (autoValue === "disabled" || autoValue === null) {
            cards.push({ key: "auto", title: "Automation Gate", category: "automation", tone: "destructive",
              message: "Legal assignment automation is disabled — no notices will be generated.",
              blockerCode: "automation_prepare_only",
              fixHref: "/admin/communication-hub/governance/automation-settings" });
          } else {
            cards.push({ key: "auto", title: "Automation Gate", category: "automation", tone: "info",
              message: `Automation: ${autoValue}.`,
              fixHref: "/admin/communication-hub/governance/automation-settings" });
          }
        } else {
          cards.push({ key: "auto", title: "Automation Gate", category: "automation", tone: "info",
            message: "Check the module automation setting to control auto-send behavior.",
            fixHref: "/admin/communication-hub/governance/automation-settings" });
        }

        // Trigger — inferred where we know the wiring
        if (isLegalAssignment) {
          cards.push({ key: "trigger", title: "Trigger Gate", category: "trigger", tone: "success",
            message: "Workflow trigger exists: Assign / Reassign Officer calls the Communication Hub." });
        } else {
          cards.push({ key: "trigger", title: "Trigger Gate", category: "trigger", tone: "warning",
            message: "Trigger binding not configured — verify the module adapter calls sendCommunication.",
            fixHref: "/admin/communication-hub/onboarding/module-adapter-tests" });
        }

        // Volume
        cards.push({ key: "volume", title: "Volume Gate", category: "volume", tone: "success",
          message: `Max recipients per send: ${policy?.max_recipients_per_send ?? "?"}.` });

        setGates(cards);

        // Verdict — folds automation + system + send policy
        if (!settings.dispatch_enabled) {
          setVerdict({ label: "Will not send", tone: "destructive", detail: "Dispatcher is off." });
        } else if (isLegalAssignment && autoValue === "disabled") {
          setVerdict({ label: "Will not send", tone: "destructive", detail: "Module automation is disabled." });
        } else if (settings.dry_run_only || !settings.email_live_enabled) {
          setVerdict({ label: "Will prepare only", tone: "warning", detail: "Global dry-run or live email disabled." });
        } else if (["disabled","dry_run_only","prepare_only"].includes(sp)) {
          setVerdict({ label: "Will prepare only", tone: "warning", detail: `Event send policy is ${sp}.` });
        } else if (isLegalAssignment && autoValue === "prepare_only") {
          setVerdict({ label: "Will prepare only", tone: "warning", detail: "Module automation is prepare_only." });
        } else if (sp === "manual_review") {
          setVerdict({ label: "Will require manual review", tone: "info", detail: "Preview and approve before live send." });
        } else if (sp === "manual_live") {
          setVerdict({ label: "Will require manual live send", tone: "info", detail: "Operator must trigger the live send." });
        } else if (sp === "auto_live_internal") {
          setVerdict({ label: "Will auto-send internally", tone: "success", detail: "Internal recipients only." });
        } else if (sp === "auto_live_external") {
          setVerdict({ label: "Will auto-send (external allowed)", tone: "success", detail: "External domains must be allowlisted." });
        } else {
          setVerdict({ label: "Unknown", tone: "warning", detail: "Send policy could not be resolved." });
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [moduleCode, eventCode, channel, environmentScope]);


  return (
    <Card>
      {showHeader && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> Communication Readiness
          </CardTitle>
          <CardDescription>
            {moduleCode} / {eventCode} · {channel} · {environmentScope}
          </CardDescription>
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        <Alert variant={verdict.tone === "destructive" ? "destructive" : "default"}>
          {toneIcon(verdict.tone)}
          <AlertTitle>Next action: {verdict.label}</AlertTitle>
          <AlertDescription>{verdict.detail}</AlertDescription>
        </Alert>

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading gate status...</div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {gates.map((g) => (
              <div key={g.key} className={`rounded-md border p-3 ${toneClasses(g.tone)}`}>
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">{g.title}</div>
                  <Badge variant="outline">{g.category}</Badge>
                </div>
                <div className="text-xs mt-1">{g.message}</div>
                {g.blockerCode && <div className="text-[10px] mt-1 font-mono opacity-70">{g.blockerCode}</div>}
                {g.fixHref && (
                  <Link to={g.fixHref} className="text-xs underline inline-flex items-center gap-1 mt-1">
                    Fix <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/communication-hub/safety">
              <ShieldAlert className="h-4 w-4 mr-1" /> Open Safety Switchboard
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default EventGateSummary;
