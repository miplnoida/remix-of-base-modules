/**
 * Unified Payment Details section.
 *
 * The single component used across:
 *   • Claimant Portal — EFT update
 *   • Public online benefit application
 *   • Staff / Assisted intake
 *   • Claim Workbench
 *   • Entitlement setup
 *   • Payment Preparation (amend blocked payable)
 *   • EFT Update service
 *
 * Screens MUST NOT build their own bank form. Pass `channel` + `productId` and
 * this component pulls the right policy and persists via paymentProfileService.
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, ShieldAlert, Clock } from 'lucide-react';
import {
  getActiveProfile,
  getPaymentPolicy,
  getPendingChangeRequest,
  submitChangeRequest,
} from '@/services/bn/payment/paymentProfileService';
import type {
  BnPaymentChannel,
  BnPaymentMethod,
  BnPaymentPolicy,
  BnPaymentProfile,
  BnPaymentProfileChangeRequest,
  BnPaymentProfileDraft,
} from '@/types/bnPaymentProfile';
import { DEFAULT_PAYMENT_POLICY, maskAccount } from '@/types/bnPaymentProfile';

export interface PaymentDetailsSectionProps {
  mode?: 'view' | 'edit' | 'amend';
  channel: BnPaymentChannel;
  productId?: string | null;
  personSsn: string;
  payeeId?: string | null;
  claimId?: string | null;
  entitlementId?: string | null;
  userCode?: string;
  onSaved?: (profileOrRequest: BnPaymentProfile | BnPaymentProfileChangeRequest) => void;
}

const METHOD_LABEL: Record<BnPaymentMethod, string> = {
  EFT: 'Electronic Funds Transfer (EFT)',
  CHEQUE: 'Cheque',
  CASH_PICKUP: 'Cash Pickup',
  INTERNAL_TRANSFER: 'Internal Transfer',
};

export default function PaymentDetailsSection(props: PaymentDetailsSectionProps) {
  const { mode = 'edit', channel, productId, personSsn, payeeId = null, claimId = null, entitlementId = null, userCode = 'SYSTEM', onSaved } = props;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policy, setPolicy] = useState<BnPaymentPolicy>(DEFAULT_PAYMENT_POLICY);
  const [active, setActive] = useState<BnPaymentProfile | null>(null);
  const [pending, setPending] = useState<BnPaymentProfileChangeRequest | null>(null);
  const [draft, setDraft] = useState<BnPaymentProfileDraft>({
    person_ssn: personSsn,
    payment_method: 'EFT',
    payment_currency: 'XCD',
  });
  const [reason, setReason] = useState('');
  const [rawAccount, setRawAccount] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const [pol, prof, pend] = await Promise.all([
        getPaymentPolicy(productId ?? null),
        getActiveProfile(personSsn, { payeeId, currency: 'XCD' }),
        getPendingChangeRequest(personSsn, { claimId }),
      ]);
      if (!alive) return;
      setPolicy(pol);
      setActive(prof);
      setPending(pend);
      setDraft({
        person_ssn: personSsn,
        payee_id: payeeId,
        payment_method: prof?.payment_method ?? pol.default_payment_method ?? pol.allowed_payment_methods[0] ?? 'EFT',
        payment_currency: prof?.payment_currency ?? 'XCD',
        bank_name: prof?.bank_name ?? null,
        bank_code: prof?.bank_code ?? null,
        branch_name: prof?.branch_name ?? null,
        branch_code: prof?.branch_code ?? null,
        account_number_masked: prof?.account_number_masked ?? null,
        account_holder_name: prof?.account_holder_name ?? null,
        account_holder_relationship: prof?.account_holder_relationship ?? null,
        account_type: prof?.account_type ?? null,
        postal_address_snapshot: prof?.postal_address_snapshot ?? null,
      });
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [productId, personSsn, payeeId, claimId]);

  const methodOptions = useMemo(
    () => policy.allowed_payment_methods.filter(Boolean),
    [policy.allowed_payment_methods],
  );

  function update<K extends keyof BnPaymentProfileDraft>(k: K, v: BnPaymentProfileDraft[K]) {
    setDraft((d) => ({ ...d, [k]: v }));
  }
  function updateAddr(k: keyof NonNullable<BnPaymentProfileDraft['postal_address_snapshot']>, v: string) {
    setDraft((d) => ({ ...d, postal_address_snapshot: { ...(d.postal_address_snapshot ?? {}), [k]: v } }));
  }

  async function handleSubmit() {
    // Validate
    if (draft.payment_method === 'EFT') {
      if (!draft.bank_name || !draft.bank_code || (!rawAccount && !draft.account_number_masked) || !draft.account_holder_name) {
        toast.error('Please complete bank name, code, account number and account holder name');
        return;
      }
    }
    if (draft.payment_method === 'CHEQUE' && policy.cheque_address_required) {
      const a = draft.postal_address_snapshot;
      if (!a?.line1 || !a?.city) {
        toast.error('Postal address (line 1 and city) is required for cheque payments');
        return;
      }
    }
    if (policy.require_proof_for_change && !reason) {
      toast.error('Please provide a reason for this change');
      return;
    }

    const masked = rawAccount ? maskAccount(rawAccount) : draft.account_number_masked ?? null;

    setSaving(true);
    try {
      const result = await submitChangeRequest({
        personSsn,
        payeeId,
        channel,
        claimId,
        entitlementId,
        reason: reason || undefined,
        policy,
        userCode,
        draft: { ...draft, account_number_masked: masked } as BnPaymentProfileDraft,
      });
      toast.success(
        result.status === 'APPROVED'
          ? 'Payment details updated'
          : 'Change submitted for approval',
      );
      setRawAccount('');
      onSaved?.(result);
      // refresh
      const [prof, pend] = await Promise.all([
        getActiveProfile(personSsn, { payeeId, currency: 'XCD' }),
        getPendingChangeRequest(personSsn, { claimId }),
      ]);
      setActive(prof);
      setPending(pend);
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not save payment details');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading payment details…
        </CardContent>
      </Card>
    );
  }

  const readOnly = mode === 'view';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Payment Details</CardTitle>
          <div className="flex items-center gap-2">
            {active?.verification_status === 'VERIFIED' && (
              <Badge variant="secondary" className="gap-1"><ShieldCheck className="h-3 w-3" /> Verified</Badge>
            )}
            {active && active.verification_status !== 'VERIFIED' && (
              <Badge variant="outline" className="gap-1"><ShieldAlert className="h-3 w-3" /> {active.verification_status}</Badge>
            )}
            {pending && (
              <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Pending change</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {active && (
          <div className="rounded-md border bg-muted/30 p-3 text-xs">
            <div className="font-medium mb-1">Current active profile</div>
            <div className="grid grid-cols-2 gap-1 text-muted-foreground">
              <div>Method: {METHOD_LABEL[active.payment_method]}</div>
              <div>Currency: {active.payment_currency}</div>
              {active.bank_name && <div>Bank: {active.bank_name}</div>}
              {active.account_number_masked && <div>Account: {active.account_number_masked}</div>}
              {active.account_holder_name && <div>Holder: {active.account_holder_name}</div>}
              <div>Effective from: {active.effective_from}</div>
            </div>
          </div>
        )}

        {!readOnly && (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Payment method</Label>
                <Select
                  value={draft.payment_method}
                  onValueChange={(v) => update('payment_method', v as BnPaymentMethod)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {methodOptions.map((m) => (
                      <SelectItem key={m} value={m}>{METHOD_LABEL[m]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Currency</Label>
                <Input
                  value={draft.payment_currency ?? 'XCD'}
                  onChange={(e) => update('payment_currency', e.target.value.toUpperCase())}
                />
              </div>
            </div>

            {draft.payment_method === 'EFT' && (
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label>Bank name</Label>
                  <Input value={draft.bank_name ?? ''} onChange={(e) => update('bank_name', e.target.value)} />
                </div>
                <div>
                  <Label>Bank code</Label>
                  <Input value={draft.bank_code ?? ''} onChange={(e) => update('bank_code', e.target.value)} />
                </div>
                <div>
                  <Label>Branch name</Label>
                  <Input value={draft.branch_name ?? ''} onChange={(e) => update('branch_name', e.target.value)} />
                </div>
                <div>
                  <Label>Branch code</Label>
                  <Input value={draft.branch_code ?? ''} onChange={(e) => update('branch_code', e.target.value)} />
                </div>
                <div>
                  <Label>Account number</Label>
                  <Input
                    placeholder={draft.account_number_masked ?? '••••1234'}
                    value={rawAccount}
                    onChange={(e) => setRawAccount(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Stored masked; raw digits never displayed back.</p>
                </div>
                <div>
                  <Label>Account type</Label>
                  <Input value={draft.account_type ?? ''} onChange={(e) => update('account_type', e.target.value)} placeholder="Savings / Chequing" />
                </div>
                <div>
                  <Label>Account holder name</Label>
                  <Input value={draft.account_holder_name ?? ''} onChange={(e) => update('account_holder_name', e.target.value)} />
                </div>
                {(policy.allow_third_party_payee || policy.allow_guardian_payee) && (
                  <div>
                    <Label>Holder relationship</Label>
                    <Input value={draft.account_holder_relationship ?? ''} onChange={(e) => update('account_holder_relationship', e.target.value)} placeholder="Self / Guardian / Payee" />
                  </div>
                )}
              </div>
            )}

            {draft.payment_method === 'CHEQUE' && (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label>Postal address — Line 1</Label>
                  <Input value={draft.postal_address_snapshot?.line1 ?? ''} onChange={(e) => updateAddr('line1', e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <Label>Line 2</Label>
                  <Input value={draft.postal_address_snapshot?.line2 ?? ''} onChange={(e) => updateAddr('line2', e.target.value)} />
                </div>
                <div>
                  <Label>City / Town</Label>
                  <Input value={draft.postal_address_snapshot?.city ?? ''} onChange={(e) => updateAddr('city', e.target.value)} />
                </div>
                <div>
                  <Label>Parish / State</Label>
                  <Input value={draft.postal_address_snapshot?.parish ?? ''} onChange={(e) => updateAddr('parish', e.target.value)} />
                </div>
                <div>
                  <Label>Postal code</Label>
                  <Input value={draft.postal_address_snapshot?.postal_code ?? ''} onChange={(e) => updateAddr('postal_code', e.target.value)} />
                </div>
                <div>
                  <Label>Country</Label>
                  <Input value={draft.postal_address_snapshot?.country ?? ''} onChange={(e) => updateAddr('country', e.target.value)} />
                </div>
              </div>
            )}

            {(policy.require_proof_for_change || mode === 'amend') && (
              <div>
                <Label>Reason for change</Label>
                <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button onClick={handleSubmit} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === 'amend' ? 'Submit amendment' : 'Save payment details'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Channel: <span className="font-mono">{channel}</span>
              {policy.require_supervisor_approval_for_change && ' • Supervisor approval required for this product'}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
