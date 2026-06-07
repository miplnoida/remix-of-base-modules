import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import PaymentDetailsSection from '@/components/bn/payment/PaymentDetailsSection';
import type { BnPaymentProfile } from '@/types/bnPaymentProfile';

const db = supabase as any;

export default function PaymentProfiles() {
  const [rows, setRows] = useState<BnPaymentProfile[]>([]);
  const [search, setSearch] = useState('');
  const [editingSsn, setEditingSsn] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    let q = db.from('bn_payment_profile').select('*').order('updated_at', { ascending: false }).limit(200);
    if (search.trim()) q = q.ilike('person_ssn', `%${search.trim()}%`);
    const { data } = await q;
    setRows((data as BnPaymentProfile[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  return (
    <div className="container mx-auto p-6 space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Payment Profiles</CardTitle>
            <div className="flex items-center gap-2">
              <Input placeholder="Search by SSN" value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
              <Button onClick={load} disabled={loading}>Search</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SSN</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Bank / Address</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Effective from</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono">{r.person_ssn}</TableCell>
                  <TableCell>{r.payment_method}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.payment_method === 'EFT'
                      ? `${r.bank_name ?? ''} ${r.account_number_masked ?? ''}`
                      : r.postal_address_snapshot?.line1 ?? '-'}
                  </TableCell>
                  <TableCell>{r.payment_currency}</TableCell>
                  <TableCell>
                    <Badge variant={r.verification_status === 'VERIFIED' ? 'secondary' : 'outline'}>
                      {r.verification_status}
                    </Badge>{' '}
                    {r.active ? <Badge variant="outline">active</Badge> : null}
                  </TableCell>
                  <TableCell>{r.effective_from}</TableCell>
                  <TableCell className="text-right">
                    <Dialog open={editingSsn === r.person_ssn} onOpenChange={(o) => setEditingSsn(o ? r.person_ssn : null)}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">Manage</Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader><DialogTitle>Payment details — {r.person_ssn}</DialogTitle></DialogHeader>
                        <PaymentDetailsSection
                          channel="CLAIM_WORKBENCH"
                          personSsn={r.person_ssn}
                          mode="amend"
                          onSaved={() => { setEditingSsn(null); load(); }}
                        />
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
              {!rows.length && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No payment profiles yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
