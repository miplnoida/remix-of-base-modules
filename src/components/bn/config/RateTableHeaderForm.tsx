/**
 * RateTableHeaderForm — create/edit dialog for a bn_rate_table header + its dimensions.
 * Used from CalculationSetup "New table" button. Saves header + dimensions atomically
 * (header first, then dims). On success calls onSaved with the new table id.
 */
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Loader2, Save } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { requireUserCode } from '@/lib/bn/requireUserCode';
import { clearRateTableCache } from '@/services/bn/calc/rateTableLookup';

const db = supabase as any;

const TABLE_TYPES = ['TIER', 'RATE_TABLE', 'MATRIX', 'CAP_TABLE', 'SHARE_TABLE', 'CONDITION_TABLE'] as const;
const MATCH_TYPES = ['RANGE', 'EXACT', 'IN'] as const;
const LOOKUP_MODES = ['SINGLE', 'COMPOSITE'] as const;

interface DimDraft {
  id?: string;
  dimension_key: string;
  dimension_label: string;
  dimension_type: string;
  match_type: 'RANGE' | 'EXACT' | 'IN';
  sequence_no: number;
  _dirty?: boolean;
  _new?: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  rateTableId?: string | null;
  onSaved?: (id: string) => void;
}

export function RateTableHeaderForm({ open, onClose, rateTableId, onSaved }: Props) {
  const { profile } = useSupabaseAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [header, setHeader] = useState({
    table_code: '', table_name: '', table_type: 'TIER' as string,
    lookup_mode: 'SINGLE' as string, country_code: 'KN', version_no: 1,
    status: 'DRAFT', description: '', effective_from: '',
  });
  const [dims, setDims] = useState<DimDraft[]>([]);

  useEffect(() => {
    if (!open) return;
    if (!rateTableId) {
      setHeader({ table_code: '', table_name: '', table_type: 'TIER', lookup_mode: 'SINGLE',
        country_code: 'KN', version_no: 1, status: 'DRAFT', description: '', effective_from: '' });
      setDims([]);
      return;
    }
    let alive = true;
    (async () => {
      setLoading(true);
      const [h, d] = await Promise.all([
        db.from('bn_rate_table').select('*').eq('id', rateTableId).single(),
        db.from('bn_rate_table_dimension').select('*').eq('rate_table_id', rateTableId).order('sequence_no'),
      ]);
      if (!alive) return;
      if (h.data) setHeader({
        table_code: h.data.table_code, table_name: h.data.table_name, table_type: h.data.table_type,
        lookup_mode: h.data.lookup_mode, country_code: h.data.country_code, version_no: h.data.version_no,
        status: h.data.status, description: h.data.description ?? '', effective_from: h.data.effective_from ?? '',
      });
      setDims((d.data ?? []) as DimDraft[]);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [open, rateTableId]);

  const addDim = () => setDims((arr) => [...arr, {
    dimension_key: '', dimension_label: '', dimension_type: 'NUMBER',
    match_type: 'RANGE', sequence_no: (arr[arr.length - 1]?.sequence_no ?? 0) + 1,
    _new: true, _dirty: true,
  }]);

  const updateDim = (idx: number, patch: Partial<DimDraft>) =>
    setDims((arr) => arr.map((d, i) => i === idx ? { ...d, ...patch, _dirty: true } : d));

  const removeDim = async (idx: number) => {
    const d = dims[idx];
    if (d.id) {
      const { error } = await db.from('bn_rate_table_dimension').delete().eq('id', d.id);
      if (error) { toast.error(error.message); return; }
    }
    setDims((arr) => arr.filter((_, i) => i !== idx));
  };

  const save = async () => {
    let userCode: string;
    try { userCode = requireUserCode(profile?.user_code, 'save rate table'); }
    catch (e: any) { toast.error(e.message); return; }
    if (!header.table_code || !header.table_name) { toast.error('Code and name are required'); return; }
    setSaving(true);
    try {
      let id = rateTableId;
      const payload = {
        table_code: header.table_code, table_name: header.table_name, table_type: header.table_type,
        lookup_mode: header.lookup_mode, country_code: header.country_code, version_no: header.version_no,
        status: header.status, description: header.description || null,
        effective_from: header.effective_from || null, modified_by: userCode,
      };
      if (!id) {
        const { data, error } = await db.from('bn_rate_table').insert({ ...payload, entered_by: userCode }).select('id').single();
        if (error) throw error;
        id = data.id;
      } else {
        const { error } = await db.from('bn_rate_table').update(payload).eq('id', id);
        if (error) throw error;
      }
      for (const d of dims.filter((x) => x._dirty)) {
        const dPayload = {
          rate_table_id: id, dimension_key: d.dimension_key, dimension_label: d.dimension_label,
          dimension_type: d.dimension_type, match_type: d.match_type, sequence_no: d.sequence_no,
        };
        if (d._new || !d.id) {
          const { error } = await db.from('bn_rate_table_dimension').insert(dPayload);
          if (error) throw error;
        } else {
          const { error } = await db.from('bn_rate_table_dimension').update(dPayload).eq('id', d.id);
          if (error) throw error;
        }
      }
      clearRateTableCache();
      toast.success('Saved');
      onSaved?.(id!);
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{rateTableId ? 'Edit Rate Table' : 'New Rate Table'}</DialogTitle></DialogHeader>
        {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Code *</Label><Input value={header.table_code} onChange={(e) => setHeader({ ...header, table_code: e.target.value.toUpperCase() })} placeholder="AGE_PENSION_RATE_TABLE" /></div>
              <div><Label>Name *</Label><Input value={header.table_name} onChange={(e) => setHeader({ ...header, table_name: e.target.value })} /></div>
              <div>
                <Label>Type</Label>
                <Select value={header.table_type} onValueChange={(v) => setHeader({ ...header, table_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TABLE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Lookup mode</Label>
                <Select value={header.lookup_mode} onValueChange={(v) => setHeader({ ...header, lookup_mode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LOOKUP_MODES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Country</Label><Input value={header.country_code} onChange={(e) => setHeader({ ...header, country_code: e.target.value.toUpperCase() })} /></div>
              <div><Label>Version</Label><Input type="number" value={header.version_no} onChange={(e) => setHeader({ ...header, version_no: Number(e.target.value) })} /></div>
              <div>
                <Label>Status</Label>
                <Select value={header.status} onValueChange={(v) => setHeader({ ...header, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['DRAFT', 'ACTIVE', 'RETIRED'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Effective from</Label><Input type="date" value={header.effective_from} onChange={(e) => setHeader({ ...header, effective_from: e.target.value })} /></div>
            </div>
            <div><Label>Description</Label><Input value={header.description} onChange={(e) => setHeader({ ...header, description: e.target.value })} /></div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Dimensions</Label>
                <Button size="sm" variant="outline" onClick={addDim}><Plus className="h-4 w-4 mr-1" />Add dimension</Button>
              </div>
              <div className="border rounded-md">
                <Table>
                  <TableHeader><TableRow><TableHead>Seq</TableHead><TableHead>Key</TableHead><TableHead>Label</TableHead><TableHead>Type</TableHead><TableHead>Match</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {dims.map((d, idx) => (
                      <TableRow key={d.id ?? `n-${idx}`} className={d._dirty ? 'bg-accent/30' : ''}>
                        <TableCell><Input type="number" value={d.sequence_no} onChange={(e) => updateDim(idx, { sequence_no: Number(e.target.value) })} className="h-8 w-14" /></TableCell>
                        <TableCell><Input value={d.dimension_key} onChange={(e) => updateDim(idx, { dimension_key: e.target.value })} className="h-8 font-mono text-xs" /></TableCell>
                        <TableCell><Input value={d.dimension_label} onChange={(e) => updateDim(idx, { dimension_label: e.target.value })} className="h-8" /></TableCell>
                        <TableCell><Input value={d.dimension_type} onChange={(e) => updateDim(idx, { dimension_type: e.target.value.toUpperCase() })} className="h-8 w-24" /></TableCell>
                        <TableCell>
                          <Select value={d.match_type} onValueChange={(v) => updateDim(idx, { match_type: v as any })}>
                            <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
                            <SelectContent>{MATCH_TYPES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeDim(idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                      </TableRow>
                    ))}
                    {!dims.length && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-4 text-sm">No dimensions yet</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
