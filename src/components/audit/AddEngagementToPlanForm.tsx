import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useIADepartments, useIADepartmentFunctions, useIAAuditors } from '@/hooks/useAuditData';

const ENGAGEMENT_TYPES = ['Planned Audit', 'Ad-hoc Audit', 'Management Requested Audit', 'Special Investigation', 'Follow-up Audit'];
const RISK_RATINGS = ['Critical', 'High', 'Medium', 'Low'];

interface AddEngagementToPlanFormProps {
  planId: string;
  onSave: (payload: any) => void;
  isSaving?: boolean;
}

export function AddEngagementToPlanForm({ planId, onSave, isSaving }: AddEngagementToPlanFormProps) {
  const { data: departments = [] } = useIADepartments();
  const { data: auditors = [] } = useIAAuditors();
  const [form, setForm] = useState({
    engagement_name: '',
    department_id: '',
    function_id: '',
    engagement_type: 'Planned Audit',
    engagement_risk_rating: 'Medium',
    planned_start_date: '',
    planned_end_date: '',
    lead_auditor_id: '',
    supportive_auditor_ids: [] as string[],
    scope: '',
  });

  const { data: deptFunctions = [] } = useIADepartmentFunctions(form.department_id || undefined);

  const toggleAuditor = (id: string) => {
    setForm(f => ({
      ...f,
      supportive_auditor_ids: f.supportive_auditor_ids.includes(id)
        ? f.supportive_auditor_ids.filter(x => x !== id)
        : [...f.supportive_auditor_ids, id],
    }));
  };

  const generateCode = () => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    return `ENG-${dateStr}-${String(Math.floor(1000 + Math.random() * 9000))}`;
  };

  const handleSubmit = () => {
    if (!form.engagement_name.trim()) return;
    onSave({
      engagement_name: form.engagement_name,
      engagement_code: generateCode(),
      annual_plan_id: planId,
      department_id: form.department_id || null,
      function_id: form.function_id || null,
      engagement_type: form.engagement_type,
      engagement_risk_rating: form.engagement_risk_rating,
      planned_start_date: form.planned_start_date || null,
      planned_end_date: form.planned_end_date || null,
      lead_auditor_id: form.lead_auditor_id || null,
      supportive_auditor_ids: form.supportive_auditor_ids,
      scope: form.scope,
      status: 'Planned',
    });
  };

  // Expose handleSubmit via ref-like pattern using useImperativeHandle alternative
  // Instead, parent will call onSave - we need a way to trigger. Use a data attribute trick.
  // Actually, let's just expose the submit via a callback prop pattern.

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Engagement Title *</Label>
          <Input value={form.engagement_name} onChange={e => setForm(f => ({ ...f, engagement_name: e.target.value }))} placeholder="e.g. IT Security Audit" />
        </div>
        <div>
          <Label>Engagement Type</Label>
          <Select value={form.engagement_type} onValueChange={v => setForm(f => ({ ...f, engagement_type: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ENGAGEMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Department</Label>
          <Select value={form.department_id} onValueChange={v => setForm(f => ({ ...f, department_id: v, function_id: '' }))}>
            <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
            <SelectContent>{departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Function</Label>
          <Select value={form.function_id} onValueChange={v => setForm(f => ({ ...f, function_id: v }))} disabled={!form.department_id}>
            <SelectTrigger><SelectValue placeholder={form.department_id ? 'Select function' : 'Select department first'} /></SelectTrigger>
            <SelectContent>{deptFunctions.map((fn: any) => <SelectItem key={fn.id} value={fn.id}>{fn.function_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Risk Rating</Label>
          <Select value={form.engagement_risk_rating} onValueChange={v => setForm(f => ({ ...f, engagement_risk_rating: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{RISK_RATINGS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Lead Auditor</Label>
          <Select value={form.lead_auditor_id} onValueChange={v => setForm(f => ({ ...f, lead_auditor_id: v }))}>
            <SelectTrigger><SelectValue placeholder="Select lead auditor" /></SelectTrigger>
            <SelectContent>{(auditors || []).map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Planned Start Date</Label>
          <Input type="date" value={form.planned_start_date} onChange={e => setForm(f => ({ ...f, planned_start_date: e.target.value }))} />
        </div>
        <div>
          <Label>Planned End Date</Label>
          <Input type="date" value={form.planned_end_date} onChange={e => setForm(f => ({ ...f, planned_end_date: e.target.value }))} />
        </div>
      </div>

      <div>
        <Label>Supportive Auditor(s)</Label>
        <div className="border rounded-md p-2 max-h-[100px] overflow-y-auto space-y-1 bg-background">
          {(auditors || []).filter((a: any) => a.id !== form.lead_auditor_id).map((a: any) => (
            <label key={a.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted rounded px-1 py-0.5">
              <Checkbox checked={form.supportive_auditor_ids.includes(a.id)} onCheckedChange={() => toggleAuditor(a.id)} />
              {a.name}
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label>Scope / Description</Label>
        <Textarea value={form.scope} onChange={e => setForm(f => ({ ...f, scope: e.target.value }))} placeholder="Describe the scope of this engagement..." rows={3} />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground h-10 px-4 py-2 hover:bg-primary/90 disabled:opacity-50"
          onClick={handleSubmit}
          disabled={isSaving || !form.engagement_name.trim()}
        >
          {isSaving ? 'Saving...' : 'Add Engagement'}
        </button>
      </div>
    </div>
  );
}
