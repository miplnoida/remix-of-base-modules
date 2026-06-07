/**
 * Benefit Communication Templates
 * --------------------------------
 * Thin Benefits-scoped view over the central `notification_templates` table.
 * Lists every template whose template_code starts with "BN_" or whose
 * trigger_event starts with "bn." and allows toggling enabled / editing
 * subject + body inline. No duplicate table — single source of truth.
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Pencil, Mail, MessageSquare, FileText, Bell } from 'lucide-react';

const db = supabase as any;

interface Template {
  id: string;
  name: string;
  template_code: string;
  channel: string;
  trigger_event: string | null;
  subject: string | null;
  body: string | null;
  html_body: string | null;
  is_enabled: boolean;
  category: string | null;
  description: string | null;
}

const channelIcon = (c: string) => {
  switch (c) {
    case 'email': return <Mail className="h-3.5 w-3.5" />;
    case 'sms': return <MessageSquare className="h-3.5 w-3.5" />;
    case 'letter': return <FileText className="h-3.5 w-3.5" />;
    case 'in_app': return <Bell className="h-3.5 w-3.5" />;
    default: return null;
  }
};

export default function BenefitCommunicationTemplates() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Template | null>(null);
  const [filterEvent, setFilterEvent] = useState<string>('all');
  const [filterChannel, setFilterChannel] = useState<string>('all');

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['bn-communication-templates'],
    queryFn: async () => {
      const { data, error } = await db
        .from('notification_templates')
        .select('id, name, template_code, channel, trigger_event, subject, title, body, html_body, is_enabled, category, description')
        .or('template_code.ilike.BN_%,trigger_event.ilike.bn.%')
        .order('trigger_event', { ascending: true })
        .order('channel', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Template[];
    },
  });

  const toggleEnabled = useMutation({
    mutationFn: async (t: Template) => {
      const { error } = await db
        .from('notification_templates')
        .update({ is_enabled: !t.is_enabled, updated_at: new Date().toISOString() })
        .eq('id', t.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bn-communication-templates'] });
      toast.success('Template updated');
    },
    onError: (e: any) => toast.error('Update failed', { description: e?.message }),
  });

  const saveTemplate = useMutation({
    mutationFn: async (t: Template) => {
      const { error } = await db
        .from('notification_templates')
        .update({
          subject: t.subject,
          body: t.body,
          html_body: t.html_body,
          description: t.description,
          updated_at: new Date().toISOString(),
        })
        .eq('id', t.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bn-communication-templates'] });
      toast.success('Template saved');
      setEditing(null);
    },
    onError: (e: any) => toast.error('Save failed', { description: e?.message }),
  });

  const events = Array.from(new Set(templates.map(t => t.trigger_event).filter(Boolean))) as string[];
  const channels = Array.from(new Set(templates.map(t => t.channel)));

  const visible = templates.filter(t =>
    (filterEvent === 'all' || t.trigger_event === filterEvent) &&
    (filterChannel === 'all' || t.channel === filterChannel)
  );

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-semibold">Benefit Communication Templates</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage subject, body and active state of every benefit lifecycle template.
          Channels and recipients per product version are governed by Product Catalog → Communication Mapping.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <select className="border rounded px-3 py-1.5 text-sm bg-background" value={filterEvent} onChange={(e) => setFilterEvent(e.target.value)}>
          <option value="all">All events</option>
          {events.map(ev => <option key={ev} value={ev}>{ev}</option>)}
        </select>
        <select className="border rounded px-3 py-1.5 text-sm bg-background" value={filterChannel} onChange={(e) => setFilterChannel(e.target.value)}>
          <option value="all">All channels</option>
          {channels.map(ch => <option key={ch} value={ch}>{ch}</option>)}
        </select>
        <span className="text-xs text-muted-foreground ml-auto">{visible.length} of {templates.length}</span>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading templates…</p>}

      <div className="grid gap-3">
        {visible.map(t => (
          <Card key={t.id} className={!t.is_enabled ? 'opacity-60' : ''}>
            <CardContent className="py-4 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-medium text-sm truncate">{t.name}</h3>
                  <Badge variant="outline" className="text-[10px] gap-1">{channelIcon(t.channel)} {t.channel}</Badge>
                  {t.trigger_event && <Badge variant="secondary" className="text-[10px]">{t.trigger_event}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-mono">{t.template_code}</p>
                {t.subject && <p className="text-xs mt-1 line-clamp-1"><span className="text-muted-foreground">Subject:</span> {t.subject}</p>}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Switch checked={t.is_enabled} onCheckedChange={() => toggleEnabled.mutate(t)} />
                <Button size="sm" variant="outline" onClick={() => setEditing(t)}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {!isLoading && visible.length === 0 && (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No templates match the filters.</CardContent></Card>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="p-6 pb-3 border-b">
            <DialogTitle>{editing?.name}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="overflow-y-auto flex-1 min-h-0 p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <Input value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              {editing.channel !== 'in_app' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Subject</label>
                  <Input value={editing.subject ?? ''} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} />
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Body (plain text)</label>
                <Textarea rows={8} value={editing.body ?? ''} onChange={(e) => setEditing({ ...editing, body: e.target.value })} />
              </div>
              {(editing.channel === 'email' || editing.channel === 'letter') && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">HTML Body</label>
                  <Textarea rows={10} value={editing.html_body ?? ''} onChange={(e) => setEditing({ ...editing, html_body: e.target.value })} className="font-mono text-xs" />
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">
                Available placeholders: <code>{'{{claim_number}}'}</code>, <code>{'{{claimant_name}}'}</code>, <code>{'{{benefit_name}}'}</code>, <code>{'{{benefit_amount}}'}</code>, <code>{'{{actor_name}}'}</code>, <code>{'{{effective_date}}'}</code>, <code>{'{{evidence_type}}'}</code>.
              </p>
            </div>
          )}
          <DialogFooter className="p-6 pt-3 border-t bg-background">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => editing && saveTemplate.mutate(editing)} disabled={saveTemplate.isPending}>
              {saveTemplate.isPending ? 'Saving…' : 'Save Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
