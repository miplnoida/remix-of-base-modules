/**
 * Capture a signature for an audit report.
 * Supports: canvas pad, typed-name attestation, refused, unavailable.
 */
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { SignaturePad } from './SignaturePad';
import { auditReportService } from '@/services/auditReportService';
import type { SignerRole, SignatureType } from '@/types/auditReport';
import { toast } from 'sonner';

interface CaptureSignatureDialogProps {
  reportId: string;
  signerRole: SignerRole;
  defaultName?: string;
  defaultDesignation?: string;
  onClose: () => void;
  onCaptured: () => void;
}

const ROLE_LABELS: Record<SignerRole, string> = {
  EMPLOYER_REP: 'Employer Representative',
  INSPECTOR: 'Inspector',
  SUPERVISOR: 'Supervisor',
  WITNESS: 'Witness',
};

export function CaptureSignatureDialog({
  reportId,
  signerRole,
  defaultName,
  defaultDesignation,
  onClose,
  onCaptured,
}: CaptureSignatureDialogProps) {
  const [tab, setTab] = useState<'sign' | 'typed' | 'refused'>('sign');
  const [signerName, setSignerName] = useState(defaultName ?? '');
  const [designation, setDesignation] = useState(defaultDesignation ?? '');
  const [email, setEmail] = useState('');
  const [comments, setComments] = useState('');
  const [sigDataUrl, setSigDataUrl] = useState<string | null>(null);
  const [typedName, setTypedName] = useState('');
  const [attestChecked, setAttestChecked] = useState(false);
  const [refusalKind, setRefusalKind] = useState<'REFUSED' | 'UNAVAILABLE'>('REFUSED');
  const [refusalReason, setRefusalReason] = useState('');
  const [saving, setSaving] = useState(false);

  const attestationText = `I, ${typedName || '[name]'}, attest that I am the person identified above and that this electronic signature constitutes my agreement to the contents of this audit report.`;

  const submit = async () => {
    if (!signerName.trim()) {
      toast.error('Signer name is required');
      return;
    }

    let signatureType: SignatureType;
    let payload: any = {};

    if (tab === 'sign') {
      if (!sigDataUrl) {
        toast.error('Please sign on the pad');
        return;
      }
      signatureType = 'ELECTRONIC';
      payload.signatureDataUrl = sigDataUrl;
    } else if (tab === 'typed') {
      if (!typedName.trim() || !attestChecked) {
        toast.error('Type your full name and check the attestation');
        return;
      }
      signatureType = 'TYPED_ATTESTATION';
      payload.typedName = typedName.trim();
      payload.attestationText = attestationText;
    } else {
      if (!refusalReason.trim()) {
        toast.error('Reason is required');
        return;
      }
      signatureType = refusalKind;
      payload.refusalReason = refusalReason.trim();
    }

    try {
      setSaving(true);
      await auditReportService.captureSignature({
        reportId,
        signerRole,
        signerName: signerName.trim(),
        signerDesignation: designation.trim() || undefined,
        signerEmail: email.trim() || undefined,
        signatureType,
        comments: comments.trim() || undefined,
        ...payload,
      });
      toast.success('Signature recorded');
      onCaptured();
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to capture signature');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Capture Signature — {ROLE_LABELS[signerRole]}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Full Name *</Label>
              <Input value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Jane Doe" />
            </div>
            <div>
              <Label>Designation</Label>
              <Input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="HR Manager" />
            </div>
            <div className="col-span-2">
              <Label>Email (optional)</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="signer@employer.com" />
            </div>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="sign">Draw Signature</TabsTrigger>
              <TabsTrigger value="typed">Typed Attestation</TabsTrigger>
              <TabsTrigger value="refused">Refused / Unavailable</TabsTrigger>
            </TabsList>

            <TabsContent value="sign" className="pt-3">
              <SignaturePad onChange={setSigDataUrl} />
            </TabsContent>

            <TabsContent value="typed" className="pt-3 space-y-3">
              <div>
                <Label>Type your full legal name</Label>
                <Input value={typedName} onChange={(e) => setTypedName(e.target.value)} className="font-serif text-lg" />
              </div>
              <div className="rounded-md border p-3 bg-muted/40 text-sm">
                {attestationText}
              </div>
              <div className="flex items-start gap-2">
                <Checkbox checked={attestChecked} onCheckedChange={(v) => setAttestChecked(!!v)} id="attest" />
                <Label htmlFor="attest" className="text-sm font-normal cursor-pointer">
                  I confirm the above attestation and consent to electronic signature.
                </Label>
              </div>
            </TabsContent>

            <TabsContent value="refused" className="pt-3 space-y-3">
              <RadioGroup value={refusalKind} onValueChange={(v) => setRefusalKind(v as any)}>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="REFUSED" id="r-ref" />
                  <Label htmlFor="r-ref">Refused to sign</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="UNAVAILABLE" id="r-un" />
                  <Label htmlFor="r-un">Unavailable</Label>
                </div>
              </RadioGroup>
              <div>
                <Label>Reason / inspector attestation *</Label>
                <Textarea
                  rows={3}
                  value={refusalReason}
                  onChange={(e) => setRefusalReason(e.target.value)}
                  placeholder="Describe the circumstances of refusal or unavailability."
                />
              </div>
            </TabsContent>
          </Tabs>

          <div>
            <Label>Comments (optional)</Label>
            <Textarea rows={2} value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Signed with comments / clarifications" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Record Signature'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
