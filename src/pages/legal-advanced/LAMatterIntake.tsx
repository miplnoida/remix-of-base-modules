import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  useCreateMatter,
  useMatterTypes,
  useWorkbaskets,
} from '@/hooks/legal-advanced/useLegalAdvancedData';

const CATEGORIES = ['RECOVERY', 'ADVISORY', 'APPEAL', 'GOVERNANCE', 'INTERNAL_REVIEW', 'EXTERNAL_COUNSEL'];
const ORIGINS = [
  'BENEFITS','COMPLIANCE','FINANCE','HR','IT','PROCUREMENT','EMPLOYER_SERVICES',
  'IP_MANAGEMENT','EXECUTIVE_OFFICE','BOARD_SECRETARIAT','LEGAL_CREATED_OFFLINE','THIRD_PARTY_RECEIVED',
];
const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

export default function LAMatterIntake() {
  const navigate = useNavigate();
  const { data: matterTypes = [] } = useMatterTypes();
  const { data: workbaskets = [] } = useWorkbaskets();
  const createMatter = useCreateMatter();

  const [form, setForm] = useState({
    title: '',
    description: '',
    matter_type_id: '',
    category: 'ADVISORY',
    origin: 'LEGAL_CREATED_OFFLINE',
    priority: 'NORMAL',
    current_workbasket_id: '',
    source_module: '',
    source_ref_no: '',
    due_date: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: '' }));
  };

  const submit = async () => {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    if (!form.category) errs.category = 'Category is required';
    if (!form.origin) errs.origin = 'Origin is required';
    if (Object.keys(errs).length) {
      setErrors(errs);
      toast.error('Please check the form for valid information!', { description: Object.values(errs)[0] });
      return;
    }
    try {
      const res = await createMatter.mutateAsync({
        title: form.title.trim(),
        description: form.description.trim() || null,
        matter_type_id: form.matter_type_id || null,
        category: form.category,
        origin: form.origin,
        priority: form.priority,
        current_workbasket_id: form.current_workbasket_id || null,
        source_module: form.source_module.trim() || null,
        source_ref_no: form.source_ref_no.trim() || null,
        due_date: form.due_date || null,
      });
      toast.success(`Matter ${res.matter_no} created`);
      navigate(`/legal-advanced/matters/${res.id}`);
    } catch (e: any) {
      toast.error('Failed to create matter', { description: e?.message });
    }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">New Matter</h1>
        <p className="text-sm text-muted-foreground">Create a new legal matter</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Matter Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input value={form.title} onChange={(e) => set('title', e.target.value)} />
            {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={4} value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={(v) => set('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Matter Type</Label>
              <Select value={form.matter_type_id} onValueChange={(v) => set('matter_type_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {matterTypes.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Origin *</Label>
              <Select value={form.origin} onValueChange={(v) => set('origin', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ORIGINS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => set('priority', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Initial Workbasket</Label>
              <Select value={form.current_workbasket_id} onValueChange={(v) => set('current_workbasket_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select workbasket" /></SelectTrigger>
                <SelectContent>
                  {workbaskets.map((w: any) => (
                    <SelectItem key={w.id} value={w.id}>{w.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={form.due_date} onChange={(e) => set('due_date', e.target.value)} />
            </div>
            <div>
              <Label>Source Module</Label>
              <Input value={form.source_module} onChange={(e) => set('source_module', e.target.value)} placeholder="e.g. COMPLIANCE" />
            </div>
            <div>
              <Label>Source Reference No</Label>
              <Input value={form.source_ref_no} onChange={(e) => set('source_ref_no', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate('/legal-advanced/matters')}>Cancel</Button>
        <Button onClick={submit} disabled={createMatter.isPending}>
          {createMatter.isPending ? 'Creating…' : 'Create Matter'}
        </Button>
      </div>
    </div>
  );
}
