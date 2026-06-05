import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBnWorkflowTemplates } from '@/hooks/bn/useBnConfig';
import { useBnProductVersion, useUpdateBnProductVersion } from '@/hooks/bn/useBnProduct';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { ReadOnlyVersionBanner } from './ReadOnlyVersionBanner';

interface Props { versionId: string | undefined; isReadOnly?: boolean; versionStatus?: string | null; }

export function WorkflowTab({ versionId, isReadOnly, versionStatus }: Props) {
  const { toast } = useToast();
  const { data: version } = useBnProductVersion(versionId);
  const { data: templates = [] } = useBnWorkflowTemplates();
  const updateMutation = useUpdateBnProductVersion();
  const [form, setForm] = useState({ workflow_template_id: '', requires_employer_verification: false, requires_medical_board_review: false, requires_means_test: false });

  useEffect(() => {
    if (version) setForm({
      workflow_template_id: version.workflow_template_id || '',
      requires_employer_verification: version.requires_employer_verification,
      requires_medical_board_review: version.requires_medical_board_review,
      requires_means_test: version.requires_means_test,
    });
  }, [version]);

  if (!versionId) return <Card><CardContent className="py-8 text-center text-muted-foreground">Select or create a product version first.</CardContent></Card>;

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({ id: versionId, updates: form as any });
      toast({ title: 'Saved', description: 'Workflow settings updated.' });
    } catch (err: any) { toast({ title: 'Error', description: err?.message, variant: 'destructive' }); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div><CardTitle>Workflow Configuration</CardTitle><CardDescription>Assign workflow templates and processing flags for this version</CardDescription></div>
        <Button onClick={handleSave} disabled={updateMutation.isPending} className="gap-2"><Save className="h-4 w-4" /> Save</Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2 max-w-md">
          <Label>Workflow Template</Label>
          <Select value={form.workflow_template_id || '__none__'} onValueChange={v => setForm(p => ({ ...p, workflow_template_id: v === '__none__' ? '' : v }))}>
            <SelectTrigger><SelectValue placeholder="Select workflow template" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {templates.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.template_name} ({t.template_code})</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Links to the workflow definition used for claim processing</p>
        </div>
        <div className="space-y-4 rounded-lg border p-4">
          <h4 className="text-sm font-semibold">Processing Flags</h4>
          <div className="flex items-center justify-between"><Label>Requires Employer Verification</Label><Switch checked={form.requires_employer_verification} onCheckedChange={v => setForm(p => ({ ...p, requires_employer_verification: v }))} /></div>
          <div className="flex items-center justify-between"><Label>Requires Medical Board Review</Label><Switch checked={form.requires_medical_board_review} onCheckedChange={v => setForm(p => ({ ...p, requires_medical_board_review: v }))} /></div>
          <div className="flex items-center justify-between"><Label>Requires Means Test</Label><Switch checked={form.requires_means_test} onCheckedChange={v => setForm(p => ({ ...p, requires_means_test: v }))} /></div>
        </div>
      </CardContent>
    </Card>
  );
}
