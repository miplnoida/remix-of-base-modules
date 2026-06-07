/**
 * LetterPreviewDialog
 * --------------------
 * Shows full letter detail used by Workbench → Communications → Letters:
 *   - template (subject + body) with merged values
 *   - rendered preview using `merge_context` already on the bn_letter row
 *   - recipient + address snapshot
 *   - lifecycle history (generated → approved → printed → dispatched)
 *   - related bn_communication_log rows linked to this letter
 */
import React from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BnEmptyState } from '@/components/bn/shared';
import { formatAuditTimestamp } from '@/lib/culture/culture';

const db = supabase as any;

function renderMerged(text: string, ctx: Record<string, any>): string {
  if (!text) return '';
  return text
    .replace(/\{\{\s*([\w_.]+)\s*\}\}/g, (_, k) => String(ctx?.[k] ?? `{{${k}}}`))
    .replace(/\{\s*([\w_.]+)\s*\}/g, (_, k) => String(ctx?.[k] ?? `{${k}}`));
}

interface Props { letterId: string | null; open: boolean; onOpenChange: (o: boolean) => void; }

export const LetterPreviewDialog: React.FC<Props> = ({ letterId, open, onOpenChange }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['bn-letter-detail', letterId],
    enabled: !!letterId && open,
    queryFn: async () => {
      const { data: letter } = await db.from('bn_letter').select('*').eq('id', letterId).maybeSingle();
      if (!letter) return null;
      const [{ data: template }, { data: logs }] = await Promise.all([
        letter.template_id
          ? db.from('notification_templates').select('id, name, subject, html_body, body, template_code, version_no').eq('id', letter.template_id).maybeSingle()
          : Promise.resolve({ data: null }),
        db.from('bn_communication_log').select('id, status, created_at, channel, delivery_method, error_message, context')
          .eq('letter_id', letterId).order('created_at', { ascending: true }),
      ]);
      return { letter, template: template || null, logs: logs || [] };
    },
  });

  const letter = data?.letter;
  const template = data?.template;
  const merge = letter?.merge_context || {};
  const subject = letter?.rendered_subject || letter?.subject || renderMerged(template?.subject || '', merge) || '—';
  const body = letter?.rendered_body_html
    || letter?.body_html
    || renderMerged(template?.html_body || template?.body || '', merge);
  const addr = letter?.recipient_address_snapshot || {};

  const events: Array<{ label: string; at?: string | null; by?: string | null }> = letter ? [
    { label: 'Generated', at: letter.generated_at || letter.created_at, by: letter.created_by },
    { label: 'Approved', at: letter.approved_at, by: letter.approved_by },
    { label: 'Printed', at: letter.printed_at, by: letter.printed_by },
    { label: 'Dispatched', at: letter.dispatched_at, by: letter.dispatched_by },
    { label: 'Delivered', at: letter.delivered_at },
    { label: 'Returned', at: letter.returned_at },
    { label: 'Cancelled', at: letter.cancelled_at },
  ].filter((e) => !!e.at) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Letter detail</DialogTitle>
          <DialogDescription>
            {letter?.event_code || ''}
            {template?.name ? ` · Template: ${template.name}` : ' · No template linked'}
            {letter?.template_version_no ? ` · v${letter.template_version_no}` : ''}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !letter ? (
          <BnEmptyState type="loading" title="Loading letter…" />
        ) : (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Field label="Status" value={<Badge variant="outline">{letter.status}</Badge>} />
              <Field label="Reference No." value={letter.reference_number || <span className="text-muted-foreground italic">not yet allocated</span>} />
              <Field label="Recipient" value={letter.recipient_name || '—'} />
              <Field label="Type" value={letter.recipient_type} />
              <Field label="Document Type" value={letter.document_type || '—'} />
              <Field label="Department" value={letter.department_code || '—'} />
              <Field label="Created" value={formatAuditTimestamp(letter.created_at)} />
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Address</p>
              <div className="border rounded p-2 bg-muted/30 text-sm whitespace-pre-line">
                {[addr.line1, addr.line2, [addr.city, addr.state].filter(Boolean).join(', '), addr.postal, addr.country]
                  .filter(Boolean).join('\n') || <span className="text-muted-foreground">No postal address on file</span>}
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Subject</p>
              <p className="font-medium">{subject}</p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Rendered preview</p>
              {body ? (
                <div className="border rounded p-3 bg-background prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: body }} />
              ) : (
                <p className="text-muted-foreground italic border rounded p-3">No template body configured. Attach a template in Product Catalog → Communications.</p>
              )}
            </div>

            {template && (
              <details>
                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                  Show raw template ({template.template_code} v{template.version_no})
                </summary>
                <pre className="mt-2 text-xs bg-muted/50 rounded p-2 overflow-auto max-h-60">
{`Subject: ${template.subject || '—'}\n\n${template.html_body || template.body || ''}`}
                </pre>
              </details>
            )}

            <details open>
              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">Merge values used ({Object.keys(merge).length})</summary>
              <pre className="mt-2 text-xs bg-muted/50 rounded p-2 overflow-auto max-h-60">{JSON.stringify(merge, null, 2)}</pre>
            </details>

            <Separator />

            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Lifecycle history</p>
              {events.length === 0 ? (
                <p className="text-muted-foreground text-sm">No lifecycle events yet.</p>
              ) : (
                <ol className="space-y-1">
                  {events.map((e, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <Badge variant="outline" className="min-w-[100px] justify-center">{e.label}</Badge>
                      <span>{formatAuditTimestamp(e.at)}</span>
                      {e.by && <span className="text-xs text-muted-foreground">by {e.by}</span>}
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {data?.logs && data.logs.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Communication log entries</p>
                <div className="border rounded divide-y">
                  {data.logs.map((l: any) => (
                    <div key={l.id} className="flex items-center justify-between p-2 text-xs gap-2">
                      <Badge variant="outline">{l.status}</Badge>
                      <span className="text-muted-foreground">{l.delivery_method || l.channel}</span>
                      <span>{formatAuditTimestamp(l.created_at)}</span>
                      {l.error_message && <span className="text-destructive truncate">{l.error_message}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const Field: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <div className="font-medium">{value}</div>
  </div>
);

export default LetterPreviewDialog;
