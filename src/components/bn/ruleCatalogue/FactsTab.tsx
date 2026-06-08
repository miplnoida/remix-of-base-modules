import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Copy, Trash2, Power, Search, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  useEligibilityFacts, useEligibilityFactUsage, useUpsertEligibilityFact,
  useCloneEligibilityFact, useDeleteEligibilityFact, useToggleEligibilityFactActive,
} from '@/hooks/bn/useEligibilityFacts';
import {
  describeFactSource, emptyFactInput, isResolverRegistered, sourceTypeBadgeVariant, statusBadgeVariant,
  type EligibilityFact, type EligibilityFactInput,
} from '@/services/bn/eligibilityFactService';
import { FactEditorDialog } from './FactEditorDialog';
import { getCurrentUserCode } from '@/services/bn/audit/getCurrentUserCode';

export function FactsTab() {
  const { data: facts = [], isLoading } = useEligibilityFacts();
  const { data: usage = {} } = useEligibilityFactUsage();
  const upsert = useUpsertEligibilityFact();
  const clone = useCloneEligibilityFact();
  const remove = useDeleteEligibilityFact();
  const toggle = useToggleEligibilityFactActive();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EligibilityFactInput>(emptyFactInput());
  const [isEdit, setIsEdit] = useState(false);

  const categories = useMemo(() => Array.from(new Set(facts.map(f => f.category))).sort(), [facts]);

  const filtered = useMemo(() => facts.filter(f => {
    if (categoryFilter !== 'ALL' && f.category !== categoryFilter) return false;
    if (statusFilter === 'ACTIVE' && !f.is_active) return false;
    if (statusFilter === 'INACTIVE' && f.is_active) return false;
    if (search) {
      const s = search.toLowerCase();
      return f.fact_key.toLowerCase().includes(s)
        || f.label.toLowerCase().includes(s)
        || (f.description ?? '').toLowerCase().includes(s);
    }
    return true;
  }), [facts, search, categoryFilter, statusFilter]);

  const openNew = () => { setEditing(emptyFactInput()); setIsEdit(false); setDialogOpen(true); };
  const openEdit = (f: EligibilityFact) => {
    const { id, created_at, updated_at, ...rest } = f;
    setEditing({ id, ...(rest as any) });
    setIsEdit(true);
    setDialogOpen(true);
  };

  const handleSave = async (v: EligibilityFactInput) => {
    const userCode = await getCurrentUserCode();
    if (!userCode) { toast.error('User code required'); return; }
    await upsert.mutateAsync({ input: v, userCode });
    setDialogOpen(false);
  };

  const handleClone = async (f: EligibilityFact) => {
    const newKey = window.prompt('New fact key (lowercase dot notation):', `${f.fact_key}_copy`);
    if (!newKey) return;
    const userCode = await getCurrentUserCode();
    if (!userCode) { toast.error('User code required'); return; }
    await clone.mutateAsync({ source: f, newFactKey: newKey.toLowerCase(), userCode });
  };

  const handleDelete = async (f: EligibilityFact) => {
    if ((usage[f.fact_key] ?? 0) > 0) {
      toast.error('Fact in use', { description: `Used by ${usage[f.fact_key]} rule(s). Deactivate instead.` });
      return;
    }
    if (!window.confirm(`Delete fact "${f.fact_key}"?`)) return;
    await remove.mutateAsync({ id: f.id, factKey: f.fact_key });
  };

  const handleToggle = async (f: EligibilityFact) => {
    const userCode = await getCurrentUserCode();
    if (!userCode) { toast.error('User code required'); return; }
    await toggle.mutateAsync({ id: f.id, isActive: !f.is_active, userCode });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle>Facts / Data Sources</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Computable values rules reference. Resolver code is developer-owned; select from registered resolvers only.
            </p>
          </div>
          <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Add Fact</Button>
        </div>
        <div className="flex gap-2 mt-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search fact key, label…" className="pl-8" />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All categories</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="py-8 text-center text-muted-foreground">Loading…</p> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fact Key</TableHead>
                <TableHead>Label / Category</TableHead>
                <TableHead>Source Type</TableHead>
                <TableHead>Source / Derivation</TableHead>
                <TableHead>Resolver</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Used By</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(f => {
                const used = usage[f.fact_key] ?? 0;
                const resolverOk = !f.resolver_function || isResolverRegistered(f.resolver_function);
                return (
                  <TableRow key={f.id}>
                    <TableCell className="font-mono text-xs align-top">{f.fact_key}</TableCell>
                    <TableCell className="align-top">
                      <div className="font-medium">{f.label}</div>
                      <Badge variant="outline" className="mt-1">{f.category}</Badge>
                    </TableCell>
                    <TableCell className="align-top">
                      <Badge variant={sourceTypeBadgeVariant(f.source_type)}>{f.source_type}</Badge>
                    </TableCell>
                    <TableCell className="text-xs align-top max-w-sm font-mono">
                      {describeFactSource(f)}
                      {f.source_type === 'DERIVED_AGGREGATE' && (f.window_size || f.window_type) && (
                        <div className="text-muted-foreground mt-1 not-italic">
                          Window: {f.window_size ?? '∞'} {f.window_type ?? ''} @ {f.window_anchor ?? '—'}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs align-top">
                      {f.resolver_function ?? '—'}
                      {f.resolver_function && !resolverOk && (
                        <Badge variant="destructive" className="ml-1 gap-1"><AlertTriangle className="h-3 w-3" /> missing</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs align-top">{f.data_type}</TableCell>
                    <TableCell className="align-top">
                      <Badge variant={statusBadgeVariant(f.implementation_status)}>{f.implementation_status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs align-top">{used}</TableCell>
                    <TableCell className="align-top">
                      <Badge variant={f.is_active ? 'default' : 'secondary'}>{f.is_active ? 'Yes' : 'No'}</Badge>
                    </TableCell>
                    <TableCell className="text-right align-top">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(f)} title="Edit"><Edit className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => handleClone(f)} title="Clone"><Copy className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => handleToggle(f)} title={f.is_active ? 'Deactivate' : 'Activate'}><Power className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(f)} title="Delete" disabled={used > 0}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No facts match the filters.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <FactEditorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        value={editing}
        isEdit={isEdit}
        onSave={handleSave}
        saving={upsert.isPending}
      />
    </Card>
  );
}
