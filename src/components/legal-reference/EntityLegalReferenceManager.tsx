/**
 * EntityLegalReferenceManager — attach/detach legal references for any
 * module entity. Drop-in for case detail, benefit award detail, etc.
 */
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Trash2, ExternalLink, Scale } from 'lucide-react';
import { toast } from 'sonner';
import LegalReferenceSelector from './LegalReferenceSelector';
import {
  useAttachLegalReference,
  useDetachLegalReference,
  useEntityLegalReferences,
} from '@/hooks/legal-reference/useEntityLegalReferences';
import type { EntityKey } from '@/services/legal-reference/moduleMappingService';

export interface EntityLegalReferenceManagerProps {
  entityKey: EntityKey;
  countryCode: string;
  /** Tag filter passed to the selector (e.g. ['LG'] to scope to Legal refs). */
  selectorTags?: string[];
  /** Allowed mapping roles (default ['PRIMARY','SUPPORTING','REPEALED_BY']). */
  roles?: string[];
  title?: string;
}

export const EntityLegalReferenceManager: React.FC<EntityLegalReferenceManagerProps> = ({
  entityKey, countryCode, selectorTags, roles = ['PRIMARY', 'SUPPORTING', 'CITED'], title = 'Legal References',
}) => {
  const { data: mappings = [], isLoading } = useEntityLegalReferences(entityKey);
  const attach = useAttachLegalReference(entityKey);
  const detach = useDetachLegalReference(entityKey);
  const [open, setOpen] = useState(false);
  const [refId, setRefId] = useState<string | null>(null);
  const [role, setRole] = useState<string>(roles[0]);
  const [notes, setNotes] = useState('');

  const reset = () => { setRefId(null); setRole(roles[0]); setNotes(''); };

  const handleAttach = async () => {
    if (!refId) {
      toast.error('Pick a legal reference');
      return;
    }
    try {
      await attach.mutateAsync({ legalReferenceId: refId, role, notes: notes || undefined });
      toast.success('Reference attached');
      setOpen(false);
      reset();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Scale className="h-4 w-4" />{title}
        </CardTitle>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />Attach
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {mappings.map((m) => {
              const r = m.legal_reference;
              return (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-sm">{r?.ref_code ?? '—'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {r?.short_title ?? '—'}
                      {r?.ref_url && (
                        <a href={r.ref_url} target="_blank" rel="noopener noreferrer" aria-label="Open">
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{m.role}</Badge></TableCell>
                  <TableCell>
                    {r?.status && <Badge variant="secondary" className="text-[10px]">{r.status}</Badge>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{m.notes ?? ''}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Detach"
                      onClick={async () => {
                        if (!confirm('Detach this reference?')) return;
                        try { await detach.mutateAsync(m.id); toast.success('Detached'); }
                        catch (e: any) { toast.error(e.message); }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {!mappings.length && !isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                  No legal references attached.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Attach Legal Reference</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Reference *</Label>
              <LegalReferenceSelector
                value={refId}
                onChange={(id) => setRefId(id)}
                countryCode={countryCode}
                tags={selectorTags}
              />
            </div>
            <div>
              <Label>Role</Label>
              <select
                className="w-full h-9 border rounded-md px-2 text-sm bg-background"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                {roles.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Why this reference applies…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleAttach} disabled={attach.isPending}>Attach</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default EntityLegalReferenceManager;
