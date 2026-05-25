import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { formatAuditTimestamp } from '@/services/complianceSettingsService';

export type RuleHistoryTable =
  | 'ce_detection_rules'
  | 'ce_calculation_rules'
  | 'ce_escalation_rules';

interface RuleHistoryRow {
  id: string;
  rule_table: string;
  rule_id: string;
  rule_code: string | null;
  action: string;
  before_value: any;
  after_value: any;
  changed_by: string | null;
  changed_at: string;
  notes: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ruleTable: RuleHistoryTable | null;
  ruleId: string | null;
  ruleLabel?: string;
}

const ACTION_TONE: Record<string, string> = {
  INSERT: 'bg-blue-100 text-blue-800',
  UPDATE: 'bg-amber-100 text-amber-800',
  ACTIVATE: 'bg-green-100 text-green-800',
  DEACTIVATE: 'bg-slate-200 text-slate-800',
  DELETE: 'bg-red-100 text-red-800',
};

function diffSummary(before: any, after: any): string[] {
  if (!before || !after) return [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changes: string[] = [];
  for (const k of keys) {
    if (k === 'updated_at' || k === 'updated_by') continue;
    const b = JSON.stringify(before[k] ?? null);
    const a = JSON.stringify(after[k] ?? null);
    if (b !== a) changes.push(`${k}: ${b} → ${a}`);
  }
  return changes;
}

export default function RuleHistoryDialog({
  open,
  onOpenChange,
  ruleTable,
  ruleId,
  ruleLabel,
}: Props) {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['ce_rule_history', ruleTable, ruleId],
    enabled: open && !!ruleTable && !!ruleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_rule_history' as any)
        .select('*')
        .eq('rule_table', ruleTable!)
        .eq('rule_id', ruleId!)
        .order('changed_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as RuleHistoryRow[];
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Rule History {ruleLabel ? `— ${ruleLabel}` : ''}</DialogTitle>
          <DialogDescription>
            Every create, update, activation, deactivation and delete recorded
            for this rule.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-3">
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No history recorded yet.
            </p>
          ) : (
            <ol className="relative border-l border-border pl-4 space-y-4">
              {rows.map(row => {
                const changes = diffSummary(row.before_value, row.after_value);
                return (
                  <li key={row.id} className="ml-2">
                    <div className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full bg-primary" />
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className={`text-[10px] border-transparent ${ACTION_TONE[row.action] ?? ''}`}
                      >
                        {row.action}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatAuditTimestamp(row.changed_at)}
                      </span>
                      {row.changed_by && (
                        <span className="text-xs text-muted-foreground">
                          by {row.changed_by}
                        </span>
                      )}
                    </div>
                    {changes.length > 0 && (
                      <ul className="mt-1.5 text-xs text-muted-foreground space-y-0.5 list-disc pl-4">
                        {changes.slice(0, 8).map((c, i) => (
                          <li key={i} className="font-mono break-all">
                            {c}
                          </li>
                        ))}
                        {changes.length > 8 && (
                          <li className="italic">
                            … {changes.length - 8} more field
                            {changes.length - 8 === 1 ? '' : 's'} changed
                          </li>
                        )}
                      </ul>
                    )}
                    {row.action === 'INSERT' && row.after_value && (
                      <p className="mt-1.5 text-xs text-muted-foreground italic">
                        Created with code {row.after_value.rule_code ?? '—'}.
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
