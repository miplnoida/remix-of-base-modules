import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle, MessageSquare, XCircle, Link as LinkIcon, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  acceptAndCreateCase, getIntake, listIntakeAudit, listIntakeSources, listMatterTypes,
  linkExistingCase, rejectIntake, requestInfo, type LgCaseIntake, type ReferenceOption,
} from "@/services/legal/lgIntakeService";
import { contextFromIntake, type SourceDocument } from "@/services/legal/lgSourceDocumentService";
import SourceDocumentsPanel from "@/components/legal/lg/SourceDocumentsPanel";
import ReferralItemsPanel from "@/components/legal/lg/ReferralItemsPanel";
import ReferralPacketPanel from "@/components/legal/lg/ReferralPacketPanel";
import ResponseReceivedPanel from "@/components/legal/lg/ResponseReceivedPanel";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";

export default function IntakeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useSupabaseAuth();
  const actor = profile?.user_code ?? "SYSTEM";

  const [intake, setIntake] = useState<LgCaseIntake | null>(null);
  const [audit, setAudit] = useState<any[]>([]);
  const [sources, setSources] = useState<ReferenceOption[]>([]);
  const [matters, setMatters] = useState<ReferenceOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoNotes, setInfoNotes] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkCaseId, setLinkCaseId] = useState("");
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedSourceDocs, setSelectedSourceDocs] = useState<SourceDocument[]>([]);

  async function refresh() {
    if (!id) return;
    const [i, a] = await Promise.all([getIntake(id), listIntakeAudit(id)]);
    setIntake(i);
    setAudit(a);
  }

  useEffect(() => {
    (async () => {
      try {
        const [, , s, m] = await Promise.all([refresh(), Promise.resolve(), listIntakeSources(), listMatterTypes()]);
        setSources(s);
        setMatters(m);
      } catch (e: any) {
        toast.error("Failed to load intake", { description: e?.message });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <div className="flex-1 p-8 text-muted-foreground">Loading intake…</div>;
  if (!intake) {
    return (
      <div className="flex-1 p-8 text-center">
        <h2 className="text-2xl font-bold">Intake not found</h2>
        <Button onClick={() => navigate("/legal/cases/intake")} className="mt-4">Back to Intake</Button>
      </div>
    );
  }

  const sourceLabel = sources.find((s) => s.code === intake.source_module)?.display_name ?? intake.source_module;
  const matterLabel = matters.find((m) => m.code === intake.matter_type_code)?.display_name ?? intake.matter_type_code;
  const readonly = intake.intake_status !== "PENDING_REVIEW" && intake.intake_status !== "INFO_REQUESTED";

  async function handleAccept() {
    if (!intake) return;
    setSubmitting(true);
    try {
      const r = await acceptAndCreateCase({
        intakeId: intake.id,
        actor,
        sourceDocuments: selectedSourceDocs,
        markLegallyRelevant: true,
      });
      const linkedNote = selectedSourceDocs.length
        ? ` · ${selectedSourceDocs.length} source document(s) linked`
        : "";
      toast.success(`Legal case ${r.lg_case_no} created${linkedNote}`);
      navigate(`/legal/lg/cases/${r.lg_case_id}`);
    } catch (e: any) {
      toast.error("Accept failed", { description: e?.message });
    } finally {
      setSubmitting(false);
      setAcceptOpen(false);
    }
  }

  async function handleRequestInfo() {
    if (!intake || !infoNotes.trim()) return;
    setSubmitting(true);
    try {
      await requestInfo(intake.id, infoNotes.trim(), actor);
      toast.success("Information requested");
      setInfoOpen(false); setInfoNotes("");
      refresh();
    } catch (e: any) { toast.error("Failed", { description: e?.message }); }
    finally { setSubmitting(false); }
  }

  async function handleReject() {
    if (!intake || !rejectReason.trim()) return;
    setSubmitting(true);
    try {
      await rejectIntake(intake.id, rejectReason.trim(), actor);
      toast.success("Intake rejected");
      setRejectOpen(false); setRejectReason("");
      refresh();
    } catch (e: any) { toast.error("Failed", { description: e?.message }); }
    finally { setSubmitting(false); }
  }

  async function handleLink() {
    if (!intake || !linkCaseId.trim()) return;
    setSubmitting(true);
    try {
      await linkExistingCase(intake.id, linkCaseId.trim(), actor);
      toast.success("Linked to existing case");
      setLinkOpen(false); setLinkCaseId("");
      refresh();
    } catch (e: any) { toast.error("Failed", { description: e?.message }); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="flex-1 p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/legal/cases/intake")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{intake.intake_no}</h1>
            <p className="text-sm text-muted-foreground">{matterLabel} · {sourceLabel}</p>
          </div>
          <Badge variant="outline">{intake.intake_status.replace(/_/g, " ")}</Badge>
          {intake.lg_case_id && (
            <Button variant="link" onClick={() => navigate(`/legal/lg/cases/${intake.lg_case_id}`)}>
              View linked case →
            </Button>
          )}
        </div>
        {!readonly && (
          <div className="flex gap-2">
            <Button onClick={() => setAcceptOpen(true)} disabled={submitting}>
              <CheckCircle className="h-4 w-4 mr-2" />Accept &amp; Create Case
            </Button>
            <Button variant="outline" onClick={() => setInfoOpen(true)} disabled={submitting}>
              <MessageSquare className="h-4 w-4 mr-2" />Request Info
            </Button>
            <Button variant="outline" onClick={() => setLinkOpen(true)} disabled={submitting}>
              <LinkIcon className="h-4 w-4 mr-2" />Link Existing
            </Button>
            <Button variant="destructive" onClick={() => setRejectOpen(true)} disabled={submitting}>
              <XCircle className="h-4 w-4 mr-2" />Reject
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Section title="Source Summary">
          <Field label="Source Module" value={sourceLabel} />
          <Field label="Source Type" value={intake.source_type ?? "—"} />
          <Field label="Source Reference" value={intake.source_reference_no ?? "—"} />
          <Field label="Submitted By" value={intake.submitted_by ?? "—"} />
          <Field label="Submitted At" value={new Date(intake.submitted_at).toLocaleString()} />
        </Section>

        <Section title="Primary Entity">
          <Field label="Type" value={intake.primary_entity_type} />
          <Field label="Entity ID" value={intake.primary_entity_id ?? "—"} />
          {intake.legacy_primary_entity_name && (
            <Field label="Legacy Name" value={intake.legacy_primary_entity_name} />
          )}
        </Section>

        <Section title="Recommended Legal Action">
          <Field label="Matter Type" value={matterLabel} />
          <Field label="Recommended Case Type" value={intake.recommended_case_type_code ?? "—"} />
          <Field label="Priority" value={intake.priority_code} />
          <Field
            label="Exposure"
            value={intake.exposure_amount != null ? `$${intake.exposure_amount.toLocaleString()}` : "—"}
          />
        </Section>

        <Section title="Routing Preview" className="lg:col-span-2">
          <Field label="Recommended Stage" value={intake.recommended_stage_code ?? "—"} />
          <Field label="Recommended Workbasket" value={intake.recommended_workbasket_code ?? "—"} />
          <Field label="Recommended Team" value={intake.recommended_team_code ?? "—"} />
          <p className="text-xs text-muted-foreground mt-2">
            Final routing is determined by the Routing &amp; Assignment engine on acceptance.
          </p>
        </Section>

        <Section title="Summary" className="lg:col-span-3">
          <p className="text-sm">{intake.summary ?? <span className="text-muted-foreground">No summary provided.</span>}</p>
          {intake.info_request_notes && (
            <>
              <Separator className="my-3" />
              <div>
                <Label className="text-xs text-muted-foreground">Info Requested Notes</Label>
                <p className="text-sm mt-1">{intake.info_request_notes}</p>
              </div>
            </>
          )}
          {intake.decision_reason && (
            <>
              <Separator className="my-3" />
              <div>
                <Label className="text-xs text-muted-foreground">Decision Reason</Label>
                <p className="text-sm mt-1">{intake.decision_reason}</p>
              </div>
            </>
          )}
        </Section>
      </div>

      <ReferralItemsPanel intake={intake} actor={actor} readonly={readonly} />

      {(() => {
        const p: any = intake.payload ?? {};
        const referralId = p.ce_referral_id ?? p.bn_referral_id ?? null;
        if (!referralId) return null;
        const mod = intake.source_module === "BENEFITS" ? "BENEFITS" : "COMPLIANCE";
        return (
          <ReferralPacketPanel
            referralId={referralId}
            sourceModule={mod}
            employerId={p.employer_id ?? intake.primary_entity_id ?? null}
            ceCaseId={p.ce_case_id ?? null}
            claimId={p.bn_claim_id ?? null}
            ssn={p.ssn ?? null}
          />
        );
      })()}

      <ResponseReceivedPanel
        intakeId={intake.id}
        intakeStatus={intake.intake_status}
        actor={actor}
        onContinued={refresh}
      />



      <SourceDocumentsPanel
        context={contextFromIntake(intake)}
        selectable={!readonly}
        onLink={async (docs) => {
          setSelectedSourceDocs(docs);
          toast.success(`${docs.length} document(s) staged. Click "Accept & Create Case" to commit.`);
        }}
        title="Source Documents (from referring module)"
        description="Documents already uploaded in the source module. Select the ones the Legal case should reference — files stay in the source / Central DMS, no copies are made."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />Audit Trail
          </CardTitle>
        </CardHeader>
        <CardContent>
          {audit.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit entries yet.</p>
          ) : (
            <ul className="space-y-2">
              {audit.map((a) => (
                <li key={a.id} className="text-sm flex items-start justify-between gap-4 border-b pb-2 last:border-0">
                  <div>
                    <div className="font-medium">{a.action}</div>
                    {a.notes && <div className="text-xs text-muted-foreground">{a.notes}</div>}
                  </div>
                  <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
                    <div>{a.performed_by ?? "—"}</div>
                    <div>{new Date(a.created_at).toLocaleString()}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Accept dialog */}
      <Dialog open={acceptOpen} onOpenChange={setAcceptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept and Create Legal Case</DialogTitle>
            <DialogDescription>
              This creates a new legal case, default SSB complainant party, respondent party from primary entity,
              and runs routing &amp; assignment.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Source documents to link:</span>
              <Badge variant={selectedSourceDocs.length ? "default" : "outline"}>
                {selectedSourceDocs.length} selected
              </Badge>
            </div>
            {selectedSourceDocs.length === 0 && (
              <p className="text-xs text-amber-600">
                No source documents selected. Legal staff may need to request documents from the source module later.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptOpen(false)}>Cancel</Button>
            <Button onClick={handleAccept} disabled={submitting}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request info */}
      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request Additional Information</DialogTitle></DialogHeader>
          <Textarea value={infoNotes} onChange={(e) => setInfoNotes(e.target.value)} placeholder="What's needed?" rows={4} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setInfoOpen(false)}>Cancel</Button>
            <Button onClick={handleRequestInfo} disabled={submitting || !infoNotes.trim()}>Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject / No Legal Action</DialogTitle></DialogHeader>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for rejection" rows={4} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={submitting || !rejectReason.trim()}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link existing */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Link to Existing Legal Case</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Legal Case ID (UUID)</Label>
            <Input value={linkCaseId} onChange={(e) => setLinkCaseId(e.target.value)} placeholder="00000000-0000-0000-0000-000000000000" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkOpen(false)}>Cancel</Button>
            <Button onClick={handleLink} disabled={submitting || !linkCaseId.trim()}>Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">{children}</CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-2 text-sm">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-medium break-words">{value}</div>
    </div>
  );
}
