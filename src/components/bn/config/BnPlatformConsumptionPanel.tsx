/**
 * BN Product Builder — Platform Consumption Panel (Wave 1)
 *
 * Read-only panel that shows the SSB platform configuration this BN
 * product consumes. Values are read from Process Resolvers only — no
 * direct SSB policy table access, no shared-domain CRUD, no duplicate
 * screens.
 *
 * BN-owned fields (definition, eligibility, formula, rate tables,
 * versioning) are unchanged and remain in the sibling tabs.
 *
 * See docs/bn/BN_PRODUCT_BUILDER_CONSUMPTION_WAVE_1_ACCEPTANCE.md
 */
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ExternalLink, CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";
import {
  getBenefitAdministrationConfiguration,
  getMemberRegistrationConfiguration,
  getEmployerRegistrationConfiguration,
  evaluateBenefitsReadiness,
  type ProcessStatus,
  type ResolvedPolicyEntry,
} from "@/services/ssb-configuration/ssbBusinessProcessConfigService";

const statusMeta: Record<ProcessStatus, { cls: string; Icon: any; label: string }> = {
  Ready:   { cls: "bg-emerald-100 text-emerald-800 border-emerald-300", Icon: CheckCircle2, label: "Ready" },
  Partial: { cls: "bg-amber-100 text-amber-800 border-amber-300",       Icon: AlertTriangle, label: "Partial" },
  Missing: { cls: "bg-rose-100 text-rose-800 border-rose-300",          Icon: XCircle, label: "Missing" },
};

function StatusChip({ status }: { status: ProcessStatus }) {
  const m = statusMeta[status];
  return (
    <Badge variant="outline" className={`gap-1 ${m.cls}`}>
      <m.Icon className="h-3 w-3" /> {m.label}
    </Badge>
  );
}

function PolicyRow({ e }: { e: ResolvedPolicyEntry }) {
  const href = `/admin/ssb-setup?section=${e.section}`;
  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2 text-xs">
      <div className="flex items-center gap-2 min-w-0">
        {e.present ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
        ) : e.required ? (
          <XCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
        ) : (
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
        )}
        <span className="truncate">{e.label}</span>
        {typeof e.count === "number" && (
          <Badge variant="outline" className="text-[10px]">{e.count}</Badge>
        )}
        {!e.required && <Badge variant="outline" className="text-[10px]">optional</Badge>}
      </div>
      <a href={href} target="_blank" rel="noreferrer">
        <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs">
          <ExternalLink className="h-3 w-3" />
          {e.present ? "Review" : "Configure"}
        </Button>
      </a>
    </div>
  );
}

function ProcessBlock({
  title, description, status, entries,
}: {
  title: string; description: string; status: ProcessStatus; entries: ResolvedPolicyEntry[];
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
        <StatusChip status={status} />
      </div>
      <div className="space-y-1.5">
        {entries.map((e) => <PolicyRow key={e.key} e={e} />)}
      </div>
    </div>
  );
}

export function BnPlatformConsumptionPanel() {
  const today = new Date().toISOString().slice(0, 10);

  const { data: benefit } = useQuery({
    queryKey: ["bn-platform-consumption", "benefit", today],
    queryFn: () => getBenefitAdministrationConfiguration(today),
    staleTime: 60_000,
  });
  const { data: member } = useQuery({
    queryKey: ["bn-platform-consumption", "member", today],
    queryFn: () => getMemberRegistrationConfiguration(today),
    staleTime: 60_000,
  });
  const { data: employer } = useQuery({
    queryKey: ["bn-platform-consumption", "employer", today],
    queryFn: () => getEmployerRegistrationConfiguration(today),
    staleTime: 60_000,
  });
  const { data: readiness } = useQuery({
    queryKey: ["bn-platform-consumption", "readiness", today],
    queryFn: () => evaluateBenefitsReadiness(today),
    staleTime: 60_000,
  });

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Platform Configuration Consumed
            </CardTitle>
            <CardDescription className="text-xs">
              This product consumes SSB Platform v1.0 configuration through process resolvers.
              Country, identity rules, payment channels, legal references, documents,
              workflow, communication templates and numbering come from the platform —
              not from local BN dropdowns.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {readiness && (
              <Badge
                variant="outline"
                className={readiness.ready
                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                  : "bg-amber-100 text-amber-800 border-amber-300"}
              >
                {readiness.ready ? "BN Readiness: READY" : "BN Readiness: NOT READY"}
              </Badge>
            )}
            <a href="/admin/configuration-governance" target="_blank" rel="noreferrer">
              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs">
                <ExternalLink className="h-3 w-3" /> Governance
              </Button>
            </a>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {readiness && !readiness.ready && readiness.reasons.length > 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <div className="flex items-center gap-1 font-medium mb-1">
              <Info className="h-3 w-3" /> Readiness notes
            </div>
            <ul className="list-disc list-inside space-y-0.5">
              {readiness.reasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {benefit && (
            <ProcessBlock
              title="Benefit Administration"
              description="Financial, legal, documents, workflow, communication, calendar."
              status={benefit.status}
              entries={[...benefit.resolvedPolicies, ...benefit.missingPolicies, ...benefit.optionalWarnings]}
            />
          )}
          {member && (
            <ProcessBlock
              title="Member Registration"
              description="Consumed for beneficiary/member-linked configuration."
              status={member.status}
              entries={[...member.resolvedPolicies, ...member.missingPolicies, ...member.optionalWarnings]}
            />
          )}
          {employer && (
            <ProcessBlock
              title="Employer Registration"
              description="Consumed for employer-linked configuration."
              status={employer.status}
              entries={[...employer.resolvedPolicies, ...employer.missingPolicies, ...employer.optionalWarnings]}
            />
          )}
        </div>

        <div className="text-[11px] text-muted-foreground border-t pt-2">
          Resolvers: <code>getBenefitAdministrationConfiguration</code>,{" "}
          <code>getMemberRegistrationConfiguration</code>,{" "}
          <code>getEmployerRegistrationConfiguration</code>,{" "}
          <code>evaluateBenefitsReadiness</code>. BN never reads SSB policy tables directly.
        </div>
      </CardContent>
    </Card>
  );
}

export default BnPlatformConsumptionPanel;
