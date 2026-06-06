import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useClaimantPersona } from '@/hooks/external/useClaimantPersona';
import { auditPortalAction } from '@/services/external/auditPortalAction';
import { Landmark, Globe2, FileText } from 'lucide-react';

type Method = 'EFT' | 'WIRE' | 'CHECK';

interface BankOption { bank_code: string; name: string }
interface RequestRow {
  id: string;
  method: Method;
  status: string;
  bank_code: string | null;
  acct_num: string | null;
  acct_name: string | null;
  acct_type: string | null;
  swift_bic: string | null;
  iban: string | null;
  wire_bank_name: string | null;
  check_payee_name: string | null;
  check_mailing_address: string | null;
  requested_at: string;
  review_notes: string | null;
}

const blankEft = { bank_code: '', branch_code: '', acct_num: '', acct_name: '', acct_type: 'SAVINGS' };
const blankWire = { swift_bic: '', iban: '', routing_number: '', wire_bank_name: '', wire_bank_address: '', wire_bank_country: '', intermediary_bank: '', acct_num: '', acct_name: '' };
const blankCheck = { check_payee_name: '', check_mailing_address: '', check_city: '', check_state: '', check_postal: '', check_country: '' };

export default function BankUpdatePage() {
  const { userId, persona } = useClaimantPersona();
  const [method, setMethod] = useState<Method>('EFT');
  const [eft, setEft] = useState(blankEft);
  const [wire, setWire] = useState(blankWire);
  const [chk, setChk] = useState(blankCheck);
  const [notes, setNotes] = useState('');
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [requests, setRequests] = useState<RequestRow[] | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from('tb_bank_code')
        .select('bank_code, name')
        .order('name');
      // Filter out non-bank placeholders
      const filtered = (data ?? []).filter((b: BankOption) =>
        !['CSH', 'MOR', 'PMO', 'NIL', 'UNK', 'OTH'].includes(b.bank_code)
      );
      setBanks(filtered);
    })();
  }, []);

  async function loadRequests() {
    if (!persona?.personSsn) { setRequests([]); return; }
    const { data } = await (supabase as any)
      .from('cl_payout_method_request')
      .select('id, method, status, bank_code, acct_num, acct_name, acct_type, swift_bic, iban, wire_bank_name, check_payee_name, check_mailing_address, requested_at, review_notes')
      .eq('ssn', persona.personSsn)
      .order('requested_at', { ascending: false });
    setRequests(data ?? []);
  }
  useEffect(() => { loadRequests(); /* eslint-disable-next-line */ }, [persona?.personSsn]);

  const bankName = useMemo(() => {
    const code = method === 'EFT' ? eft.bank_code : '';
    return banks.find(b => b.bank_code === code)?.name ?? '';
  }, [banks, eft.bank_code, method]);

  function validate(): string | null {
    if (!persona?.personSsn) return 'Please link your SSN before submitting bank or payment details.';
    if (method === 'EFT') {
      if (!eft.bank_code) return 'Please select your bank.';
      if (!eft.acct_num.trim()) return 'Account number is required.';
      if (!eft.acct_name.trim()) return 'Account holder name is required.';
    }
    if (method === 'WIRE') {
      if (!wire.wire_bank_name.trim()) return 'Bank name is required for wire transfers.';
      if (!wire.swift_bic.trim() && !wire.routing_number.trim()) return 'SWIFT/BIC or routing number is required.';
      if (!wire.acct_num.trim() && !wire.iban.trim()) return 'IBAN or account number is required.';
      if (!wire.acct_name.trim()) return 'Beneficiary name is required.';
    }
    if (method === 'CHECK') {
      if (!chk.check_payee_name.trim()) return 'Payee name is required.';
      if (!chk.check_mailing_address.trim()) return 'Mailing address is required.';
    }
    return null;
  }

  async function submit() {
    const err = validate();
    if (err) { toast.error('Please check the form for valid information!', { description: err }); return; }
    setSaving(true);
    try {
      const payload: any = {
        ssn: persona!.personSsn,
        method,
        status: 'PENDING',
        notes: notes.trim() || null,
        requested_by: userId ?? 'SELF_SERVICE',
      };
      if (method === 'EFT') Object.assign(payload, eft);
      if (method === 'WIRE') Object.assign(payload, wire);
      if (method === 'CHECK') Object.assign(payload, chk);

      const { error } = await (supabase as any).from('cl_payout_method_request').insert(payload);
      if (error) throw error;

      auditPortalAction('PAYOUT_METHOD_REQUESTED', { userId, targetSsn: persona?.personSsn, method });
      toast.success('Request submitted for review.');
      setEft(blankEft); setWire(blankWire); setChk(blankCheck); setNotes('');
      loadRequests();
    } catch (e) {
      toast.error('Could not submit', { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
          <CardDescription>
            Choose how you want to receive your benefit payments. Requests are reviewed before becoming active.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={method} onValueChange={(v) => setMethod(v as Method)} className="grid gap-3 sm:grid-cols-3">
            <label className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition ${method === 'EFT' ? 'border-primary bg-primary/5' : 'border-border'}`}>
              <RadioGroupItem value="EFT" id="m-eft" className="mt-0.5" />
              <div>
                <div className="flex items-center gap-2 font-medium"><Landmark className="h-4 w-4" /> EFT (Local Bank)</div>
                <p className="text-xs text-muted-foreground">Direct deposit to a St. Kitts &amp; Nevis bank account.</p>
              </div>
            </label>
            <label className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition ${method === 'WIRE' ? 'border-primary bg-primary/5' : 'border-border'}`}>
              <RadioGroupItem value="WIRE" id="m-wire" className="mt-0.5" />
              <div>
                <div className="flex items-center gap-2 font-medium"><Globe2 className="h-4 w-4" /> Wire Transfer</div>
                <p className="text-xs text-muted-foreground">International transfer using SWIFT/BIC or IBAN.</p>
              </div>
            </label>
            <label className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition ${method === 'CHECK' ? 'border-primary bg-primary/5' : 'border-border'}`}>
              <RadioGroupItem value="CHECK" id="m-check" className="mt-0.5" />
              <div>
                <div className="flex items-center gap-2 font-medium"><FileText className="h-4 w-4" /> Cheque by Mail</div>
                <p className="text-xs text-muted-foreground">Paper cheque mailed to a postal address.</p>
              </div>
            </label>
          </RadioGroup>

          <Tabs value={method} className="mt-2">
            <TabsList className="hidden">
              <TabsTrigger value="EFT">EFT</TabsTrigger>
              <TabsTrigger value="WIRE">Wire</TabsTrigger>
              <TabsTrigger value="CHECK">Check</TabsTrigger>
            </TabsList>

            <TabsContent value="EFT" className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Bank <span className="text-destructive">*</span></Label>
                <Select value={eft.bank_code} onValueChange={(v) => setEft({ ...eft, bank_code: v })}>
                  <SelectTrigger><SelectValue placeholder="Select your bank" /></SelectTrigger>
                  <SelectContent>
                    {banks.map(b => (
                      <SelectItem key={b.bank_code} value={b.bank_code}>{b.name} ({b.bank_code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {bankName && <p className="text-xs text-muted-foreground">Selected: {bankName}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Branch code</Label>
                <Input value={eft.branch_code} onChange={e => setEft({ ...eft, branch_code: e.target.value })} maxLength={10} />
              </div>
              <div className="space-y-1.5">
                <Label>Account type</Label>
                <Select value={eft.acct_type} onValueChange={v => setEft({ ...eft, acct_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAVINGS">Savings</SelectItem>
                    <SelectItem value="CHEQUING">Chequing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Account number <span className="text-destructive">*</span></Label>
                <Input value={eft.acct_num} onChange={e => setEft({ ...eft, acct_num: e.target.value })} maxLength={20} />
              </div>
              <div className="space-y-1.5">
                <Label>Account holder name <span className="text-destructive">*</span></Label>
                <Input value={eft.acct_name} onChange={e => setEft({ ...eft, acct_name: e.target.value })} maxLength={40} />
              </div>
            </TabsContent>

            <TabsContent value="WIRE" className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Beneficiary bank name <span className="text-destructive">*</span></Label>
                <Input value={wire.wire_bank_name} onChange={e => setWire({ ...wire, wire_bank_name: e.target.value })} maxLength={120} />
              </div>
              <div className="space-y-1.5">
                <Label>SWIFT / BIC</Label>
                <Input value={wire.swift_bic} onChange={e => setWire({ ...wire, swift_bic: e.target.value.toUpperCase() })} maxLength={15} placeholder="e.g. BOFAUS3N" />
              </div>
              <div className="space-y-1.5">
                <Label>Routing / ABA</Label>
                <Input value={wire.routing_number} onChange={e => setWire({ ...wire, routing_number: e.target.value })} maxLength={20} />
              </div>
              <div className="space-y-1.5">
                <Label>IBAN</Label>
                <Input value={wire.iban} onChange={e => setWire({ ...wire, iban: e.target.value.toUpperCase() })} maxLength={40} />
              </div>
              <div className="space-y-1.5">
                <Label>Account number</Label>
                <Input value={wire.acct_num} onChange={e => setWire({ ...wire, acct_num: e.target.value })} maxLength={40} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Beneficiary name <span className="text-destructive">*</span></Label>
                <Input value={wire.acct_name} onChange={e => setWire({ ...wire, acct_name: e.target.value })} maxLength={75} />
              </div>
              <div className="space-y-1.5">
                <Label>Bank country (ISO)</Label>
                <Input value={wire.wire_bank_country} onChange={e => setWire({ ...wire, wire_bank_country: e.target.value.toUpperCase() })} maxLength={3} placeholder="USA" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Bank address</Label>
                <Textarea value={wire.wire_bank_address} onChange={e => setWire({ ...wire, wire_bank_address: e.target.value })} rows={2} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Intermediary / correspondent bank (optional)</Label>
                <Textarea value={wire.intermediary_bank} onChange={e => setWire({ ...wire, intermediary_bank: e.target.value })} rows={2} />
              </div>
            </TabsContent>

            <TabsContent value="CHECK" className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Payee name <span className="text-destructive">*</span></Label>
                <Input value={chk.check_payee_name} onChange={e => setChk({ ...chk, check_payee_name: e.target.value })} maxLength={120} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Mailing address <span className="text-destructive">*</span></Label>
                <Textarea value={chk.check_mailing_address} onChange={e => setChk({ ...chk, check_mailing_address: e.target.value })} rows={2} />
              </div>
              <div className="space-y-1.5"><Label>City</Label><Input value={chk.check_city} onChange={e => setChk({ ...chk, check_city: e.target.value })} maxLength={60} /></div>
              <div className="space-y-1.5"><Label>State / Parish</Label><Input value={chk.check_state} onChange={e => setChk({ ...chk, check_state: e.target.value })} maxLength={60} /></div>
              <div className="space-y-1.5"><Label>Postal code</Label><Input value={chk.check_postal} onChange={e => setChk({ ...chk, check_postal: e.target.value })} maxLength={20} /></div>
              <div className="space-y-1.5"><Label>Country (ISO)</Label><Input value={chk.check_country} onChange={e => setChk({ ...chk, check_country: e.target.value.toUpperCase() })} maxLength={3} placeholder="KNA" /></div>
            </TabsContent>
          </Tabs>

          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} maxLength={250} placeholder="Any context for the reviewer" />
          </div>

          <div className="flex justify-end">
            <Button onClick={submit} disabled={saving}>{saving ? 'Submitting…' : 'Submit request'}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">My payment method requests</CardTitle></CardHeader>
        <CardContent>
          {requests === null ? <Skeleton className="h-20 w-full" /> : requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No requests submitted yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Method</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map(r => (
                  <TableRow key={r.id}>
                    <TableCell><Badge variant="outline">{r.method}</Badge></TableCell>
                    <TableCell className="text-sm">
                      {r.method === 'EFT' && <>{r.bank_code} • <span className="font-mono">{r.acct_num}</span> • {r.acct_name}</>}
                      {r.method === 'WIRE' && <>{r.wire_bank_name} • SWIFT {r.swift_bic || '—'} • IBAN/Acct <span className="font-mono">{r.iban || r.acct_num}</span></>}
                      {r.method === 'CHECK' && <>{r.check_payee_name} — {r.check_mailing_address}</>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.status === 'APPROVED' || r.status === 'ACTIVE' ? 'default' : r.status === 'REJECTED' ? 'destructive' : 'secondary'}>
                        {r.status}
                      </Badge>
                      {r.review_notes && <p className="mt-1 text-xs text-muted-foreground">{r.review_notes}</p>}
                    </TableCell>
                    <TableCell>{new Date(r.requested_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
