import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useClaimantPersona } from '@/hooks/external/useClaimantPersona';
import { auditPortalAction } from '@/services/external/auditPortalAction';

interface BankRow {
  identifier: number;
  claim_number: string | null;
  bank_code: string | null;
  acct_num: string | null;
  acct_name: string | null;
  acct_type: string | null;
  active_ind: string | null;
  last_modified_date: string | null;
}

export default function BankUpdatePage() {
  const { userId, persona } = useClaimantPersona();
  const [rows, setRows] = useState<BankRow[] | null>(null);
  const [form, setForm] = useState({ bank_code: '', acct_num: '', acct_name: '', acct_type: 'SAVINGS' });
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!persona?.personSsn) { setRows([]); return; }
    const db = supabase as any;
    // cl_bank_acct is keyed by claim_number — list any rows tied to claims owned by this SSN
    const { data: claims } = await db.from('bn_claim').select('claim_number').eq('ssn', persona.personSsn);
    const numbers = (claims ?? []).map((c: any) => c.claim_number).filter(Boolean);
    if (numbers.length === 0) { setRows([]); return; }
    const { data } = await db
      .from('cl_bank_acct')
      .select('identifier, claim_number, bank_code, acct_num, acct_name, acct_type, active_ind, last_modified_date')
      .in('claim_number', numbers)
      .order('last_modified_date', { ascending: false });
    setRows(data ?? []);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [persona?.personSsn]);

  async function submit() {
    if (!form.bank_code || !form.acct_num || !form.acct_name) {
      toast.error('Please complete all fields.');
      return;
    }
    setSaving(true);
    try {
      const db = supabase as any;
      // Insert as a pending bank update record — Internal LAN will reconcile.
      const { error } = await db.from('cl_bank_acct').insert({
        claim_number: rows?.[0]?.claim_number ?? null,
        bank_code: form.bank_code,
        acct_num: form.acct_num,
        acct_name: form.acct_name,
        acct_type: form.acct_type,
        active_ind: 'P',
        last_modified_name: 'SELF_SERVICE',
        last_modified_date: new Date().toISOString(),
      });
      if (error) throw error;
      auditPortalAction('BANK_DETAILS_UPDATED', { userId, targetSsn: persona?.personSsn });
      toast.success('Bank update submitted for review.');
      setForm({ bank_code: '', acct_num: '', acct_name: '', acct_type: 'SAVINGS' });
      load();
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
          <CardTitle>Bank / EFT Update</CardTitle>
          <CardDescription>
            Submit a new bank account for benefit payments. Changes are reviewed before becoming active.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Bank code</Label><Input value={form.bank_code} onChange={e => setForm({ ...form, bank_code: e.target.value })} maxLength={10} /></div>
            <div className="space-y-1.5"><Label>Account type</Label>
              <Select value={form.acct_type} onValueChange={v => setForm({ ...form, acct_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SAVINGS">Savings</SelectItem>
                  <SelectItem value="CHEQUING">Chequing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Account number</Label><Input value={form.acct_num} onChange={e => setForm({ ...form, acct_num: e.target.value })} maxLength={30} /></div>
            <div className="space-y-1.5"><Label>Account holder name</Label><Input value={form.acct_name} onChange={e => setForm({ ...form, acct_name: e.target.value })} maxLength={75} /></div>
          </div>
          <Button onClick={submit} disabled={saving}>{saving ? 'Submitting…' : 'Submit update'}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Current accounts on file</CardTitle></CardHeader>
        <CardContent>
          {rows === null ? <Skeleton className="h-20 w-full" /> : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bank accounts on file.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Bank</TableHead><TableHead>Account</TableHead><TableHead>Holder</TableHead><TableHead>Type</TableHead><TableHead>Active</TableHead><TableHead>Updated</TableHead></TableRow></TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.identifier}>
                    <TableCell>{r.bank_code}</TableCell>
                    <TableCell className="font-mono">{r.acct_num}</TableCell>
                    <TableCell>{r.acct_name}</TableCell>
                    <TableCell>{r.acct_type}</TableCell>
                    <TableCell><Badge variant={r.active_ind === 'Y' ? 'default' : 'secondary'}>{r.active_ind ?? '—'}</Badge></TableCell>
                    <TableCell>{r.last_modified_date ? new Date(r.last_modified_date).toLocaleDateString() : '—'}</TableCell>
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
