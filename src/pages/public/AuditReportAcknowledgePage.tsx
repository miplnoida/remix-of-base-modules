/**
 * Public employer acknowledgment portal — accessed via tokenized link
 * /acknowledge-audit/:token
 *
 * No authentication required. The recipient can view the employer copy,
 * sign electronically (canvas / typed / refused), and submit.
 */
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ShieldCheck, Printer, AlertTriangle, Lock } from 'lucide-react';
import { auditReportService } from '@/services/auditReportService';
import { AuditReportPrintLayout } from '@/components/compliance/audit-report/AuditReportPrintLayout';
import { SignaturePad } from '@/components/compliance/audit-report/SignaturePad';
import { EmployerOnlineSubmissionsPanel } from '@/components/compliance/audit-report/EmployerOnlineSubmissionsPanel';
import type {
  FullAuditReport,
  AuditReportAcknowledgment,
  AuditReportSignature,
  SignatureType,
} from '@/types/auditReport';
import type { InspectionFinding, InspectionEvidence } from '@/types/inspectionTypes';
import { toast } from 'sonner';
import { formatDateForDisplay } from '@/lib/format-config';
import { gateFromAcknowledgment } from '@/lib/onlineResponsePortalGate';
import { ONLINE_RESPONSE_MODE_LABELS } from '@/types/onlineResponse';

export default function AuditReportAcknowledgePage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [ack, setAck] = useState<AuditReportAcknowledgment | null>(null);
  const [report, setReport] = useState<FullAuditReport | null>(null);
  const [findings, setFindings] = useState<InspectionFinding[]>([]);
  const [evidence, setEvidence] = useState<InspectionEvidence[]>([]);
  const [checklist, setChecklist] = useState<any[]>([]);
  const [signatures, setSignatures] = useState<AuditReportSignature[]>([]);
  const [error, setError] = useState<string | null>(null);

  // signing state
  const [tab, setTab] = useState<'sign' | 'typed' | 'refused'>('sign');
  const [designation, setDesignation] = useState('');
  const [comments, setComments] = useState('');
  const [sigDataUrl, setSigDataUrl] = useState<string | null>(null);
  const [typedName, setTypedName] = useState('');
  const [attestChecked, setAttestChecked] = useState(false);
  const [refusalKind, setRefusalKind] = useState<'REFUSED' | 'UNAVAILABLE'>('REFUSED');
  const [refusalReason, setRefusalReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const result = await auditReportService.getReportByToken(token);
        if (!result) {
          setError('This acknowledgment link is invalid or has been revoked.');
          return;
        }
        const expired = new Date(result.ack.expiresAt) < new Date();
        if (expired) {
          setError('This acknowledgment link has expired. Please contact the inspector for a new link.');
          return;
        }
        setAck(result.ack);
        setReport(result.report);
        const data = await auditReportService.assembleFullPayload(result.report.inspectionId);
        setFindings(data.findings);
        setEvidence(data.evidence);
        setChecklist(data.checklist);
        setSignatures(data.signatures);
      } catch (e: any) {
        setError(e.message ?? 'Failed to load report');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const alreadySigned = signatures.some((s) => s.signerRole === 'EMPLOYER_REP') || ack?.status === 'SIGNED';

  const handleSubmit = async () => {
    if (!ack || !report) return;

    let signatureType: SignatureType;
    let payload: any = {};

    if (tab === 'sign') {
      if (!sigDataUrl) return toast.error('Please sign on the pad');
      signatureType = 'ELECTRONIC';
      payload.signatureDataUrl = sigDataUrl;
    } else if (tab === 'typed') {
      if (!typedName.trim() || !attestChecked) return toast.error('Type your name and check the attestation');
      signatureType = 'TYPED_ATTESTATION';
      payload.typedName = typedName.trim();
      payload.attestationText = `I, ${typedName.trim()}, attest electronically to the receipt of this report.`;
    } else {
      if (!refusalReason.trim()) return toast.error('Please provide a reason');
      signatureType = refusalKind;
      payload.refusalReason = refusalReason.trim();
    }

    try {
      setSubmitting(true);
      await auditReportService.captureSignature({
        reportId: report.id,
        signerRole: 'EMPLOYER_REP',
        signerName: ack.recipientName,
        signerDesignation: designation.trim() || ack.recipientDesignation,
        signerEmail: ack.recipientEmail,
        signatureType,
        comments: comments.trim() || undefined,
        ...payload,
      });
      toast.success('Thank you — your acknowledgment has been recorded.');
      // refresh
      const result = await auditReportService.getReportByToken(token!);
      if (result) {
        setSignatures((await auditReportService.assembleFullPayload(result.report.inspectionId)).signatures);
        setAck(result.ack);
      }
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center space-y-3">
            <AlertTriangle className="h-10 w-10 mx-auto text-destructive" />
            <h1 className="text-xl font-semibold">Unable to access report</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  if (!report || !ack) return null;

  const gate = gateFromAcknowledgment(ack);

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-card border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-7 w-7 text-primary" />
            <div>
              <h1 className="font-semibold">Employer Audit Report — Acknowledgment Portal</h1>
              <p className="text-xs text-muted-foreground">
                {report.reportNumber} • Sent to {ack.recipientName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Lock className="h-3 w-3" />
              {ONLINE_RESPONSE_MODE_LABELS[gate.mode]}
            </Badge>
            <Badge variant={alreadySigned ? 'default' : 'secondary'}>{alreadySigned ? 'SIGNED' : ack.status}</Badge>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Report */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-white">
              <AuditReportPrintLayout
                report={report}
                findings={findings}
                evidence={evidence}
                checklist={checklist}
                signatures={signatures}
                variant="EMPLOYER"
              />
            </div>
          </CardContent>
        </Card>

        {/* Sign block */}
        {alreadySigned ? (
          <Card className="no-print">
            <CardContent className="pt-6 text-center space-y-2">
              <ShieldCheck className="h-10 w-10 mx-auto text-primary" />
              <h2 className="font-semibold text-lg">Acknowledgment Recorded</h2>
              <p className="text-sm text-muted-foreground">
                Your signature was recorded on{' '}
                {signatures.find((s) => s.signerRole === 'EMPLOYER_REP')?.signedAt
                  ? formatDateForDisplay(signatures.find((s) => s.signerRole === 'EMPLOYER_REP')!.signedAt!)
                  : '—'}
                . Thank you.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="no-print">
            <CardHeader>
              <CardTitle>Acknowledge & Sign</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Your name</Label>
                  <Input value={ack.recipientName} disabled />
                </div>
                <div>
                  <Label>Designation</Label>
                  <Input
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder={ack.recipientDesignation ?? 'e.g. HR Manager'}
                  />
                </div>
              </div>

              <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="sign">Draw Signature</TabsTrigger>
                  <TabsTrigger value="typed">Typed Attestation</TabsTrigger>
                  <TabsTrigger value="refused">Refuse / Unavailable</TabsTrigger>
                </TabsList>
                <TabsContent value="sign" className="pt-3">
                  <SignaturePad onChange={setSigDataUrl} />
                </TabsContent>
                <TabsContent value="typed" className="pt-3 space-y-3">
                  <div>
                    <Label>Type your full legal name</Label>
                    <Input
                      value={typedName}
                      onChange={(e) => setTypedName(e.target.value)}
                      className="font-serif text-lg"
                    />
                  </div>
                  <div className="rounded-md border p-3 bg-muted/40 text-sm">
                    I, {typedName || '[name]'}, attest electronically to the receipt of this audit report and
                    consent to electronic signature.
                  </div>
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="attest"
                      checked={attestChecked}
                      onCheckedChange={(v) => setAttestChecked(!!v)}
                    />
                    <Label htmlFor="attest" className="text-sm font-normal cursor-pointer">
                      I confirm the above attestation.
                    </Label>
                  </div>
                </TabsContent>
                <TabsContent value="refused" className="pt-3 space-y-3">
                  <RadioGroup value={refusalKind} onValueChange={(v) => setRefusalKind(v as any)}>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="REFUSED" id="r-ref" />
                      <Label htmlFor="r-ref">I refuse to sign</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="UNAVAILABLE" id="r-un" />
                      <Label htmlFor="r-un">Unable to sign at this time</Label>
                    </div>
                  </RadioGroup>
                  <div>
                    <Label>Reason *</Label>
                    <Textarea
                      rows={3}
                      value={refusalReason}
                      onChange={(e) => setRefusalReason(e.target.value)}
                      placeholder="Please describe the reason."
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <div>
                <Label>Comments (optional)</Label>
                <Textarea
                  rows={2}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Any clarifications or comments…"
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit Acknowledgment'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Phase F — Online responses & disputes */}
        <EmployerOnlineSubmissionsPanel
          token={token!}
          inspectionId={report.inspectionId}
          findings={findings}
          acknowledgmentId={ack.id}
          defaultSubmitterName={ack.recipientName}
          defaultSubmitterEmail={ack.recipientEmail}
          defaultSubmitterDesignation={ack.recipientDesignation}
        />

        <p className="text-xs text-muted-foreground text-center">
          This link expires on {formatDateForDisplay(ack.expiresAt)}. Verification: {report.verificationRef ?? 'PENDING'}
        </p>
      </main>
    </div>
  );
}
