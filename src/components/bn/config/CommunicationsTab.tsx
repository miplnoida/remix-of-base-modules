import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus, Mail, MessageSquare, FileText, Bell, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  versionId?: string;
  isReadOnly?: boolean;
  versionStatus?: string;
}

const CHANNELS = ['EMAIL', 'SMS', 'LETTER', 'IN_APP', 'INTERNAL_EMAIL'] as const;
const RECIPIENTS = ['CLAIMANT', 'PAYEE', 'EMPLOYER', 'ASSIGNED_OFFICER', 'SUPERVISOR', 'FINANCE', 'MEDICAL_BOARD', 'AUDITOR'] as const;

const channelIcon: Record<string, any> = { EMAIL: Mail, INTERNAL_EMAIL: Mail, SMS: MessageSquare, LETTER: FileText, IN_APP: Bell };

interface Event {
  event_code: string;
  event_name: string;
  category: string;
  is_mandatory_letter: boolean;
  description: string | null;
}
interface Mapping {
  id: string;
  event_code: string;
  channel: string;
  recipient_type: string;
  template_id: string | null;
  is_required: boolean;
  fallback_priority: number;
  active: boolean;
}
interface Template { id: string; name: string; channel: string; template_code: string | null; }

export function CommunicationsTab({ versionId, isReadOnly, versionStatus }: Props) {
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const reload = async () => {
    if (!versionId) return;
    setLoading(true);
    const [{ data: ev }, { data: mp }, { data: tp }] = await Promise.all([
      (supabase as any).from('bn_comm_event').select('*').eq('active', true).order('event_code'),
      (supabase as any).from('bn_comm_mapping').select('*').eq('bn_product_version_id', versionId).order('event_code'),
      (supabase as any).from('notification_templates').select('id,name,channel,template_code').order('name'),
    ]);
    setEvents(ev || []);
    setMappings(mp || []);
    setTemplates(tp || []);
    setLoading(false);
  };

  useEffect(() => { reload(); }, [versionId]);

  if (!versionId) {
    return <Card><CardContent className="py-8 text-center text-muted-foreground">Select a product version to configure communications.</CardContent></Card>;
  }

  const addMapping = async (event_code: string) => {
    const { error } = await (supabase as any).from('bn_comm_mapping').insert({
      event_code, bn_product_version_id: versionId, channel: 'EMAIL', recipient_type: 'CLAIMANT',
      is_required: false, fallback_priority: 100, active: true,
    });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else reload();
  };

  const updateMapping = async (id: string, patch: Partial<Mapping>) => {
    const { error } = await (supabase as any).from('bn_comm_mapping').update(patch).eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else reload();
  };

  const deleteMapping = async (id: string) => {
    const { error } = await (supabase as any).from('bn_comm_mapping').delete().eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else reload();
  };

  const grouped = events.map(e => ({ event: e, rows: mappings.filter(m => m.event_code === e.event_code) }));
  const totalMappings = mappings.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Communications</CardTitle>
            <CardDescription>
              Controls how messages are sent when claim lifecycle events occur — email, SMS, physical letter,
              in-app notification, or internal email. Mappings run automatically when the corresponding workflow
              action executes. (Application submission methods live in the <strong>Application Channels</strong> tab.)
            </CardDescription>
          </div>
          <Badge variant="outline">{totalMappings} method{totalMappings === 1 ? '' : 's'}</Badge>
        </div>
        {isReadOnly && (
          <p className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5" /> Version is {versionStatus}. Switch to a DRAFT version to edit.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
        ) : grouped.map(({ event, rows }) => {
          const isOpen = expanded === event.event_code;
          return (
            <div key={event.event_code} className="rounded-lg border">
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : event.event_code)}
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/40"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium">{event.event_name}</span>
                  <code className="text-xs text-muted-foreground">{event.event_code}</code>
                  {event.is_mandatory_letter && <Badge variant="destructive" className="text-[10px]">Mandatory Letter</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={rows.length ? 'default' : 'outline'}>{rows.length} channel{rows.length === 1 ? '' : 's'}</Badge>
                </div>
              </button>
              {isOpen && (
                <div className="border-t bg-muted/20 p-3 space-y-2">
                  {rows.length === 0 && <p className="text-xs text-muted-foreground">No channels configured yet.</p>}
                  {rows.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[140px]">Channel</TableHead>
                          <TableHead className="w-[180px]">Recipient</TableHead>
                          <TableHead>Template</TableHead>
                          <TableHead className="w-[90px]">Required</TableHead>
                          <TableHead className="w-[90px]">Active</TableHead>
                          <TableHead className="w-[50px]" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map(m => {
                          const Icon = channelIcon[m.channel] || Mail;
                          const filteredTpls = templates.filter(t =>
                            !t.channel || t.channel.toLowerCase() === m.channel.toLowerCase() ||
                            (m.channel === 'INTERNAL_EMAIL' && t.channel.toLowerCase() === 'email')
                          );
                          return (
                            <TableRow key={m.id}>
                              <TableCell>
                                <Select value={m.channel} onValueChange={v => updateMapping(m.id, { channel: v, template_id: null })} disabled={isReadOnly}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {CHANNELS.map(c => <SelectItem key={c} value={c}><span className="flex items-center gap-2"><Icon className="h-3.5 w-3.5" />{c}</span></SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Select value={m.recipient_type} onValueChange={v => updateMapping(m.id, { recipient_type: v })} disabled={isReadOnly}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {RECIPIENTS.map(r => <SelectItem key={r} value={r}>{r.replace('_', ' ')}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Select value={m.template_id || '__none__'} onValueChange={v => updateMapping(m.id, { template_id: v === '__none__' ? null : v })} disabled={isReadOnly}>
                                  <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">— None —</SelectItem>
                                    {filteredTpls.map(t => <SelectItem key={t.id} value={t.id}>{t.name}{t.template_code ? ` (${t.template_code})` : ''}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell><Switch checked={m.is_required} onCheckedChange={v => updateMapping(m.id, { is_required: v })} disabled={isReadOnly} /></TableCell>
                              <TableCell><Switch checked={m.active} onCheckedChange={v => updateMapping(m.id, { active: v })} disabled={isReadOnly} /></TableCell>
                              <TableCell>
                                <Button size="icon" variant="ghost" onClick={() => deleteMapping(m.id)} disabled={isReadOnly}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                  <Button size="sm" variant="outline" onClick={() => addMapping(event.event_code)} disabled={isReadOnly} className="gap-2">
                    <Plus className="h-4 w-4" /> Add channel mapping
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default CommunicationsTab;
