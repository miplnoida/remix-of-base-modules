/**
 * Add Rule Group from Catalogue — pick an existing Rule Group, preview all
 * active linked catalogue rules with coverage status, then insert one
 * bn_eligibility_rule per linked rule onto the product version.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useBnRuleGroups } from '@/hooks/bn/useBnConfig';
import { useEligibilityFacts } from '@/hooks/bn/useEligibilityFacts';
import { getCurrentUserCode } from '@/services/bn/audit/getCurrentUserCode';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  versionId: string;
  onAdded?: () => void;
}

export function AddRuleGroupFromCatalogueDialog({ open, onOpenChange, versionId, onAdded }: Props) {
  const { data: groups = [] } = useBnRuleGroups();
  const { data: facts = [] } = useEligibilityFacts();
  const [groupId, setGroupId] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const factByKey = useMemo(() => {
    const m = new Map<string, any>();
    for (const f of facts) m.set(f.fact_key, f);
    return m;
  }, [facts]);

  const { data: linked = [] } = useQuery({
    queryKey: ['bn', 'group-linked-active', groupId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('bn_rule_catalogue')
        .select('id, rule_code, rule_name, fact_key, operator, value_from, value_to, values, default_fail_action, failure_message_text, version, default_rule_sort_order')
        .eq('rule_group_id', groupId)
        .eq('is_active', true)
        .order('default_rule_sort_order', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!groupId,
  });

  const coverage = (factKey: string | null): { label: string; ok: boolean } => {
    if (!factKey) return { label: 'NO FACT', ok: false };
    const f = factByKey.get(factKey);
    if (!f) return { label: 'UNLINKED', ok: false };
    if (f.implementation_status === 'NOT_IMPLEMENTED') return { label: 'NOT_IMPLEMENTED', ok: false };
    return { label: f.implementation_status, ok: true };
  };

  const handleAdd = async () => {
    if (!groupId || linked.length === 0) { onOpenChange(false); return; }
    const userCode = await getCurrentUserCode();
    if (!userCode) { toast.error('Authenticated user_code required'); return; }
    const group = (groups as any[]).find(g => g.id === groupId);
    setBusy(true);
    try {
      const rows = linked.map((r: any, i: number) => ({
        product_version_id: versionId,
        rule_group_id: groupId,
        group_code: group?.group_code ?? null,
        catalogue_rule_id: r.id,
        catalogue_rule_code: r.rule_code,
        catalogue_rule_version: r.version,
        rule_code: r.rule_code,
        rule_name: r.rule_name,
        rule_type: 'CATALOGUE',
        rule_group: group?.group_code ?? 'GENERAL',
        fact_key: r.fact_key,
        rule_definition: {
          parameter: r.rule_code,
          operator: r.operator,
          value_from: r.value_from,
          value_to: r.value_to,
          values: r.values,
        },
        fail_action: r.default_fail_action,
        fail_message: r.failure_message_text,
        sort_order: i,
        is_active: true,
        entered_by: userCode,
      }));
      const { error } = await (supabase as any)
        .from('bn_eligibility_rule')
        .upsert(rows, { onConflict: 'product_version_id,rule_code' });
      if (error) throw error;
      toast.success(`${rows.length} rule(s) added from group ${group?.group_code}`);
      setGroupId('');
      onAdded?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error('Add failed', { description: e?.message });
    } finally {
      setBusy(false);
    }
  };

  const blockingCount = linked.filter((r: any) => !coverage(r.fact_key).ok).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Rule Group from Catalogue</DialogTitle>
          <DialogDescription>Select a Rule Group; all its active linked catalogue rules will be added to this product version.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Select value={groupId} onValueChange={setGroupId}>
            <SelectTrigger><SelectValue placeholder="Select an existing Rule Group" /></SelectTrigger>
            <SelectContent className="max-h-72">
              {(groups as any[]).filter(g => g.is_active).map(g => (
                <SelectItem key={g.id} value={g.id}>{g.group_code} — {g.group_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {groupId && (
            <>
              {linked.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No active catalogue rules linked to this group.</p>
              ) : (
                <>
                  {blockingCount > 0 && (
                    <p className="text-xs text-destructive">
                      {blockingCount} rule(s) have missing/unimplemented facts and may block publish.
                    </p>
                  )}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Fact</TableHead>
                        <TableHead>Op</TableHead>
                        <TableHead>Default</TableHead>
                        <TableHead>Coverage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {linked.map((r: any) => {
                        const c = coverage(r.fact_key);
                        return (
                          <TableRow key={r.id}>
                            <TableCell className="font-mono text-xs">{r.rule_code}</TableCell>
                            <TableCell className="text-xs">{r.rule_name}</TableCell>
                            <TableCell className="font-mono text-xs">{r.fact_key ?? '—'}</TableCell>
                            <TableCell className="text-xs">{r.operator}</TableCell>
                            <TableCell className="text-xs">{r.value_from ?? '(per product)'}</TableCell>
                            <TableCell><Badge variant={c.ok ? 'default' : 'destructive'}>{c.label}</Badge></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAdd} disabled={busy || !groupId || linked.length === 0}>
            {busy ? 'Adding…' : `Add ${linked.length} rule(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
