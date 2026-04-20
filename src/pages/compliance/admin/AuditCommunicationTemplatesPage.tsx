import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { auditCommunicationTemplateService } from '@/services/auditCommunicationTemplateService';
import type { AuditCommunicationTemplate } from '@/types/auditCommunication';
import { COMM_CATEGORY_LABELS } from '@/types/auditCommunication';
import { useUserCode } from '@/hooks/useUserCode';

export default function AuditCommunicationTemplatesPage() {
  const { userCode } = useUserCode();
  const [list, setList] = useState<AuditCommunicationTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setList(await auditCommunicationTemplateService.list()); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const toggle = async (t: AuditCommunicationTemplate) => {
    try { await auditCommunicationTemplateService.setActive(t.id, !t.is_active, userCode || undefined); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Audit Communication Templates</h1>
        <p className="text-sm text-muted-foreground">Manage email/SMS templates used in audit communications. Approval rules and attachment rules are configured per template.</p>
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
        <div className="grid gap-3">
          {list.map((t) => {
            const roles = (t.approval_rule_json as any)?.roles || [];
            const attach = (t.attachment_rule_json as any) || {};
            return (
              <Card key={t.id}>
                <CardHeader className="py-3">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {t.template_name}
                        <Badge variant="outline">{t.template_code}</Badge>
                        <Badge>{COMM_CATEGORY_LABELS[t.category] || t.category}</Badge>
                        <Badge variant="secondary">{t.channel}</Badge>
                      </CardTitle>
                      {t.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{t.is_active ? 'Active' : 'Inactive'}</span>
                      <Switch checked={t.is_active} onCheckedChange={() => toggle(t)} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="py-2 text-xs space-y-1">
                  <div><span className="text-muted-foreground">Subject:</span> {t.email_subject || '—'}</div>
                  <div className="flex flex-wrap gap-1">
                    <span className="text-muted-foreground">Approval:</span>
                    {roles.length === 0 ? <Badge variant="outline">No approval</Badge> : roles.map((r: string) => <Badge key={r} variant="outline">{r}</Badge>)}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <span className="text-muted-foreground">Includes:</span>
                    {attach.include_report_pdf && <Badge variant="outline">Report PDF</Badge>}
                    {attach.include_evidence && <Badge variant="outline">Evidence</Badge>}
                    {attach.include_violations && <Badge variant="outline">Violations</Badge>}
                    {attach.use_secure_link && <Badge variant="outline">Secure portal link</Badge>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
