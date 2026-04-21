import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Copy, Edit, Loader2, Plus, Search, CheckCircle2, AlertCircle, ListChecks, LayoutGrid } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { auditCommunicationTemplateService } from '@/services/auditCommunicationTemplateService';
import type { AuditCommunicationTemplate, CeCommLifecycleStage } from '@/types/auditCommunication';
import {
  COMM_CATEGORY_LABELS,
  COMM_TYPE_LABELS,
  COMM_LIFECYCLE_STAGE_LABELS,
  COMM_LIFECYCLE_STAGE_ORDER,
  COMM_LIFECYCLE_STAGE_HINTS,
  REPORT_TEMPLATE_TYPE_LABELS,
} from '@/types/auditCommunication';
import { SEND_MODE_LABELS } from '@/services/auditCommunicationSchedulePolicyService';
import { useUserCode } from '@/hooks/useUserCode';
import { AdminAreaBanner } from '@/components/compliance/admin/AdminAreaBanner';

export default function AuditCommunicationTemplatesPage() {
  const nav = useNavigate();
  const { userCode } = useUserCode();
  const [list, setList] = useState<AuditCommunicationTemplate[]>([]);
  const [policies, setPolicies] = useState<Array<{ template_id: string; trigger_mode: string }>>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [fStage, setFStage] = useState<string>('all');
  const [fChannel, setFChannel] = useState<string>('all');
  const [fActive, setFActive] = useState<string>('all');
  const [fSendMode, setFSendMode] = useState<string>('all');

  const load = async () => {
    setLoading(true);
    try {
      const [tpls, pol] = await Promise.all([
        auditCommunicationTemplateService.list(),
        (supabase.from('ce_audit_communication_schedule_policies' as any) as any)
          .select('template_id,trigger_mode'),
      ]);
      setList(tpls);
      setPolicies((pol.data || []) as any);
    } catch (e: any) { toast.error(e.message); }
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
      if (fStage !== 'all') {
        const stageVal = t.lifecycle_stage ?? '';
        if (fStage === 'unassigned' ? stageVal !== '' : stageVal !== fStage) return false;
      }
      if (fChannel !== 'all' && t.channel !== fChannel) return false;
      if (fActive !== 'all' && (fActive === 'yes') !== t.is_active) return false;
      if (fSendMode !== 'all' && t.send_mode !== fSendMode) return false;
      if (q && !`${t.template_code} ${t.template_name} ${t.description ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [list, search, fStage, fChannel, fActive, fSendMode]);

  /** Group filtered list by lifecycle_stage in canonical order. */
  const grouped = useMemo(() => {
    const map = new Map<CeCommLifecycleStage | 'unassigned', AuditCommunicationTemplate[]>();
    for (const stage of COMM_LIFECYCLE_STAGE_ORDER) map.set(stage, []);
    map.set('unassigned', []);
    for (const t of filtered) {
      const key = (t.lifecycle_stage as CeCommLifecycleStage) ?? 'unassigned';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return map;
  }, [filtered]);

  const policyByTemplate = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of policies) m.set(p.template_id, p.trigger_mode);
    return m;
  }, [policies]);

  const renderTemplateCard = (t: AuditCommunicationTemplate) => {
    const roles = (t.approval_rule_json as any)?.roles || [];
    const triggerMode = policyByTemplate.get(t.id);
    return (
      <Card key={t.id}>
        <CardHeader className="py-3">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                {t.template_name}
                <Badge variant="outline">{t.template_code}</Badge>
                <Badge variant="secondary">{t.channel}</Badge>
                {t.send_mode && <Badge variant="outline">{SEND_MODE_LABELS[t.send_mode]}</Badge>}
                {triggerMode && triggerMode !== 'NONE' && (
                  <Badge variant="outline" className="bg-primary/5">{triggerMode}</Badge>
                )}
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
          <div className="flex flex-wrap gap-1 items-center">
            <span className="text-muted-foreground">Approval:</span>
            {roles.length === 0 ? <Badge variant="outline">No approval</Badge> : roles.map((r: string) => <Badge key={r} variant="outline">{r}</Badge>)}
            {t.linked_report_template_type && (
              <Badge variant="secondary" className="ml-2">
                Report: {REPORT_TEMPLATE_TYPE_LABELS[t.linked_report_template_type] ?? t.linked_report_template_type}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-4">
      <AdminAreaBanner area="communication" />

      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Audit Communication Templates</h1>
          <p className="text-sm text-muted-foreground">
            Organized by employer-audit lifecycle stage. Configure templates, sections, actions, approvals and automatic scheduling.
          </p>
        </div>
        <Button onClick={() => nav('/compliance/admin/communication-templates/new')}>
          <Plus className="h-4 w-4 mr-1" /> New template
        </Button>
      </div>

      <Tabs defaultValue="by-stage">
        <TabsList>
          <TabsTrigger value="by-stage" className="gap-2"><LayoutGrid className="h-4 w-4" />By Lifecycle</TabsTrigger>
          <TabsTrigger value="coverage" className="gap-2"><ListChecks className="h-4 w-4" />Coverage Matrix</TabsTrigger>
        </TabsList>

        <TabsContent value="by-stage" className="space-y-4">
          <Card>
            <CardContent className="pt-4 grid gap-3 md:grid-cols-5">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
                  <Input className="pl-8" placeholder="Search code, name, description…" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
              </div>
              <Select value={fStage} onValueChange={setFStage}>
                <SelectTrigger><SelectValue placeholder="Lifecycle stage" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All stages</SelectItem>
                  {COMM_LIFECYCLE_STAGE_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>{COMM_LIFECYCLE_STAGE_LABELS[s]}</SelectItem>
                  ))}
                  <SelectItem value="unassigned">Unassigned</SelectItem>
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
            <Accordion type="multiple" defaultValue={[...COMM_LIFECYCLE_STAGE_ORDER]}>
              {COMM_LIFECYCLE_STAGE_ORDER.map((stage) => {
                const items = grouped.get(stage) || [];
                return (
                  <AccordionItem key={stage} value={stage}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 flex-1 text-left">
                        <span className="font-semibold">{COMM_LIFECYCLE_STAGE_LABELS[stage]}</span>
                        <Badge variant="secondary">{items.length}</Badge>
                        <span className="text-xs text-muted-foreground font-normal hidden md:inline">
                          {COMM_LIFECYCLE_STAGE_HINTS[stage]}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 pt-2">
                      {items.length === 0 ? (
                        <Card><CardContent className="py-4 text-center text-xs text-muted-foreground">
                          No templates in this stage. <Button variant="link" className="h-auto p-0 text-xs" onClick={() => nav('/compliance/admin/communication-templates/new')}>Add a template</Button>
                        </CardContent></Card>
                      ) : items.map(renderTemplateCard)}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
              {(grouped.get('unassigned') || []).length > 0 && (
                <AccordionItem value="unassigned">
                  <AccordionTrigger>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-warning">Unassigned (legacy)</span>
                      <Badge variant="outline">{(grouped.get('unassigned') || []).length}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 pt-2">
                    {(grouped.get('unassigned') || []).map(renderTemplateCard)}
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          )}
        </TabsContent>

        <TabsContent value="coverage">
          <CoverageMatrix list={list} policyByTemplate={policyByTemplate} loading={loading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Simple coverage matrix — for each lifecycle stage, are templates / schedules / report links present? */
function CoverageMatrix({
  list,
  policyByTemplate,
  loading,
}: {
  list: AuditCommunicationTemplate[];
  policyByTemplate: Map<string, string>;
  loading: boolean;
}) {
  const rows = useMemo(() => {
    return COMM_LIFECYCLE_STAGE_ORDER.map((stage) => {
      const inStage = list.filter((t) => t.lifecycle_stage === stage);
      const active = inStage.filter((t) => t.is_active);
      const withSchedule = inStage.filter((t) => {
        const m = policyByTemplate.get(t.id);
        return m && m !== 'NONE';
      });
      const withReport = inStage.filter((t) => !!t.linked_report_template_type);
      return { stage, total: inStage.length, active: active.length, withSchedule: withSchedule.length, withReport: withReport.length };
    });
  }, [list, policyByTemplate]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const Chip = ({ ok, label }: { ok: boolean; label: string }) => (
    <Badge variant={ok ? 'default' : 'outline'} className={ok ? 'bg-emerald-600' : 'text-muted-foreground'}>
      {ok ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
      {label}
    </Badge>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Lifecycle Coverage</CardTitle>
        <p className="text-xs text-muted-foreground">
          A quick health check: for each employer-audit lifecycle stage, do you have templates, schedules and (where appropriate) linked reports?
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-4">Stage</th>
                <th className="py-2 pr-4">Templates</th>
                <th className="py-2 pr-4">Active</th>
                <th className="py-2 pr-4">With schedule</th>
                <th className="py-2 pr-4">Linked report</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.stage} className="border-b">
                  <td className="py-2 pr-4">
                    <div className="font-medium">{COMM_LIFECYCLE_STAGE_LABELS[r.stage]}</div>
                    <div className="text-[11px] text-muted-foreground">{COMM_LIFECYCLE_STAGE_HINTS[r.stage]}</div>
                  </td>
                  <td className="py-2 pr-4"><Chip ok={r.total > 0} label={String(r.total)} /></td>
                  <td className="py-2 pr-4"><Chip ok={r.active > 0} label={String(r.active)} /></td>
                  <td className="py-2 pr-4"><Chip ok={r.withSchedule > 0} label={String(r.withSchedule)} /></td>
                  <td className="py-2 pr-4">
                    {/* Reports only relevant for during/post/final stages */}
                    {(r.stage === 'during_audit' || r.stage === 'post_review' || r.stage === 'final_enforcement' || r.stage === 'reminders_escalation')
                      ? <Chip ok={r.withReport > 0} label={String(r.withReport)} />
                      : <Badge variant="outline" className="text-muted-foreground">n/a</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
