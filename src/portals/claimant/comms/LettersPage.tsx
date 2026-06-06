import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Eye, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useClaimantPersona } from '@/hooks/external/useClaimantPersona';
import { auditPortalAction } from '@/services/external/auditPortalAction';

interface LetterRow {
  id: string;
  claim_id: string | null;
  subject: string | null;
  event_code: string | null;
  status: string | null;
  pdf_storage_path: string | null;
  generated_at: string | null;
  dispatched_at: string | null;
}

export default function LettersPage() {
  const { userId, persona } = useClaimantPersona();
  const [rows, setRows] = useState<LetterRow[] | null>(null);

  useEffect(() => {
    (async () => {
      if (!persona?.personSsn) { setRows([]); return; }
      const db = supabase as any;
      const { data: claims } = await db.from('bn_claim').select('id').eq('ssn', persona.personSsn);
      const ids = (claims ?? []).map((c: any) => c.id);
      if (ids.length === 0) { setRows([]); return; }
      const { data } = await db
        .from('bn_letter')
        .select('id, claim_id, subject, event_code, status, pdf_storage_path, generated_at, dispatched_at')
        .in('claim_id', ids)
        .order('generated_at', { ascending: false })
        .limit(100);
      setRows(data ?? []);
    })();
  }, [persona?.personSsn]);

  async function openPdf(r: LetterRow) {
    auditPortalAction('LETTER_VIEWED', { userId, targetClaimId: r.claim_id, payload: { letterId: r.id } });
    if (!r.pdf_storage_path) return;
    const projectId = (import.meta as any).env?.VITE_SUPABASE_PROJECT_ID;
    const url = `https://${projectId}.supabase.co/functions/v1/n?path=${encodeURIComponent(r.pdf_storage_path)}`;
    window.open(url, '_blank', 'noopener');
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Letters</CardTitle>
        <CardDescription>Official correspondence issued to you.</CardDescription>
      </CardHeader>
      <CardContent>
        {rows === null ? <Skeleton className="h-32 w-full" /> : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No letters on file.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-40">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(r => (
                <TableRow key={r.id}>
                  <TableCell>{r.generated_at ? new Date(r.generated_at).toLocaleDateString() : '—'}</TableCell>
                  <TableCell>{r.subject ?? '—'}</TableCell>
                  <TableCell className="text-xs">{r.event_code ?? '—'}</TableCell>
                  <TableCell><Badge>{r.status ?? '—'}</Badge></TableCell>
                  <TableCell>
                    {r.pdf_storage_path ? (
                      <Button size="sm" variant="outline" onClick={() => openPdf(r)}>
                        <Eye className="h-3 w-3 mr-1" /> View
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                        <Download className="h-3 w-3" /> Not generated
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
