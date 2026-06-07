/**
 * Reference Sequences Admin
 * --------------------------
 * Super-admin screen to view and edit `system_reference_sequence` rows.
 * Lets ops create/update sequences used by the central reference number
 * service (e.g. BN/LETTER/2026/000001).
 */
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, RefreshCw } from 'lucide-react';

const db = supabase as any;

interface Sequence {
  id?: string;
  module_code: string;
  department_code: string;
  document_type: string;
  prefix_pattern: string;
  padding: number;
  financial_year: number;
  current_number: number;
  active: boolean;
  description?: string;
}

const empty: Sequence = {
  module_code: '', department_code: '', document_type: '',
  prefix_pattern: '{MODULE}/{DOC_TYPE}/{YYYY}/{SEQ}', padding: 6,
  financial_year: new Date().getFullYear(), current_number: 0, active: true,
};

const ReferenceSequencesAdmin: React.FC = () => {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Sequence | null>(null);

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ['system-reference-sequences'],
    queryFn: async () => {
      const { data, error } = await db.from('system_reference_sequence')
        .select('*').order('module_code').order('document_type').order('financial_year', { ascending: false });
      if (error) throw error;
      return data as Sequence[];
    },
  });

  const save = async () => {
    if (!editing) return;
    const payload = { ...editing };
    const { error } = payload.id
      ? await db.from('system_reference_sequence').update(payload).eq('id', payload.id)
      : await db.from('system_reference_sequence').insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success('Sequence saved');
    setEditing(null);
    qc.invalidateQueries({ queryKey: ['system-reference-sequences'] });
  };

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reference Number Sequences</h1>
          <p className="text-muted-foreground text-sm">Central allocator for letter / notice / document reference numbers used across modules.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}><RefreshCw className="w-4 h-4 mr-2"/>Refresh</Button>
          <Button onClick={() => setEditing({ ...empty })}><Plus className="w-4 h-4 mr-2"/>New Sequence</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Configured sequences</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p>Loading…</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Module</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Document Type</TableHead>
                  <TableHead>FY</TableHead>
                  <TableHead>Pattern</TableHead>
                  <TableHead className="text-right">Current</TableHead>
                  <TableHead className="text-right">Padding</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono">{r.module_code}</TableCell>
                    <TableCell>{r.department_code}</TableCell>
                    <TableCell>{r.document_type}</TableCell>
                    <TableCell>{r.financial_year}</TableCell>
                    <TableCell className="text-xs font-mono">{r.prefix_pattern}</TableCell>
                    <TableCell className="text-right">{r.current_number}</TableCell>
                    <TableCell className="text-right">{r.padding}</TableCell>
                    <TableCell>{r.active ? 'Yes' : 'No'}</TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={() => setEditing({ ...r })}><Pencil className="w-4 h-4"/></Button></TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">No sequences configured.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? 'Edit sequence' : 'New sequence'}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Module Code</Label><Input value={editing.module_code} onChange={(e) => setEditing({ ...editing, module_code: e.target.value.toUpperCase() })}/></div>
              <div><Label>Department Code</Label><Input value={editing.department_code} onChange={(e) => setEditing({ ...editing, department_code: e.target.value.toUpperCase() })}/></div>
              <div className="col-span-2"><Label>Document Type</Label><Input value={editing.document_type} onChange={(e) => setEditing({ ...editing, document_type: e.target.value.toUpperCase() })}/></div>
              <div className="col-span-2"><Label>Prefix Pattern</Label><Input value={editing.prefix_pattern} onChange={(e) => setEditing({ ...editing, prefix_pattern: e.target.value })}/>
                <p className="text-xs text-muted-foreground mt-1">Tokens: {'{MODULE} {DEPT} {DOC_TYPE} {YYYY} {SEQ}'}</p>
              </div>
              <div><Label>Financial Year</Label><Input type="number" value={editing.financial_year} onChange={(e) => setEditing({ ...editing, financial_year: Number(e.target.value) })}/></div>
              <div><Label>Padding</Label><Input type="number" value={editing.padding} onChange={(e) => setEditing({ ...editing, padding: Number(e.target.value) })}/></div>
              <div><Label>Current Number</Label><Input type="number" value={editing.current_number} onChange={(e) => setEditing({ ...editing, current_number: Number(e.target.value) })}/></div>
              <div className="flex items-center gap-2 pt-6"><Switch checked={editing.active} onCheckedChange={(c) => setEditing({ ...editing, active: c })}/> <span>Active</span></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReferenceSequencesAdmin;
