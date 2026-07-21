/**
 * Inspection Evidence Register
 *
 * Read/manage evidence captured during inspections. Reuses `ce_inspection_evidence`
 * (documents, photos, signed visit sheets, payroll records, notes). Upload uses
 * the existing storage/document pattern via file_url references — no parallel
 * upload pipeline is introduced.
 */
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { FolderOpen, AlertCircle, ExternalLink, MoreHorizontal, Plus, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { isComplianceFeatureEnabled } from '@/lib/compliance/featureToggles';
import { toast } from 'sonner';
import { EvidenceUploadDialog } from './EvidenceUploadDialog';
import { EvidenceEditDialog, type EditableEvidence } from './EvidenceEditDialog';

const PERMISSION = 'manage_compliance';

const EVIDENCE_TYPES = ['DOCUMENT', 'PHOTO', 'PAYROLL', 'SIGNED_SHEET', 'NOTE', 'OTHER'];

export default function InspectionEvidencePage() {
  if (!isComplianceFeatureEnabled('inspections.evidence') || !isComplianceFeatureEnabled('inspections')) {
    return (
      <div className="container mx-auto p-6">
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <AlertCircle className="mx-auto h-8 w-8 mb-2" />
          Inspection Evidence is disabled.
        </CardContent></Card>
      </div>
    );
  }
  return (
    <PermissionWrapper moduleName={PERMISSION}>
      <Inner />
    </PermissionWrapper>
  );
}

function tryExtractStoragePath(fileUrl: string | null): string | null {
  if (!fileUrl) return null;
  const marker = '/storage/v1/object/public/documents/';
  const idx = fileUrl.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(fileUrl.slice(idx + marker.length));
}

function Inner() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [type, setType] = useState<string>('ALL');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EditableEvidence | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const q = useQuery({
    queryKey: ['ce-evidence-list', type],
    queryFn: async () => {
      let qb: any = (supabase.from('ce_inspection_evidence') as any)
        .select(
          'id, evidence_type, file_name, file_url, file_size, description, captured_at, captured_by, ' +
            'inspection_id, finding_id, ce_inspections(inspection_number, employer_id, employer_name)',
        )
        .order('captured_at', { ascending: false })
        .limit(500);
      if (type !== 'ALL') qb = qb.eq('evidence_type', type);
      const { data, error } = await qb;
      if (error) throw error;
      return data ?? [];
    },
  });

  const del = useMutation({
    mutationFn: async (row: any) => {
      const path = tryExtractStoragePath(row.file_url);
      if (path) {
        // Best-effort storage cleanup — don't block DB delete if storage fails.
        await supabase.storage.from('documents').remove([path]).catch(() => {});
      }
      const { error } = await supabase.from('ce_inspection_evidence').delete().eq('id', row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Evidence deleted');
      qc.invalidateQueries({ queryKey: ['ce-evidence-list'] });
      setDeleteTarget(null);
    },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to delete evidence'),
  });

  const rows = useMemo(() => {
    const all = (q.data ?? []) as any[];
    if (!search.trim()) return all;
    const s = search.toLowerCase();
    return all.filter(
      (r) =>
        r.file_name?.toLowerCase().includes(s) ||
        r.description?.toLowerCase().includes(s) ||
        r.ce_inspections?.employer_name?.toLowerCase().includes(s) ||
        r.ce_inspections?.inspection_number?.toLowerCase().includes(s),
    );
  }, [q.data, search]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <FolderOpen className="h-6 w-6" /> Inspection Evidence
          </h1>
          <p className="text-muted-foreground text-sm">
            Documents, photos, payroll records, and signed visit sheets captured during inspections.
          </p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Attach Evidence
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[240px]">
          <Label className="text-xs">Search</Label>
          <Input
            placeholder="File, description, employer, inspection #"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-48">
          <Label className="text-xs">Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              {EVIDENCE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Evidence Records</CardTitle>
          <CardDescription>{rows.length} record(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {q.isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No evidence found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Captured</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Inspection</TableHead>
                  <TableHead>Employer</TableHead>
                  <TableHead>By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">
                      {r.captured_at ? format(new Date(r.captured_at), 'dd MMM yyyy HH:mm') : '—'}
                    </TableCell>
                    <TableCell><Badge variant="outline">{r.evidence_type}</Badge></TableCell>
                    <TableCell className="max-w-[260px]">
                      <div className="truncate font-medium">{r.file_name}</div>
                      {r.description && (
                        <div className="text-xs text-muted-foreground truncate">{r.description}</div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {r.ce_inspections?.inspection_number ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.ce_inspections?.employer_name ?? r.ce_inspections?.employer_id ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs">{r.captured_by ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {r.file_url && (
                          <Button asChild size="sm" variant="ghost" title="Open file">
                            <a href={r.file_url} target="_blank" rel="noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setEditTarget({
                                id: r.id,
                                inspection_id: r.inspection_id,
                                evidence_type: r.evidence_type,
                                description: r.description,
                                finding_id: r.finding_id,
                              })}
                            >
                              <Pencil className="h-4 w-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteTarget(r)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <EvidenceUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
      <EvidenceEditDialog
        open={!!editTarget}
        onOpenChange={(o) => { if (!o) setEditTarget(null); }}
        evidence={editTarget}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this evidence?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the evidence record
              {deleteTarget?.file_name ? ` "${deleteTarget.file_name}"` : ''} and its uploaded file.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={del.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); if (deleteTarget) del.mutate(deleteTarget); }}
              disabled={del.isPending}
            >
              {del.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
