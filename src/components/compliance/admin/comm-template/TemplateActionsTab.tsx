import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  COMMUNICATION_ACTIONS,
  ACTION_GROUP_LABELS,
  type ActionGroup,
} from '@/lib/audit/communicationActions';
import { auditCommunicationTemplateActionsService } from '@/services/auditCommunicationTemplateActionsService';
import type { AuditCommunicationTemplateAction, CeCommActionKey } from '@/types/auditCommunication';

export default function TemplateActionsTab({ templateId }: { templateId: string | null }) {
  const [rows, setRows] = useState<AuditCommunicationTemplateAction[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!templateId) return;
    setLoading(true);
    try { setRows(await auditCommunicationTemplateActionsService.listForTemplate(templateId)); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [templateId]);

  if (!templateId) {
    return <p className="text-sm text-muted-foreground">Save the template first to configure actions.</p>;
  }

  const byKey = (k: CeCommActionKey) => rows.find(r => r.action_key === k);

  const setEnabled = async (k: CeCommActionKey, enabled: boolean) => {
    try { await auditCommunicationTemplateActionsService.setEnabled(templateId, k, enabled); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const setConfig = async (k: CeCommActionKey, cfg: Record<string, unknown>) => {
    try { await auditCommunicationTemplateActionsService.updateConfig(templateId, k, cfg); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const groups: ActionGroup[] = ['attachments', 'recipient_behavior', 'response', 'workflow'];

  return (
    <div className="space-y-4">
      {loading && <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>}
      {groups.map(g => {
        const defs = COMMUNICATION_ACTIONS.filter(a => a.group === g);
        return (
          <Card key={g}>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-3">{ACTION_GROUP_LABELS[g]}</h3>
              <div className="space-y-3">
                {defs.map(def => {
                  const row = byKey(def.key);
                  const enabled = !!row?.is_enabled;
                  const cfg: any = row?.config_json || def.defaultConfig || {};
                  return (
                    <div key={def.key} className="border rounded p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <Label className="font-medium">{def.label}</Label>
                          <p className="text-xs text-muted-foreground">{def.description}</p>
                        </div>
                        <Switch checked={enabled} onCheckedChange={(v) => setEnabled(def.key, v)} />
                      </div>
                      {enabled && def.key === 'trigger_followup_reminder' && (
                        <div className="mt-2 flex items-center gap-2">
                          <Label className="text-xs">Offset days</Label>
                          <Input type="number" className="w-24 h-8" value={cfg.offset_days ?? 7}
                            onChange={(e) => setConfig(def.key, { ...cfg, offset_days: Number(e.target.value) })} />
                        </div>
                      )}
                      {enabled && def.key === 'assign_response_review_workflow' && (
                        <div className="mt-2 flex items-center gap-2">
                          <Label className="text-xs">Workflow code</Label>
                          <Input className="w-64 h-8" value={cfg.workflow_code ?? ''}
                            onChange={(e) => setConfig(def.key, { ...cfg, workflow_code: e.target.value })} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
