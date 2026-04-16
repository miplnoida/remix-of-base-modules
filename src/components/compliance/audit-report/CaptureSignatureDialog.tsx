/**
 * Enterprise Signature Capture Wizard
 *
 * 3-step flow:
 *  1. Identity   — confirm signer (same as audit contact / different / refused / unavailable)
 *  2. Method     — Draw / Typed / Refused-with-witness
 *  3. Review     — confirm + submit
 *
 * Distinguishes between AUDIT CONTACT (person met during the audit)
 * and REPORT SIGNER (the actual signatory now). Both are preserved on
 * the final record.
 */
import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ChevronLeft, ChevronRight, User, UserCheck, UserX, AlertCircle } from 'lucide-react';
import { SignaturePad } from './SignaturePad';
import { auditReportService } from '@/services/auditReportService';
import type { SignerRole, SignatureType } from '@/types/auditReport';
import { toast } from 'sonner';

interface AuditContact {
  name?: string;
  designation?: string;
  relationship?: string;
  present?: boolean;
}

interface CaptureSignatureDialogProps {
  reportId: string;
  signerRole: SignerRole;
  /** The Audit Contact captured during the audit (person met on site). */
  auditContact?: AuditContact;
  /** Inspector default name (for INSPECTOR role). */
  inspectorName?: string;
  onClose: () => void;
  onCaptured: () => void;
}

const ROLE_LABELS: Record<SignerRole, string> = {
  EMPLOYER_REP: 'Employer / Auditee Representative',
  INSPECTOR: 'Inspector',
  SUPERVISOR: 'Supervisor (Approval)',
  WITNESS: 'Witness',
};

type IdentityChoice = 'SAME' | 'DIFFERENT' | 'REFUSED' | 'UNAVAILABLE';
type Method = 'sign' | 'typed';

export function CaptureSignatureDialog({
  reportId,
  signerRole,
  auditContact,
  inspectorName,
  onClose,
  onCaptured,
}: CaptureSignatureDialogProps) {
  const isEmployerRep = signerRole === 'EMPLOYER_REP';
  const hasContact = !!auditContact?.name;

  const [step, setStep] = useState<1 | 2 | 3>(isEmployerRep && hasContact ? 1 : 2);

  // Step 1: Identity
  const [identityChoice, setIdentityChoice] = useState<IdentityChoice>(
    isEmployerRep && hasContact ? 'SAME' : 'DIFFERENT'
  );

  // Signer details (driven by identity choice)
  const [signerName, setSignerName] = useState(
    signerRole === 'INSPECTOR' ? inspectorName ?? '' : auditContact?.name ?? ''
  );
  const [signerDesignation, setSignerDesignation] = useState(auditContact?.designation ?? '');
  const [signerRelationship, setSignerRelationship] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [authorityNote, setAuthorityNote] = useState('');

  // Step 2: Method
  const [method, setMethod] = useState<Method>('sign');
  const [sigDataUrl, setSigDataUrl] = useState<string | null>(null);
  const [typedName, setTypedName] = useState('');
  const [attestChecked, setAttestChecked] = useState(false);

  // Refusal/unavailable extras
  const [refusalReason, setRefusalReason] = useState('');
  const [witnessName, setWitnessName] = useState('');
  const [witnessDesignation, setWitnessDesignation] = useState('');
  const [witnessSig, setWitnessSig] = useState<string | null>(null);
  const [inspectorAttests, setInspectorAttests] = useState(false);

  const [comments, setComments] = useState('');
  const [saving, setSaving] = useState(false);

  // When identity changes, prefill or clear signer fields
  const handleIdentityChange = (choice: IdentityChoice) => {
    setIdentityChoice(choice);
    if (choice === 'SAME' && auditContact) {
      setSignerName(auditContact.name ?? '');
      setSignerDesignation(auditContact.designation ?? '');
      setSignerRelationship('');
      setAuthorityNote('');
    } else if (choice === 'DIFFERENT') {
      setSignerName('');
      setSignerDesignation('');
    }
  };

  const attestationText = useMemo(
    () => `I, ${typedName || '[name]'}, attest that I am the person identified above and that this electronic signature constitutes my acknowledgment of receipt of this audit report.`,
    [typedName]
  );

  const isRefusalPath = identityChoice === 'REFUSED' || identityChoice === 'UNAVAILABLE';

  const canAdvanceToStep2 = () => {
    if (isRefusalPath) return true;
    if (!signerName.trim()) return false;
    if (identityChoice === 'DIFFERENT' && !authorityNote.trim()) return false;
    return true;
  };

  const canSubmit = () => {
    if (isRefusalPath) {
      if (!refusalReason.trim()) return false;
      if (!inspectorAttests) return false;
      return true;
    }
    if (!signerName.trim()) return false;
    if (method === 'sign' && !sigDataUrl) return false;
    if (method === 'typed' && (!typedName.trim() || !attestChecked)) return false;
    return true;
  };

  const submit = async () => {
    if (!canSubmit()) {
      toast.error('Please complete all required fields');
      return;
    }

    let signatureType: SignatureType;
    let payload: any = {};

    if (isRefusalPath) {
      signatureType = identityChoice === 'REFUSED' ? 'REFUSED' : 'UNAVAILABLE';
      payload = {
        refusalReason: refusalReason.trim(),
        signerName: auditContact?.name?.trim() || 'Not Available',
        signerDesignation: auditContact?.designation,
        witnessName: witnessName.trim() || undefined,
        witnessDesignation: witnessDesignation.trim() || undefined,
        witnessSignatureDataUrl: witnessSig ?? undefined,
      };
    } else {
      if (method === 'sign') {
        signatureType = 'ELECTRONIC';
        payload.signatureDataUrl = sigDataUrl;
      } else {
        signatureType = 'TYPED_ATTESTATION';
        payload.typedName = typedName.trim();
        payload.attestationText = attestationText;
      }
      payload.signerName = signerName.trim();
      payload.signerDesignation = signerDesignation.trim() || undefined;
      payload.signerEmail = signerEmail.trim() || undefined;
      payload.signerRelationship = signerRelationship.trim() || undefined;
      payload.signerSameAsContact = identityChoice === 'SAME';
      if (identityChoice === 'DIFFERENT') payload.signerAuthorityNote = authorityNote.trim();
    }

    try {
      setSaving(true);
      await auditReportService.captureSignature({
        reportId,
        signerRole,
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Capture Signature — {ROLE_LABELS[signerRole]}</span>
            <div className="flex items-center gap-1 text-xs font-normal">
              <StepDot active={step === 1} done={step > 1} label="Identity" />
              <StepDot active={step === 2} done={step > 2} label="Sign" />
              <StepDot active={step === 3} label="Review" />
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* ── STEP 1: IDENTITY ── */}
        {step === 1 && (
          <div className="space-y-4">
            {hasContact && (
              <Card className="bg-muted/30">
                <CardContent className="pt-4 space-y-1">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Audit Contact (recorded during audit)</div>
                  <div className="font-semibold flex items-center gap-2">
                    <User className="h-4 w-4" /> {auditContact!.name}
                    {auditContact!.present !== false && <Badge variant="outline" className="text-[10px]">Present at audit</Badge>}
                  </div>
                  {auditContact!.designation && <div className="text-sm text-muted-foreground">{auditContact!.designation}</div>}
                </CardContent>
              </Card>
            )}

            <div>
              <Label className="text-base">Who is signing now?</Label>
              <RadioGroup value={identityChoice} onValueChange={(v) => handleIdentityChange(v as IdentityChoice)} className="mt-2 space-y-2">
                {hasContact && (
                  <IdentityOption value="SAME" icon={<UserCheck className="h-4 w-4 text-green-600" />} title={`Same person — ${auditContact!.name}`} desc="Reuse audit contact details and capture signature." />
                )}
                <IdentityOption value="DIFFERENT" icon={<User className="h-4 w-4 text-blue-600" />} title="A different person from the employer" desc="Capture new signer details and explain authority." />
                <IdentityOption value="REFUSED" icon={<UserX className="h-4 w-4 text-destructive" />} title="Refused to sign" desc="Record refusal with reason, optional witness, and inspector attestation." />
                <IdentityOption value="UNAVAILABLE" icon={<AlertCircle className="h-4 w-4 text-amber-600" />} title="Not available to sign" desc="Signer is absent. Record reason and inspector attestation." />
              </RadioGroup>
            </div>

            {identityChoice === 'DIFFERENT' && (
              <div className="space-y-3 border-l-2 border-primary pl-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Full Name *</Label>
                    <Input value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="e.g. John Smith" />
                  </div>
                  <div>
                    <Label>Designation / Title *</Label>
                    <Input value={signerDesignation} onChange={(e) => setSignerDesignation(e.target.value)} placeholder="e.g. Director" />
                  </div>
                  <div>
                    <Label>Authority / Relationship</Label>
                    <Input value={signerRelationship} onChange={(e) => setSignerRelationship(e.target.value)} placeholder="e.g. Authorised representative, POA holder" />
                  </div>
                  <div>
                    <Label>Email (optional)</Label>
                    <Input value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} placeholder="signer@employer.com" />
                  </div>
                </div>
                <div>
                  <Label>Why is the original audit contact not signing? *</Label>
                  <Textarea
                    rows={2}
                    value={authorityNote}
                    onChange={(e) => setAuthorityNote(e.target.value)}
                    placeholder="e.g. Original contact on leave; signing on behalf as authorised director."
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: METHOD / REFUSAL ── */}
        {step === 2 && !isRefusalPath && (
          <div className="space-y-4">
            <Card className="bg-muted/30">
              <CardContent className="pt-4 text-sm">
                <div className="font-semibold">{signerName}</div>
                {signerDesignation && <div className="text-muted-foreground">{signerDesignation}</div>}
                {identityChoice === 'DIFFERENT' && (
                  <Badge variant="secondary" className="mt-1 text-[10px]">Different from audit contact</Badge>
                )}
                {identityChoice === 'SAME' && (
                  <Badge variant="outline" className="mt-1 text-[10px]">Same as audit contact</Badge>
                )}
              </CardContent>
            </Card>

            <Tabs value={method} onValueChange={(v) => setMethod(v as Method)}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="sign">Draw Signature</TabsTrigger>
                <TabsTrigger value="typed">Typed Attestation</TabsTrigger>
              </TabsList>
              <TabsContent value="sign" className="pt-3">
                <SignaturePad onChange={setSigDataUrl} />
              </TabsContent>
              <TabsContent value="typed" className="pt-3 space-y-3">
                <div>
                  <Label>Type your full legal name</Label>
                  <Input value={typedName} onChange={(e) => setTypedName(e.target.value)} className="font-serif text-lg" placeholder={signerName} />
                </div>
                <div className="rounded-md border p-3 bg-muted/40 text-sm">{attestationText}</div>
                <div className="flex items-start gap-2">
                  <Checkbox checked={attestChecked} onCheckedChange={(v) => setAttestChecked(!!v)} id="attest" />
                  <Label htmlFor="attest" className="text-sm font-normal cursor-pointer">
                    I confirm the above attestation and consent to electronic signature.
                  </Label>
                </div>
              </TabsContent>
            </Tabs>

            <div>
              <Label>Comments (optional)</Label>
              <Textarea rows={2} value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Signed with comments / clarifications" />
            </div>
          </div>
        )}

        {step === 2 && isRefusalPath && (
          <div className="space-y-4">
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="pt-4 space-y-1">
                <div className="font-semibold text-destructive">
                  {identityChoice === 'REFUSED' ? 'Refused to Sign' : 'Not Available to Sign'}
                </div>
                <div className="text-sm text-muted-foreground">
                  Record this carefully — it is the formal evidence of the employer's response.
                </div>
              </CardContent>
            </Card>

            <div>
              <Label>Reason / Circumstances *</Label>
              <Textarea
                rows={3}
                value={refusalReason}
                onChange={(e) => setRefusalReason(e.target.value)}
                placeholder={identityChoice === 'REFUSED'
                  ? 'Describe the circumstances of refusal and any verbal explanation given.'
                  : 'Describe why the signer is unavailable (e.g. left site, on leave, etc.).'}
              />
            </div>

            <Separator />
            <div className="text-sm font-semibold">Witness (optional)</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Witness Name</Label>
                <Input value={witnessName} onChange={(e) => setWitnessName(e.target.value)} placeholder="e.g. Mary Johnson" />
              </div>
              <div>
                <Label>Witness Designation</Label>
                <Input value={witnessDesignation} onChange={(e) => setWitnessDesignation(e.target.value)} placeholder="e.g. Office Manager" />
              </div>
            </div>
            {witnessName && (
              <div>
                <Label>Witness Signature</Label>
                <SignaturePad onChange={setWitnessSig} />
              </div>
            )}

            <Separator />
            <div className="flex items-start gap-2 rounded-md border p-3 bg-muted/30">
              <Checkbox id="insp-attest" checked={inspectorAttests} onCheckedChange={(v) => setInspectorAttests(!!v)} />
              <Label htmlFor="insp-attest" className="text-sm font-normal cursor-pointer">
                <strong>Inspector attestation:</strong> I, the lead inspector, attest that the above account
                of {identityChoice === 'REFUSED' ? 'refusal' : 'unavailability'} is true and accurate to the
                best of my knowledge. *
              </Label>
            </div>
          </div>
        )}

        {/* ── STEP 3: REVIEW ── */}
        {step === 3 && (
          <div className="space-y-3 text-sm">
            <Card>
              <CardContent className="pt-4 space-y-2">
                <div className="text-xs uppercase text-muted-foreground">Audit Contact</div>
                <div>{auditContact?.name ?? '—'} {auditContact?.designation && <span className="text-muted-foreground">• {auditContact.designation}</span>}</div>
                <Separator />
                <div className="text-xs uppercase text-muted-foreground">Signatory</div>
                {isRefusalPath ? (
                  <div>
                    <Badge variant="destructive">{identityChoice === 'REFUSED' ? 'REFUSED TO SIGN' : 'UNAVAILABLE'}</Badge>
                    <div className="mt-2"><strong>Reason:</strong> {refusalReason}</div>
                    {witnessName && <div className="mt-1"><strong>Witness:</strong> {witnessName} {witnessDesignation && `(${witnessDesignation})`}</div>}
                  </div>
                ) : (
                  <div>
                    <div><strong>{signerName}</strong>{signerDesignation && ` — ${signerDesignation}`}</div>
                    {identityChoice === 'SAME' ? (
                      <Badge variant="outline" className="mt-1 text-[10px]">Same as audit contact</Badge>
                    ) : (
                      <>
                        <Badge variant="secondary" className="mt-1 text-[10px]">Different from audit contact</Badge>
                        {authorityNote && <div className="mt-1 text-xs italic">"{authorityNote}"</div>}
                      </>
                    )}
                    <div className="mt-2 text-xs text-muted-foreground">Method: {method === 'sign' ? 'Drawn signature' : 'Typed attestation'}</div>
                    {method === 'sign' && sigDataUrl && (
                      <img src={sigDataUrl} alt="preview" className="mt-2 max-h-20 border-b" />
                    )}
                    {method === 'typed' && (
                      <div className="mt-2 italic" style={{ fontFamily: 'cursive', fontSize: '1.1rem' }}>/s/ {typedName}</div>
                    )}
                  </div>
                )}
                {comments && <div className="mt-2 text-xs italic text-muted-foreground">Comments: "{comments}"</div>}
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter className="flex justify-between sm:justify-between gap-2">
          <div>
            {step > 1 && (
              <Button variant="ghost" onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)} disabled={saving}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            {step < 3 ? (
              <Button
                onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
                disabled={step === 1 ? !canAdvanceToStep2() : !canSubmit()}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={submit} disabled={saving || !canSubmit()}>
                {saving ? 'Saving…' : 'Confirm & Record'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StepDot({ active, done, label }: { active?: boolean; done?: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className={`h-2 w-2 rounded-full ${active ? 'bg-primary' : done ? 'bg-primary/60' : 'bg-muted-foreground/30'}`} />
      <span className={active ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
    </div>
  );
}

function IdentityOption({ value, icon, title, desc }: { value: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5 transition-colors">
      <RadioGroupItem value={value} className="mt-1" />
      <div className="flex-1">
        <div className="flex items-center gap-2 font-medium text-sm">{icon} {title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
      </div>
    </label>
  );
}
