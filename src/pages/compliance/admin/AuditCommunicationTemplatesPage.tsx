import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, Edit, Loader2, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { auditCommunicationTemplateService } from '@/services/auditCommunicationTemplateService';
import type { AuditCommunicationTemplate } from '@/types/auditCommunication';
import { COMM_CATEGORY_LABELS, COMM_TYPE_LABELS } from '@/types/auditCommunication';
import { SEND_MODE_LABELS } from '@/services/auditCommunicationSchedulePolicyService';
import { useUserCode } from '@/hooks/useUserCode';

export default function AuditCommunicationTemplatesPage() {
  const nav = useNavigate();
  const { userCode } = useUserCode();
  const [list, setList] = useState<AuditCommunicationTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [fCategory, setFCategory] = useState<string>('all');
  const [fChannel, setFChannel] = useState<string>('all');
  const [fActive, setFActive] = useState<string>('all');
  const [fSendMode, setFSendMode] = useState<string>('all');

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

  const clone = async (t: AuditCommunicationTemplate) => {
    const code = prompt('New template code', `${t.template_code}_copy`);
    if (!code) return;
    const name = prompt('New template name', `${t.template_name} (Copy)`);
    if (!name) return;
    try {
      const created = await auditCommunicationTemplateService.clone(t.id, code, name, userCode || undefined);
      toast.success('Template cloned');
      nav(`/compliance/admin/communication-templates/${created.id}`);
    } catch (e: any) { toast.error(e.message); }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter(t => {
      if (fCategory !== 'all' && t.category !== fCategory) return false;
      if (fChannel !== 'all' && t.channel !== fChannel) return false;
      if (fActive !== 'all' && (fActive === 'yes') !== t.is_active) return false;
      if (fSendMode !== 'all' && t.send_mode !== fSendMode) return false;
      if (q && !`${t.template_code} ${t.template_name} ${t.description ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [list, search, fCategory, fChannel, fActive, fSendMode]);

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Audit Communication Templates</h1>
          <p className="text-sm text-muted-foreground">Configure templates, sections, actions, approvals and automatic scheduling.</p>
        </div>
        <Button onClick={() => nav('/compliance/admin/communication-templates/new')}>
          <Plus className="h-4 w-4 mr-1" /> New template
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4 grid gap-3 md:grid-cols-5">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
              <Input className="pl-8" placeholder="Search code, name, description…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <Select value={fCategory} onValueChange={setFCategory}>
            <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {Object.entries(COMM_CATEGORY_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={fChannel} onValueChange={setFChannel}>
            <SelectTrigger><SelectValue placeholder="Channel" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All channels</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="both">Both</SelectItem>
            </SelectContent>
          </Select>
          <Select value={fSendMode} onValueChange={setFSendMode}>
            <SelectTrigger><SelectValue placeholder="Send mode" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All modes</SelectItem>
              {Object.entries(SEND_MODE_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={fActive} onValueChange={setFActive}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Active + Inactive</SelectItem>
              <SelectItem value="yes">Active only</SelectItem>
              <SelectItem value="no">Inactive only</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className="grid gap-3">
          {filtered.length === 0 && (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No templates match your filters.</CardContent></Card>
          )}
          {filtered.map(t => {
            const roles = (t.approval_rule_json as any)?.roles || [];
            return (
              <Card key={t.id}>
                <CardHeader className="py-3">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                        {t.template_name}
                        <Badge variant="outline">{t.template_code}</Badge>
                        <Badge>{COMM_CATEGORY_LABELS[t.category] || t.category}</Badge>
                        <Badge variant="secondary">{t.channel}</Badge>
                        {t.send_mode && <Badge variant="outline">{SEND_MODE_LABELS[t.send_mode]}</Badge>}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {COMM_TYPE_LABELS[t.comm_type]}{t.description ? ` — ${t.description}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{t.is_active ? 'Active' : 'Inactive'}</span>
                      <Switch checked={t.is_active} onCheckedChange={() => toggle(t)} />
                      <Button size="sm" variant="outline" onClick={() => nav(`/compliance/admin/communication-templates/${t.id}`)}>
                        <Edit className="h-3 w-3 mr-1" /> Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => clone(t)}>
                        <Copy className="h-3 w-3 mr-1" /> Clone
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="py-2 text-xs space-y-1">
                  <div><span className="text-muted-foreground">Subject:</span> {t.email_subject || '—'}</div>
                  <div className="flex flex-wrap gap-1">
                    <span className="text-muted-foreground">Approval:</span>
                    {roles.length === 0 ? <Badge variant="outline">No approval</Badge> : roles.map((r: string) => <Badge key={r} variant="outline">{r}</Badge>)}
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
