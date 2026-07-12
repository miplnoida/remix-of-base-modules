/**
 * EPIC 4C — Module Adapter Test Page (dry-run only).
 * Route: /admin/communication-hub/onboarding/module-adapter-tests
 *
 * Exercises each business-module Communication Hub adapter through the
 * canonical façade (comm-hub-event-pilot). Recipient is locked to
 * rohit@mishainfotech.com. testMode=true always. No live send is possible
 * from this screen.
 *
 * Query-param preselect (from Registry / Readiness):
 *   ?module=LEGAL&event=INTERNAL_CASE_ASSIGNMENT_NOTICE
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import CommunicationHubWorkspaceShell, {
  CommunicationHubSectionCard,
} from "../components/CommunicationHubWorkspaceShell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
// Badge import removed — preselect state shown inline in section title
import { Loader2, ShieldCheck, Info, Send, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { DRY_RUN_LOCKED_RECIPIENT, MODULE_ADAPTER_TYPED_CONFIRMATION } from "@/platform/communication-hub/businessModuleCommunicationAdapter";
import { sendLegalInternalCaseAssignmentDryRun } from "@/modules/legal/communication/legalCommunication";
import { sendInsuredPersonInternalProfileReviewDryRun } from "@/modules/insuredPerson/communication/insuredPersonCommunication";
import { sendBenefitsInternalClaimReviewDryRun } from "@/modules/benefits/communication/benefitsCommunication";
import {
  sendEmployerRegistrationInternalAckDryRun,
  sendEmployerRegistrationInternalApprovalReviewDryRun,
} from "@/modules/employerRegistration/communication/employerRegistrationCommunication";
import { sendComplianceInternalCaseStatusDryRun } from "@/modules/compliance/communication/complianceCommunication";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { GovernedLivePilotPanelLegal } from "../controlCenter/GovernedLivePilotPanelLegal";

interface AdapterTestSpec {
  key: string;
  moduleCode: string;
  eventCode: string;
  templateCode: string;
  title: string;
  fields: { name: string; label: string; default: string }[];
  invoke: (values: Record<string, string>, common: { recipientName: string; reason: string }) => Promise<any>;
}

const ADAPTERS: AdapterTestSpec[] = [
  {
    key: "legal-case-assignment",
    moduleCode: "LEGAL",
    eventCode: "INTERNAL_CASE_ASSIGNMENT_NOTICE",
    templateCode: "LEGAL_INTERNAL_CASE_ASSIGNMENT_NOTICE",
    title: "Legal — Internal Case Assignment",
    fields: [
      { name: "caseReference", label: "Case Reference", default: "LG-DRYRUN-001" },
      { name: "assignedTo", label: "Assigned To", default: "Demo Legal Officer" },
      { name: "priority", label: "Priority", default: "Normal" },
    ],
    invoke: (v, c) =>
      sendLegalInternalCaseAssignmentDryRun({
        caseReference: v.caseReference,
        assignedTo: v.assignedTo,
        priority: v.priority,
        recipientName: c.recipientName,
        reason: c.reason,
      }),
  },
  {
    key: "ip-profile-review",
    moduleCode: "INSURED_PERSON",
    eventCode: "INTERNAL_PROFILE_REVIEW_NOTICE",
    templateCode: "INSURED_PERSON_INTERNAL_PROFILE_REVIEW_NOTICE",
    title: "Insured Person — Internal Profile Review",
    fields: [
      { name: "insuredPersonReference", label: "Insured Person Reference", default: "IP-DRYRUN-001" },
      { name: "reviewStatus", label: "Review Status", default: "Pending internal review" },
      { name: "assignedOfficer", label: "Assigned Officer", default: "Demo IP Officer" },
    ],
    invoke: (v, c) =>
      sendInsuredPersonInternalProfileReviewDryRun({
        insuredPersonReference: v.insuredPersonReference,
        reviewStatus: v.reviewStatus,
        assignedOfficer: v.assignedOfficer,
        recipientName: c.recipientName,
        reason: c.reason,
      }),
  },
  {
    key: "benefits-claim-review",
    moduleCode: "BENEFITS",
    eventCode: "INTERNAL_CLAIM_REVIEW_NOTICE",
    templateCode: "BENEFITS_INTERNAL_CLAIM_REVIEW_NOTICE",
    title: "Benefits — Internal Claim Review",
    fields: [
      { name: "claimReference", label: "Claim Reference", default: "BN-DRYRUN-001" },
      { name: "claimStatus", label: "Claim Status", default: "Pending internal review" },
      { name: "assignedOfficer", label: "Assigned Officer", default: "Demo Benefits Officer" },
    ],
    invoke: (v, c) =>
      sendBenefitsInternalClaimReviewDryRun({
        claimReference: v.claimReference,
        claimStatus: v.claimStatus,
        assignedOfficer: v.assignedOfficer,
        recipientName: c.recipientName,
        reason: c.reason,
      }),
  },
  {
    key: "employer-ack",
    moduleCode: "EMPLOYER_REGISTRATION",
    eventCode: "INTERNAL_ACKNOWLEDGEMENT_NOTICE",
    templateCode: "EMPLOYER_REGISTRATION_INTERNAL_ACKNOWLEDGEMENT_NOTICE",
    title: "Employer Registration — Internal Acknowledgement",
    fields: [
      { name: "employerName", label: "Employer Name", default: "Demo Employer Ltd" },
      { name: "referenceNo", label: "Reference No", default: "ER-DRYRUN-001" },
    ],
    invoke: (v, c) =>
      sendEmployerRegistrationInternalAckDryRun({
        employerName: v.employerName,
        referenceNo: v.referenceNo,
        recipientName: c.recipientName,
        reason: c.reason,
      }),
  },
  {
    key: "employer-approval-review",
    moduleCode: "EMPLOYER_REGISTRATION",
    eventCode: "INTERNAL_APPROVAL_REVIEW_NOTICE",
    templateCode: "EMPLOYER_REGISTRATION_INTERNAL_APPROVAL_REVIEW_NOTICE",
    title: "Employer Registration — Internal Approval Review",
    fields: [
      { name: "employerName", label: "Employer Name", default: "Demo Employer Ltd" },
      { name: "referenceNo", label: "Reference No", default: "ER-DRYRUN-001" },
      { name: "reviewStatus", label: "Review Status", default: "Pending internal approval" },
    ],
    invoke: (v, c) =>
      sendEmployerRegistrationInternalApprovalReviewDryRun({
        employerName: v.employerName,
        referenceNo: v.referenceNo,
        reviewStatus: v.reviewStatus,
        recipientName: c.recipientName,
        reason: c.reason,
      }),
  },
  {
    key: "compliance-case-status",
    moduleCode: "COMPLIANCE",
    eventCode: "INTERNAL_CASE_STATUS_NOTICE",
    templateCode: "COMPLIANCE_INTERNAL_CASE_STATUS_NOTICE",
    title: "Compliance — Internal Case Status",
    fields: [
      { name: "caseReference", label: "Case Reference", default: "CE-DRYRUN-001" },
      { name: "caseStatus", label: "Case Status", default: "Under internal review" },
      { name: "assignedOfficer", label: "Assigned Officer", default: "Demo Compliance Officer" },
    ],
    invoke: (v, c) =>
      sendComplianceInternalCaseStatusDryRun({
        caseReference: v.caseReference,
        caseStatus: v.caseStatus,
        assignedOfficer: v.assignedOfficer,
        recipientName: c.recipientName,
        reason: c.reason,
      }),
  },
];

function AdapterCard({
  spec,
  recipientName,
  reason,
  highlighted,
}: {
  spec: AdapterTestSpec;
  recipientName: string;
  reason: string;
  highlighted: boolean;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(spec.fields.map((f) => [f.name, f.default])),
  );
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function onSend() {
    if (typed !== MODULE_ADAPTER_TYPED_CONFIRMATION) {
      toast.error(`Typed confirmation must equal: ${MODULE_ADAPTER_TYPED_CONFIRMATION}`);
      return;
    }
    if (!reason.trim()) {
      toast.error("Reason is required");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const res = await spec.invoke(values, { recipientName: recipientName.trim() || "Rohit Wadhwa", reason });
      setResult(res);
      if (res?.ok) {
        toast.success(`${spec.title} — dry-run OK (${res.requestNo ?? "no request_no"})`);
        setTyped("");
      } else {
        toast.error(`${spec.title} — failed: ${res?.error ?? "unknown"}`);
      }
    } catch (e: any) {
      setResult({ ok: false, error: e?.message ?? String(e) });
      toast.error(`${spec.title} — error: ${e?.message ?? "unknown"}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <CommunicationHubSectionCard
      title={`${spec.title}${highlighted ? " (preselected)" : ""}`}
      description={`${spec.moduleCode} / ${spec.eventCode} · template ${spec.templateCode}`}
    >
      <div className="grid gap-3 md:grid-cols-2">
        {spec.fields.map((f) => (
          <div key={f.name} className="space-y-1.5">
            <Label>{f.label}</Label>
            <Input
              value={values[f.name] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
            />
          </div>
        ))}
        <div className="space-y-1.5 md:col-span-2">
          <Label>Typed confirmation ({MODULE_ADAPTER_TYPED_CONFIRMATION})</Label>
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={MODULE_ADAPTER_TYPED_CONFIRMATION} />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Button onClick={onSend} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
          Send Communication Hub Dry-Run
        </Button>
        {result?.requestNo && (
          <div className="text-xs text-muted-foreground">
            <span className="font-mono">{result.requestNo}</span>
            {" · "}
            <Link className="underline" to={`/admin/communication-hub/requests/${result.requestId}`}>Open request</Link>
            {" · "}
            <Link className="underline" to="/admin/communication-hub/delivery-monitor">Delivery Monitor</Link>
            {" · "}
            <Link className="underline" to="/admin/communication-hub/lifecycle-log">Lifecycle Log</Link>
          </div>
        )}
      </div>
      {result && !result.ok && (
        <Alert variant="destructive" className="mt-3">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Dry-run failed</AlertTitle>
          <AlertDescription>
            {result.error}
            {Array.isArray(result.blockers) && result.blockers.length > 0 && (
              <ul className="mt-1 list-disc pl-4">
                {result.blockers.map((b: string) => (<li key={b}>{b}</li>))}
              </ul>
            )}
          </AlertDescription>
        </Alert>
      )}
    </CommunicationHubSectionCard>
  );
}

export default function ModuleAdapterTestsPage() {
  const [searchParams] = useSearchParams();
  const qModule = searchParams.get("module");
  const qEvent = searchParams.get("event");

  const preselectKey = useMemo(() => {
    if (!qModule || !qEvent) return null;
    const found = ADAPTERS.find((a) => a.moduleCode === qModule && a.eventCode === qEvent);
    return found?.key ?? "__unsupported__";
  }, [qModule, qEvent]);

  const [recipientName, setRecipientName] = useState("Rohit Wadhwa");
  const [reason, setReason] = useState("Module adapter dry-run validation.");

  useEffect(() => {
    if (preselectKey && preselectKey !== "__unsupported__") {
      const el = document.getElementById(`adapter-${preselectKey}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [preselectKey]);

  return (
    <PermissionWrapper moduleName="system_administration">
      <CommunicationHubWorkspaceShell
        title="Module Adapter Tests"
        purpose="Fire real business-module Communication Hub adapters in dry-run mode. Recipient is locked; live email is not possible from this page."
        risk="action-capable"
        quickLinks={[
          { label: "Event Validation Console", href: "/admin/communication-hub/pilots" },
          { label: "Delivery Monitor", href: "/admin/communication-hub/delivery-monitor" },
          { label: "Lifecycle Log", href: "/admin/communication-hub/lifecycle-log" },
          { label: "Registry", href: "/admin/communication-hub/onboarding" },
        ]}
      >
        <Alert>
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>Dry-run only</AlertTitle>
          <AlertDescription>
            All adapters here run with <code>test_mode=true</code>. Recipient is locked to <code>{DRY_RUN_LOCKED_RECIPIENT}</code>.
          </AlertDescription>
        </Alert>

        {preselectKey === "__unsupported__" && (
          <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertTitle>Adapter not implemented yet</AlertTitle>
            <AlertDescription>
              <span className="font-mono">{qModule}</span> /{" "}
              <span className="font-mono">{qEvent}</span> does not have a module adapter. Use the{" "}
              <Link className="underline" to={`/admin/communication-hub/pilots?module=${qModule}&event=${qEvent}`}>
                Event Validation Console
              </Link>{" "}
              to dry-run this event instead.
            </AlertDescription>
          </Alert>
        )}

        <CommunicationHubSectionCard
          title="Common settings"
          description="Applied to all adapter dry-runs on this page. Recipient email is fixed."
        >
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Recipient email (locked)</Label>
              <Input value={DRY_RUN_LOCKED_RECIPIENT} disabled />
            </div>
            <div className="space-y-1.5">
              <Label>Recipient name</Label>
              <Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
            </div>
            <div className="space-y-1.5 md:col-span-1">
              <Label>Reason</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
            </div>
          </div>
        </CommunicationHubSectionCard>

        {ADAPTERS.map((spec) => (
          <div id={`adapter-${spec.key}`} key={spec.key}>
            <AdapterCard
              spec={spec}
              recipientName={recipientName}
              reason={reason}
              highlighted={preselectKey === spec.key}
            />
          </div>
        ))}

        <CommunicationHubSectionCard
          title="🚨 Live Pilot — LEGAL only (EPIC 4D-LIVE-LEGAL-1)"
          description="Single-shot, admin-only governed live email for LEGAL / INTERNAL_CASE_ASSIGNMENT_NOTICE. Locked to rohit@mishainfotech.com. All other Legal events remain dry-run only."
        >
          <GovernedLivePilotPanelLegal />
        </CommunicationHubSectionCard>

      </CommunicationHubWorkspaceShell>
    </PermissionWrapper>
  );
}
