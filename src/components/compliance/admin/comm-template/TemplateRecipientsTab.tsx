import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowDown, ArrowUp } from 'lucide-react';
import type { AuditCommunicationTemplate, CeCommRecipientSource } from '@/types/auditCommunication';

const SOURCE_LABELS: Record<CeCommRecipientSource, string> = {
  visit_contact: 'Visit contact (inspection)',
  compliance_contact: 'Compliance contact',
  er_master: 'Employer master record',
  manual: 'Manual entry',
};

const ALL_SOURCES: CeCommRecipientSource[] = ['visit_contact', 'compliance_contact', 'er_master', 'manual'];

interface Props {
  draft: Partial<AuditCommunicationTemplate>;
  onChange: (patch: Partial<AuditCommunicationTemplate>) => void;
}

export default function TemplateRecipientsTab({ draft, onChange }: Props) {
  const rule = draft.recipient_rule_json || { priority: ['visit_contact', 'er_master'], allow_manual_add: true };
  const priority = rule.priority || [];

  const setRule = (patch: Partial<typeof rule>) => onChange({ recipient_rule_json: { ...rule, ...patch } });

  const toggle = (src: CeCommRecipientSource, on: boolean) => {
    const next = on ? [...priority.filter(s => s !== src), src] : priority.filter(s => s !== src);
    setRule({ priority: next });
  };

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...priority];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setRule({ priority: next });
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div>
          <Label>Recipient source priority</Label>
          <p className="text-xs text-muted-foreground mb-2">First match wins. Drag-equivalent reordering with arrows.</p>
          <div className="space-y-2">
            {priority.map((src, idx) => (
              <div key={src} className="flex items-center gap-2 border rounded p-2">
                <Badge variant="outline">{idx + 1}</Badge>
                <span className="flex-1">{SOURCE_LABELS[src]}</span>
                <Button size="icon" variant="ghost" disabled={idx === 0} onClick={() => move(idx, -1)}><ArrowUp className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" disabled={idx === priority.length - 1} onClick={() => move(idx, 1)}><ArrowDown className="h-4 w-4" /></Button>
                <Switch checked onCheckedChange={() => toggle(src, false)} />
              </div>
            ))}
          </div>
          <div className="mt-3">
            <Label className="text-xs">Add source</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {ALL_SOURCES.filter(s => !priority.includes(s)).map(s => (
                <Button key={s} size="sm" variant="outline" onClick={() => toggle(s, true)}>+ {SOURCE_LABELS[s]}</Button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t">
          <Switch checked={!!rule.allow_manual_add} onCheckedChange={(v) => setRule({ allow_manual_add: v })} />
          <Label>Allow officer to add manual recipients at draft time</Label>
        </div>
      </CardContent>
    </Card>
  );
}
