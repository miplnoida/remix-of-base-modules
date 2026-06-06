import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useClaimantPersona } from '@/hooks/external/useClaimantPersona';
import { auditPortalAction } from '@/services/external/auditPortalAction';

interface DocRow {
  id: string;
  document_type: string | null;
  document_name: string | null;
  file_path: string | null;
  file_size: number | null;
  uploaded_at: string | null;
  is_active: boolean | null;
}

export default function DocumentCenterPage() {
  const { persona, userId } = useClaimantPersona();
  const [rows, setRows] = useState<DocRow[] | null>(null);

  useEffect(() => {
    if (!persona?.personSsn) { setRows([]); return; }
    const db = supabase as any;
    db.from('ip_documents')
      .select('id, document_type, document_name, file_path, file_size, uploaded_at, is_active')
      .eq('ssn', persona.personSsn)
      .order('uploaded_at', { ascending: false })
      .limit(200)
      .then((r: any) => setRows(r.data ?? []));
  }, [persona?.personSsn]);

  function view(d: DocRow) {
    auditPortalAction('DOCUMENT_VIEWED', { userId, targetSsn: persona?.personSsn, payload: { documentId: d.id } });
    if (!d.file_path) return;
    const projectId = (import.meta as any).env?.VITE_SUPABASE_PROJECT_ID;
    const url = `https://${projectId}.supabase.co/functions/v1/n?path=${encodeURIComponent(d.file_path)}`;
    window.open(url, '_blank', 'noopener');
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Document Center</CardTitle>
        <CardDescription>All documents on your record (ip_documents).</CardDescription>
      </CardHeader>
      <CardContent>
        {rows === null ? <Skeleton className="h-32 w-full" /> : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents on file.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-32">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(d => (
                <TableRow key={d.id}>
                  <TableCell>{d.document_name ?? '—'}</TableCell>
                  <TableCell><Badge variant="outline">{d.document_type ?? '—'}</Badge></TableCell>
                  <TableCell>{d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString() : '—'}</TableCell>
                  <TableCell>{d.is_active ? 'Yes' : 'No'}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => view(d)} disabled={!d.file_path}>
                      <Eye className="h-3 w-3 mr-1" /> View
                    </Button>
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
