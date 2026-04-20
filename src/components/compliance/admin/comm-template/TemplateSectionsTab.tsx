import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { auditCommunicationTemplateService } from '@/services/auditCommunicationTemplateService';
import type { AuditCommunicationTemplateSection } from '@/types/auditCommunication';

export default function TemplateSectionsTab({ templateId }: { templateId: string | null }) {
  const [sections, setSections] = useState<AuditCommunicationTemplateSection[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!templateId) return;
    setLoading(true);
    try { setSections(await auditCommunicationTemplateService.listSections(templateId)); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [templateId]);

  if (!templateId) {
    return <p className="text-sm text-muted-foreground">Save the template first to manage sections.</p>;
  }

  const save = async (s: Partial<AuditCommunicationTemplateSection>) => {
    try { await auditCommunicationTemplateService.upsertSection({ ...s, template_id: templateId }); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this section?')) return;
    try { await auditCommunicationTemplateService.deleteSection(id); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const target = sections[idx + dir];
    if (!target) return;
    const a = sections[idx];
    await Promise.all([
      auditCommunicationTemplateService.upsertSection({ ...a, sort_order: target.sort_order }),
      auditCommunicationTemplateService.upsertSection({ ...target, sort_order: a.sort_order }),
    ]);
    load();
  };

  const add = () => save({
    section_key: `section_${Date.now()}`,
    section_label: 'New section',
    body_html: '',
    sort_order: (sections[sections.length - 1]?.sort_order ?? 0) + 10,
    is_enabled: true,
  });

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Reusable content blocks rendered into the email body.</p>
        <Button size="sm" onClick={add}><Plus className="h-4 w-4 mr-1" /> Add section</Button>
      </div>
      {loading && <p className="text-sm">Loading…</p>}
      {!loading && sections.length === 0 && <p className="text-sm text-muted-foreground">No sections yet.</p>}
      {sections.map((s, idx) => (
        <Card key={s.id}>
          <CardContent className="pt-4 space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <Label>Section key</Label>
                <Input value={s.section_key} onChange={(e) => save({ ...s, section_key: e.target.value })} />
              </div>
              <div>
                <Label>Label</Label>
                <Input value={s.section_label || ''} onChange={(e) => save({ ...s, section_label: e.target.value })} />
              </div>
              <div className="flex items-end gap-2">
                <Switch checked={s.is_enabled} onCheckedChange={(v) => save({ ...s, is_enabled: v })} />
                <Label>Enabled</Label>
                <div className="ml-auto flex gap-1">
                  <Button size="icon" variant="ghost" disabled={idx === 0} onClick={() => move(idx, -1)}><ArrowUp className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" disabled={idx === sections.length - 1} onClick={() => move(idx, 1)}><ArrowDown className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
            <div>
              <Label>Body</Label>
              <Textarea rows={4} value={s.body_html || ''} onChange={(e) => save({ ...s, body_html: e.target.value })} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
