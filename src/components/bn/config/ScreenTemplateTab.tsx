import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useBnScreenTemplates } from '@/hooks/bn/useBnConfig';
import { useBnProductVersion, useUpdateBnProductVersion } from '@/hooks/bn/useBnProduct';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Save, Monitor } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';

interface Props { versionId: string | undefined; }

export function ScreenTemplateTab({ versionId }: Props) {
  const { toast } = useToast();
  const { data: version } = useBnProductVersion(versionId);
  const { data: templates = [] } = useBnScreenTemplates();
  const updateMutation = useUpdateBnProductVersion();
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    if (version?.screen_template_id) setSelectedId(version.screen_template_id);
  }, [version]);

  if (!versionId) return <Card><CardContent className="py-8 text-center text-muted-foreground">Select or create a product version first.</CardContent></Card>;

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({ id: versionId, updates: { screen_template_id: selectedId || null } as any });
      toast({ title: 'Saved', description: 'Screen template assigned.' });
    } catch (err: any) { toast({ title: 'Error', description: err?.message, variant: 'destructive' }); }
  };

  const selected = templates.find((t: any) => t.id === selectedId);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div><CardTitle>Screen Template & Field Metadata</CardTitle><CardDescription>Assign the dynamic intake form template for this benefit version</CardDescription></div>
        <Button onClick={handleSave} disabled={updateMutation.isPending} className="gap-2"><Save className="h-4 w-4" /> Save</Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2 max-w-md">
          <Label>Screen Template</Label>
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger><SelectValue placeholder="Select screen template" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {templates.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.template_name} ({t.template_code})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {selected && (
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2"><Monitor className="h-4 w-4 text-muted-foreground" /><span className="font-medium">{selected.template_name}</span><Badge variant="outline">{selected.layout_type}</Badge></div>
            {selected.description && <p className="text-sm text-muted-foreground">{selected.description}</p>}
            <div>
              <Label className="text-xs font-semibold">Sections</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {(selected.sections as any[] || []).map((s: any, i: number) => (
                  <Badge key={i} variant="secondary">{s.label || s.code || `Section ${i + 1}`}</Badge>
                ))}
              </div>
            </div>
          </div>
        )}
        <p className="text-sm text-muted-foreground">Screen templates and field metadata can be managed from the <strong>Configuration → Screen Templates</strong> admin page. Assign the appropriate template to this version to control the intake form layout.</p>
      </CardContent>
    </Card>
  );
}
