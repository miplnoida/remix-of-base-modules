/**
 * Linked Rules — shown inside the existing Rule Group edit dialog.
 * Lists Rule Catalogue rules linked to this group, allows reorder/unlink, and
 * surfaces per-rule and aggregate group readiness.
 */
import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowUp, ArrowDown, Unlink2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useEligibilityFacts } from '@/hooks/bn/useEligibilityFacts';

interface Props { groupId: string; groupCode: string; }

interface CatRow {
  id: string;
  rule_code: string;
  rule_name: string;
  fact_key: string | null;
  operator: string;
  is_active: boolean;
  default_rule_sort_order: number;
}

async function fetchLinkedRules(groupId: string): Promise<CatRow[]> {
  const { data, error } = await (supabase as any)
    .from('bn_rule_catalogue')
    .select('id, rule_code, rule_name, fact_key, operator, is_active, default_rule_sort_order')
    .eq('rule_group_id', groupId)
    .order('default_rule_sort_order', { ascending: true })
    .order('rule_code', { ascending: true });
  if (error) throw error;
  return data || [];
}

export function RuleGroupLinkedRules({ groupId, groupCode }: Props) {
  const qc = useQueryClient();
  const { data: facts = [] } = useEligibilityFacts();
  const factByKey = useMemo(() => {
    const m = new Map<string, any>();
    for (const f of facts) m.set(f.fact_key, f);
    return m;
  }, [facts]);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['bn', 'rule-group-linked', groupId],
    queryFn: () => fetchLinkedRules(groupId),
    enabled: !!groupId,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['bn', 'rule-group-linked', groupId] });
    qc.invalidateQueries({ queryKey: ['bn', 'rule-catalogue'] });
  };

  const updateSort = useMutation({
    mutationFn: async (rows: { id: string; default_rule_sort_order: number }[]) => {
      for (const r of rows) {
        const { error } = await (supabase as any)
          .from('bn_rule_catalogue')
          .update({ default_rule_sort_order: r.default_rule_sort_order })
          .eq('id', r.id);
        if (error) throw error;
      }
    },
    onSuccess: () => { invalidate(); toast.success('Order updated'); },
    onError: (e: any) => toast.error('Reorder failed', { description: e?.message }),
  });

  const unlink = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('bn_rule_catalogue')
        .update({ rule_group_id: null, rule_group_code: null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Rule unlinked'); },
    onError: (e: any) => toast.error('Unlink failed', { description: e?.message }),
  });

  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= rules.length) return;
    const a = rules[idx]; const b = rules[j];
    updateSort.mutate([
      { id: a.id, default_rule_sort_order: j },
      { id: b.id, default_rule_sort_order: idx },
    ]);
  };

  const readiness = (r: CatRow): { label: string; variant: 'default' | 'secondary' | 'destructive' } => {
    if (!r.fact_key) return { label: 'BLOCKED', variant: 'destructive' };
    const f = factByKey.get(r.fact_key);
    if (!f) return { label: 'BLOCKED', variant: 'destructive' };
    if (f.implementation_status === 'NOT_IMPLEMENTED') return { label: 'BLOCKED', variant: 'destructive' };
    if (f.implementation_status === 'PARTIAL') return { label: 'WARNING', variant: 'secondary' };
    return { label: 'READY', variant: 'default' };
  };

  const groupStatus = useMemo(() => {
    const active = rules.filter(r => r.is_active);
    if (!active.length) return { label: 'EMPTY', variant: 'secondary' as const };
    let warn = false;
    for (const r of active) {
      const s = readiness(r).label;
      if (s === 'BLOCKED') return { label: 'BLOCKED', variant: 'destructive' as const };
      if (s === 'WARNING') warn = true;
    }
    return warn ? { label: 'WARNING', variant: 'secondary' as const } : { label: 'READY', variant: 'default' as const };
  }, [rules, factByKey]);

  return (
    <div className="space-y-3 border-t pt-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Linked Catalogue Rules</div>
          <p className="text-xs text-muted-foreground">Rules from Rule Catalogue linked to group <span className="font-mono">{groupCode}</span>.</p>
        </div>
        <Badge variant={groupStatus.variant}>Group: {groupStatus.label}</Badge>
      </div>
      {isLoading ? (
        <p className="text-xs text-muted-foreground py-2">Loading…</p>
      ) : rules.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">No catalogue rules linked yet. Open Rule Catalogue → edit a rule → set this group.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Order</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Fact</TableHead>
              <TableHead>Op</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Readiness</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((r, i) => {
              const rd = readiness(r);
              return (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp className="h-3 w-3" /></Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => move(i, 1)} disabled={i === rules.length - 1}><ArrowDown className="h-3 w-3" /></Button>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.rule_code}</TableCell>
                  <TableCell className="text-xs">{r.rule_name}</TableCell>
                  <TableCell className="font-mono text-xs">{r.fact_key ?? '—'}</TableCell>
                  <TableCell className="text-xs">{r.operator}</TableCell>
                  <TableCell>{r.is_active ? <Badge>Yes</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                  <TableCell><Badge variant={rd.variant}>{rd.label}</Badge></TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" className="h-6 w-6" title="Unlink from group" onClick={() => unlink.mutate(r.id)}>
                      <Unlink2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
