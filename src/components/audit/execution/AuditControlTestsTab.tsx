import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, Eye, Edit, Shield } from 'lucide-react';
import { StatusBadge, DataTable, StandardModal } from '@/components/common';
import type { DataTableColumn } from '@/components/common';
import { useEngagementControlTests } from '@/hooks/useEngagementData';
import { AuditEmptyState } from '@/components/audit/workspace/AuditEmptyState';
import { formatDateForDisplay } from '@/lib/format-config';
import { useUserCode } from '@/hooks/useUserCode';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

const TEST_RESULTS = ['Effective', 'Partially Effective', 'Ineffective', 'Not Tested'];

const emptyForm = {
  rcm_control_id: '', sample_size: '', exceptions_found: '', result: 'Not Tested',
  remarks: '', test_date: '', tested_by: '', reviewed_by: '',
};

interface AuditControlTestsTabProps {
  auditId: string;
}

export function AuditControlTestsTab({ auditId }: AuditControlTestsTabProps) {
  const { data: tests = [], isLoading } = useEngagementControlTests(auditId);
  const { userCode } = useUserCode();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [modal, setModal] = useState<{ mode: 'create' | 'edit' | 'view' | null; record?: any }>({ mode: null });
  const [form, setForm] = useState(emptyForm);

  const createMutation = useMutation({
    mutationFn: async (t: any) => { const { data, error } = await supabase.from('ia_control_tests' as any).insert(t).select().single(); if (error) throw error; return data; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['eng_control_tests'] }); toast({ title: 'Control Test Created' }); setModal({ mode: null }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...u }: any) => { const { data, error } = await supabase.from('ia_control_tests' as any).update(u).eq('id', id).select().single(); if (error) throw error; return data; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['eng_control_tests'] }); toast({ title: 'Control Test Updated' }); setModal({ mode: null }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const openCreate = () => { setForm({ ...emptyForm, tested_by: userCode || '', test_date: new Date().toISOString().split('T')[0] }); setModal({ mode: 'create' }); };
  const openEdit = (r: any) => {
    setForm({
      rcm_control_id: r.rcm_control_id || '', sample_size: r.sample_size?.toString() || '',
      exceptions_found: r.exceptions_found?.toString() || '', result: r.result || 'Not Tested',
      remarks: r.remarks || '', test_date: r.test_date || '', tested_by: r.tested_by || '', reviewed_by: r.reviewer_id || '',
    });
    setModal({ mode: 'edit', record: r });
  };
  const openView = (r: any) => { openEdit(r); setModal({ mode: 'view', record: r }); };

  const handleSave = () => {
    const payload = {
      engagement_id: auditId, rcm_control_id: form.rcm_control_id || null,
      sample_size: form.sample_size ? parseInt(form.sample_size) : null,
      exceptions_found: form.exceptions_found ? parseInt(form.exceptions_found) : null,
      result: form.result, remarks: form.remarks || null,
      test_date: form.test_date || null, tested_by: form.tested_by || null,
      reviewer_id: form.reviewed_by || null,
    };
    if (modal.mode === 'create') {
      createMutation.mutate({ ...payload, created_by: userCode || null });
    } else if (modal.mode === 'edit' && modal.record) {
      updateMutation.mutate({ id: modal.record.id, ...payload, updated_by: userCode || null });
    }
  };

  const resultColor = (result: string) => {
    if (result === 'Effective') return 'text-primary';
    if (result === 'Partially Effective') return 'text-amber-600';
    if (result === 'Ineffective') return 'text-destructive';
    return 'text-muted-foreground';
  };

  const columns: DataTableColumn<any>[] = [
    { key: 'rcm_control_id', header: 'Control', render: (r) => <span className="text-sm font-mono">{r.rcm_control_id?.slice(0, 12) || '—'}</span> },
    { key: 'sample_size', header: 'Sample Size', render: (r) => <span className="text-sm">{r.sample_size ?? '—'}</span> },
    { key: 'exceptions_found', header: 'Exceptions', render: (r) => <span className={`text-sm font-medium ${(r.exceptions_found || 0) > 0 ? 'text-destructive' : ''}`}>{r.exceptions_found ?? '—'}</span> },
    { key: 'result', header: 'Result', render: (r) => <span className={`text-sm font-medium ${resultColor(r.result || '')}`}>{r.result || '—'}</span> },
    { key: 'tested_by', header: 'Tested By', render: (r) => <span className="text-xs">{r.tested_by || '—'}</span> },
    { key: 'test_date', header: 'Date', render: (r) => r.test_date ? formatDateForDisplay(r.test_date) : '—' },
  ];

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{tests.length} control test(s)</p>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Add Control Test</Button>
      </div>

      {tests.length === 0 ? (
        <AuditEmptyState icon={Shield} title="No control tests recorded"
          description="Control tests evaluate the design and operating effectiveness of internal controls within the audit scope."
          actionLabel="Add Control Test" onAction={openCreate} />
      ) : (
        <Card><CardContent className="pt-4">
          <DataTable columns={columns} data={tests} emptyMessage="No control tests."
            renderActions={(row) => (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openView(row); }}><Eye className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEdit(row); }}><Edit className="h-3.5 w-3.5" /></Button>
              </div>
            )}
          />
        </CardContent></Card>
      )}

      <StandardModal open={modal.mode !== null} onOpenChange={() => setModal({ mode: null })}
        title={modal.mode === 'create' ? 'New Control Test' : modal.mode === 'edit' ? 'Edit Control Test' : 'Control Test Detail'}
        mode={modal.mode === 'view' ? 'view' : modal.mode || 'create'} onSave={handleSave}
        saveLabel="Save" isSaving={createMutation.isPending || updateMutation.isPending} size="3xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Control Reference</Label><Input value={form.rcm_control_id} onChange={e => setForm(f => ({ ...f, rcm_control_id: e.target.value }))} disabled={modal.mode === 'view'} placeholder="Control ID from RCM" /></div>
            <div><Label>Test Result</Label>
              <Select value={form.result} onValueChange={v => setForm(f => ({ ...f, result: v }))} disabled={modal.mode === 'view'}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TEST_RESULTS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Sample Size</Label><Input type="number" value={form.sample_size} onChange={e => setForm(f => ({ ...f, sample_size: e.target.value }))} disabled={modal.mode === 'view'} /></div>
            <div><Label>Exceptions Found</Label><Input type="number" value={form.exceptions_found} onChange={e => setForm(f => ({ ...f, exceptions_found: e.target.value }))} disabled={modal.mode === 'view'} /></div>
          </div>
          <div><Label>Remarks</Label><Textarea value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} rows={4} disabled={modal.mode === 'view'} className="text-sm leading-relaxed" placeholder="Test procedures, observations, and conclusions" /></div>
          <div className="grid grid-cols-3 gap-4">
            <div><Label>Test Date</Label><Input type="date" value={form.test_date} onChange={e => setForm(f => ({ ...f, test_date: e.target.value }))} disabled={modal.mode === 'view'} /></div>
            <div><Label>Tested By</Label><Input value={form.tested_by} onChange={e => setForm(f => ({ ...f, tested_by: e.target.value }))} disabled={modal.mode === 'view'} /></div>
            <div><Label>Reviewer</Label><Input value={form.reviewed_by} onChange={e => setForm(f => ({ ...f, reviewed_by: e.target.value }))} disabled={modal.mode === 'view'} /></div>
          </div>
        </div>
      </StandardModal>
    </div>
  );
}
