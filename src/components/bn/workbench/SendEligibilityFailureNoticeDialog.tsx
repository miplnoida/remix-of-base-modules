/**
 * Send Eligibility Failure Notice dialog
 *
 * Policy/mapping-driven UI for the bn.eligibility.failed event:
 *  - reads delivery methods from bn_comm_mapping (product-version scoped → global fallback)
 *  - lets the officer toggle which methods to dispatch this round
 *  - lets the officer attach a note + appeal deadline → flows into merge context
 *  - dispatches via the central triggerClaimCommunication() so all audit,
 *    letter creation, queueing and logging happens through one path.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mail, MessageSquare, FileText, Bell, AlertCircle, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBnTriggerCommunication } from '@/hooks/bn/useBnClaimCommunication';

const EVENT_CODE = 'bn.eligibility.failed';
const db = supabase as any;

interface MappingRow {
  id: string;
  delivery_method: string;
  channel: string | null;
  recipient_type: string;
  template_id: string | null;
  is_required: boolean;
  bn_product_version_id: string | null;
  template?: { template_code: string; name: string; subject: string | null } | null;
}

const normalizeMethod = (value?: string | null) => String(value || '').trim().toUpperCase();

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  claimId: string;
  productVersionId?: string | null;
  userCode: string;
  failedRules: any[];
  eligibilitySnapshot?: any;
}

const channelIcon = (m: string) => {
  if (m === 'EMAIL' || m === 'INTERNAL_EMAIL') return <Mail className="h-3.5 w-3.5" />;
  if (m === 'SMS') return <MessageSquare className="h-3.5 w-3.5" />;
  if (m === 'LETTER') return <FileText className="h-3.5 w-3.5" />;
  return <Bell className="h-3.5 w-3.5" />;
};

async function loadMappings(productVersionId?: string | null): Promise<MappingRow[]> {
  const { data, error } = await db
    .from('bn_comm_mapping')
    .select('id, delivery_method, channel, recipient_type, template_id, is_required, bn_product_version_id')
    .eq('event_code', EVENT_CODE)
    .eq('active', true);
  if (error || !data) return [];
  const rows = (data as MappingRow[]).map((row) => ({
    ...row,
    delivery_method: normalizeMethod(row.delivery_method || row.channel),
    channel: normalizeMethod(row.channel || row.delivery_method),
  }));

  const templateIds = Array.from(new Set(rows.map((r) => r.template_id).filter(Boolean)));
  const templateById = new Map<string, MappingRow['template']>();
  if (templateIds.length > 0) {
    const { data: templates } = await db
      .from('notification_templates')
      .select('id, template_code, name, subject')
      .in('id', templateIds);
    (templates || []).forEach((template: any) => templateById.set(template.id, template));
  }

  const withTemplates = rows.map((row) => ({
    ...row,
    template: row.template_id ? templateById.get(row.template_id) ?? null : null,
  }));

  if (productVersionId) {
    const scoped = withTemplates.filter((r) => r.bn_product_version_id === productVersionId);
    if (scoped.length > 0) return scoped;
  }
  return withTemplates.filter((r) => !r.bn_product_version_id);
}

export function SendEligibilityFailureNoticeDialog({
  open,
  onOpenChange,
  claimId,
  productVersionId,
  userCode,
  failedRules,
  eligibilitySnapshot,
}: Props) {
  const trigger = useBnTriggerCommunication();
  const { data: mappings = [], isLoading } = useQuery({
    queryKey: ['bn', 'comm-mapping', EVENT_CODE, productVersionId ?? 'global'],
    queryFn: () => loadMappings(productVersionId),
    enabled: open,
  });

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [officerNote, setOfficerNote] = useState('');
  const [appealDeadline, setAppealDeadline] = useState('');
  const [officePhone, setOfficePhone] = useState('');
  const [officeEmail, setOfficeEmail] = useState('');

  useEffect(() => {
    if (!open) return;
    const initial: Record<string, boolean> = {};
    mappings.forEach((m) => { initial[m.id] = true; });
    setSelected(initial);
    setOfficerNote('');
    setAppealDeadline('');
    setOfficePhone('');
    setOfficeEmail('');
  }, [open, mappings]);

  const failedRulesText = useMemo(
    () => failedRules.map((r) => `• ${r.rule_name || r.rule_code}${r.message ? ` — ${r.message}` : ''}`).join('\n'),
    [failedRules],
  );

  const anySelected = Object.values(selected).some(Boolean);

  const handleDispatch = async (mode: 'send' | 'draft') => {
    const toDispatch = mappings.filter((m) => selected[m.id]);
    if (toDispatch.length === 0) {
      toast.error('Select at least one delivery method.');
      return;
    }
    try {
      const res = await trigger.mutateAsync({
        eventCode: EVENT_CODE,
        claimId,
        ctx: {
          productVersionId: productVersionId || undefined,
          userCode,
          reasonCode: 'ELIGIBILITY_FAILED',
          reasonDescription: officerNote || undefined,
          appealDeadline: appealDeadline || undefined,
          extra: {
            failedRules,
            latestEligibility: eligibilitySnapshot,
            nextSteps: officerNote || undefined,
            officePhone: officePhone || undefined,
            officeEmail: officeEmail || undefined,
            draft: mode === 'draft',
            selectedMappingIds: toDispatch.map((m) => m.id),
          },
        },
      });
      toast.success(
        `Notice ${mode === 'draft' ? 'drafted' : 'dispatched'} — ${res.dispatched} sent, ${res.skipped} skipped, ${res.failed} failed.`,
      );
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || 'Could not dispatch notice');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-2 shrink-0 border-b">
          <DialogTitle>Send Eligibility Failure Notice</DialogTitle>
          <DialogDescription>
            Event <span className="font-mono">{EVENT_CODE}</span> — delivery methods, recipients and templates are driven by Product Catalog → Communications. All actions are audited.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 py-4 overflow-y-auto flex-1 min-h-0">
          {/* Failed rules summary */}
          <section className="rounded border p-3 bg-muted/30">
            <div className="text-xs font-medium mb-1.5 flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 text-destructive" />
              Failed checks ({failedRules.length})
            </div>
            <ScrollArea className="max-h-32">
              <pre className="text-xs whitespace-pre-wrap font-sans">{failedRulesText || '—'}</pre>
            </ScrollArea>
          </section>

          {/* Mappings */}
          <section className="space-y-2">
            <Label>Delivery methods</Label>
            {isLoading ? (
              <p className="text-xs text-muted-foreground">Loading mappings…</p>
            ) : mappings.length === 0 ? (
              <p className="text-xs text-destructive">
                No communication mappings configured for this event. Add them in Product Catalog → Communications.
              </p>
            ) : (
              <div className="space-y-1.5">
                {mappings.map((m) => (
                  <label
                    key={m.id}
                    className="flex items-start gap-3 rounded border p-2 hover:bg-muted/40 cursor-pointer"
                  >
                    <Checkbox
                      checked={!!selected[m.id]}
                      onCheckedChange={(v) => setSelected((s) => ({ ...s, [m.id]: v === true }))}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        {channelIcon(m.delivery_method || m.channel || '')}
                        <span>{m.delivery_method || m.channel}</span>
                        <Badge variant="outline" className="text-xs">{m.recipient_type}</Badge>
                        {m.is_required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                        {m.bn_product_version_id ? (
                          <Badge variant="secondary" className="text-[10px]">Product</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Default</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {m.template
                          ? <>Template: <span className="font-mono">{m.template.template_code}</span> — {m.template.name}</>
                          : <span className="italic">No template linked (system default will be used).</span>}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </section>

          {/* Officer inputs */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Appeal deadline (optional)</Label>
              <Input
                type="date"
                value={appealDeadline}
                onChange={(e) => setAppealDeadline(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Office phone (optional)</Label>
              <Input value={officePhone} onChange={(e) => setOfficePhone(e.target.value)} placeholder="e.g. +1 869 555 0100" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Office email (optional)</Label>
              <Input value={officeEmail} onChange={(e) => setOfficeEmail(e.target.value)} placeholder="claims@socialsecurity.gov" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Officer note / next steps</Label>
              <Textarea
                value={officerNote}
                onChange={(e) => setOfficerNote(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="What should the claimant do next? This becomes {{NEXT_STEPS}} in templates that include it."
              />
              <p className="text-[10px] text-muted-foreground">{officerNote.length}/1000</p>
            </div>
          </section>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={trigger.isPending}>
            Cancel
          </Button>
          <Button variant="outline" onClick={() => handleDispatch('draft')} disabled={!anySelected || trigger.isPending}>
            Save Draft
          </Button>
          <Button onClick={() => handleDispatch('send')} disabled={!anySelected || trigger.isPending} className="gap-1">
            <Send className="h-3.5 w-3.5" /> {trigger.isPending ? 'Dispatching…' : 'Send Notice'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SendEligibilityFailureNoticeDialog;
