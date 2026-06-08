/**
 * Rule Configuration — Reusable rule group library
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Plus, Edit, BookOpen, Calculator, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useBnRuleGroups, useUpsertBnRuleGroup } from '@/hooks/bn/useBnConfig';
import { useUserCode } from '@/hooks/useUserCode';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { PageHeader } from '@/components/common/PageHeader';
import { BnEmptyState, BnFilterBar, BnScreenRoleBanner } from '@/components/bn/shared';
import { CodeFieldWithAutoGenerate } from '@/components/bn/smart';
import { useBnConfigAudit } from '@/hooks/bn/useBnConfigAudit';
import type { BnRuleGroup } from '@/types/bn';
import { RuleGroupLinkedRules } from '@/components/bn/ruleCatalogue/RuleGroupLinkedRules';
import { useRuleGroupLinkCounts } from '@/hooks/bn/useRuleGroupLinkCounts';

type RuleGroupForm = {
  id?: string;
  group_code: string;
  group_name: string;
  description: string;
  country_code: string;
  sort_order: number;
  is_active: boolean;
};

const emptyForm: RuleGroupForm = {
  group_code: '',
  group_name: '',
  description: '',
  country_code: '',
  sort_order: 0,
  is_active: true,
};

export default function RuleConfiguration() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<RuleGroupForm>(emptyForm);
  const { data: ruleGroups = [], isLoading } = useBnRuleGroups();
  const { data: linkCounts = {} } = useRuleGroupLinkCounts();
  const upsert = useUpsertBnRuleGroup();
  const { userCode } = useUserCode();
  const audit = useBnConfigAudit();

  const filtered = ruleGroups.filter((rg: BnRuleGroup) =>
    !search || rg.group_name?.toLowerCase().includes(search.toLowerCase()) ||
    rg.group_code?.toLowerCase().includes(search.toLowerCase())
  );

  const otherCodes = ruleGroups
    .filter((rg: BnRuleGroup) => rg.id !== form.id)
    .map((rg: BnRuleGroup) => rg.group_code);

  const openAdd = () => { setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (rg: BnRuleGroup) => {
    setForm({
      id: rg.id,
      group_code: rg.group_code,
      group_name: rg.group_name,
      description: rg.description ?? '',
      country_code: rg.country_code ?? '',
      sort_order: rg.sort_order ?? 0,
      is_active: rg.is_active ?? true,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.group_code.trim() || !form.group_name.trim()) {
      toast.error('Please check the form for valid information!', {
        description: 'Code and Name are required.',
      });
      return;
    }
    if (otherCodes.map(c => c.toUpperCase()).includes(form.group_code.trim().toUpperCase())) {
      toast.error('Duplicate code', { description: 'Another rule group already uses this code.' });
      return;
    }
    try {
      const before = form.id ? ruleGroups.find((rg: BnRuleGroup) => rg.id === form.id) ?? null : null;
      const saved = await upsert.mutateAsync({
        ...(form.id ? { id: form.id } : {}),
        group_code: form.group_code.trim(),
        group_name: form.group_name.trim(),
        description: form.description.trim() || null,
        country_code: form.country_code.trim() || null,
        sort_order: form.sort_order,
        is_active: form.is_active,
        entered_by: userCode ?? null,
      } as Partial<BnRuleGroup>);
      audit.log({
        entityType: 'bn_rule_group',
        entityId: (saved as any)?.id ?? form.id ?? 'new',
        action: form.id ? 'UPDATE' : 'CREATE',
        before, after: form,
      });
      toast.success(form.id ? 'Rule group updated' : 'Rule group created');
      setDialogOpen(false);
    } catch (e: any) {
      toast.error('Save failed', { description: e?.message ?? 'Unable to save rule group.' });
    }
  };

  return (
    <PermissionWrapper moduleName="bn_configuration">
      <div className="space-y-6 p-6">
        <PageHeader
          title="Rule Group Library"
          subtitle="Reusable classification labels for organizing product rules"
          breadcrumbs={[
            { label: 'Benefit Management', href: '/bn/claims' },
            { label: 'Configuration' },
            { label: 'Rule Group Library' },
          ]}
        />

        <BnScreenRoleBanner
          role="library"
          productAssemblyHint
          description="Rule Groups are classification labels for organizing rules inside Product Catalog. Actual benefit rules (eligibility, calculation, timeline) are defined in Product Catalog against a specific product version."
        />

        <Tabs defaultValue="groups" className="w-full">
          <TabsList>
            <TabsTrigger value="groups" className="gap-1.5"><BookOpen className="h-3.5 w-3.5" /> Rule Groups</TabsTrigger>
            <TabsTrigger value="eligibility" className="gap-1.5"><BookOpen className="h-3.5 w-3.5" /> Eligibility</TabsTrigger>
            <TabsTrigger value="calculation" className="gap-1.5"><Calculator className="h-3.5 w-3.5" /> Calculation</TabsTrigger>
            <TabsTrigger value="timeline" className="gap-1.5"><Clock className="h-3.5 w-3.5" /> Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="groups" className="mt-6">
            <Card>
              <CardHeader className="pb-3">
                <BnFilterBar
                  search={search}
                  onSearchChange={setSearch}
                  searchPlaceholder="Search rule groups..."
                  filters={[]}
                  actions={
                    <Button size="sm" className="gap-1.5" onClick={openAdd}>
                      <Plus className="h-3.5 w-3.5" /> Add Group
                    </Button>
                  }
                />
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <BnEmptyState type="loading" />
                ) : filtered.length === 0 ? (
                  <BnEmptyState type={search ? 'no-results' : 'empty'} title="No rule groups" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Country</TableHead>
                        <TableHead>Linked Rules</TableHead>
                        <TableHead>Active</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-[60px]">Edit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((rg: BnRuleGroup) => {
                        const count = linkCounts[rg.id] ?? 0;
                        return (
                        <TableRow key={rg.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEdit(rg)}>
                          <TableCell className="font-mono text-sm">{rg.group_code}</TableCell>
                          <TableCell className="font-medium text-sm">{rg.group_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{rg.country_code || 'Global'}</Badge>
                          </TableCell>
                          <TableCell><Badge variant={count > 0 ? 'secondary' : 'outline'}>{count}</Badge></TableCell>
                          <TableCell>{rg.is_active ? <Badge>Yes</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">{rg.description}</TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(rg)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );})}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="eligibility" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <BnEmptyState
                  type="empty"
                  title="Eligibility Rules"
                  description="Eligibility rules are configured per product version in the Product Editor."
                  action={{ label: 'Go to Product Catalog', onClick: () => window.location.href = '/bn/config/products' }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calculation" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <BnEmptyState
                  type="empty"
                  title="Calculation Rules"
                  description="Calculation rules are configured per product version in the Product Editor."
                  action={{ label: 'Go to Product Catalog', onClick: () => window.location.href = '/bn/config/products' }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <BnEmptyState
                  type="empty"
                  title="Timeline Rules"
                  description="Timeline rules (waiting periods, durations) are configured per product version in the Product Editor."
                  action={{ label: 'Go to Product Catalog', onClick: () => window.location.href = '/bn/config/products' }}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className={form.id ? "sm:max-w-6xl h-[88vh] flex flex-col p-0 gap-0" : "sm:max-w-lg"}>
            <DialogHeader className={form.id ? "px-6 pt-6 pb-3 border-b shrink-0" : ""}>
              <DialogTitle>{form.id ? 'Edit Rule Group' : 'Add Rule Group'}</DialogTitle>
              <DialogDescription>
                Define a reusable classification label. Used inside Product Catalog to organize rules.
              </DialogDescription>
            </DialogHeader>

            {form.id ? (
              <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[minmax(0,360px)_minmax(0,1fr)] gap-0 overflow-hidden">
                {/* Left: form */}
                <div className="space-y-4 p-6 overflow-y-auto border-r">
                  <CodeFieldWithAutoGenerate
                    label="Code"
                    required
                    prefix="RG"
                    value={form.group_code}
                    onChange={(v) => setForm({ ...form, group_code: v })}
                    existingCodes={otherCodes}
                    disabled={!!form.id}
                    helpText="Unique rule group code. Cannot be changed after creation."
                  />
                  <div className="space-y-1.5">
                    <Label htmlFor="rg_country">Country code</Label>
                    <Input id="rg_country" value={form.country_code} maxLength={3} placeholder="Leave blank for global"
                      onChange={(e) => setForm({ ...form, country_code: e.target.value.toUpperCase() })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rg_name">Name *</Label>
                    <Input id="rg_name" value={form.group_name} maxLength={120}
                      onChange={(e) => setForm({ ...form, group_name: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rg_desc">Description</Label>
                    <Textarea id="rg_desc" value={form.description} maxLength={500} rows={3}
                      onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  </div>
                  <div className="flex items-end justify-between gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="rg_sort">Sort order</Label>
                      <Input id="rg_sort" type="number" className="w-28" value={form.sort_order}
                        onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 0 })} />
                    </div>
                    <div className="flex items-center gap-2 pb-2">
                      <Switch id="rg_active" checked={form.is_active}
                        onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                      <Label htmlFor="rg_active">Active</Label>
                    </div>
                  </div>
                </div>
                {/* Right: linked rules */}
                <div className="p-6 overflow-y-auto min-w-0">
                  <RuleGroupLinkedRules groupId={form.id} groupCode={form.group_code} />
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <CodeFieldWithAutoGenerate
                    label="Code"
                    required
                    prefix="RG"
                    value={form.group_code}
                    onChange={(v) => setForm({ ...form, group_code: v })}
                    existingCodes={otherCodes}
                    disabled={!!form.id}
                    helpText="Unique rule group code. Cannot be changed after creation."
                  />
                  <div className="space-y-1.5">
                    <Label htmlFor="rg_country2">Country code</Label>
                    <Input id="rg_country2" value={form.country_code} maxLength={3} placeholder="Leave blank for global"
                      onChange={(e) => setForm({ ...form, country_code: e.target.value.toUpperCase() })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rg_name2">Name *</Label>
                  <Input id="rg_name2" value={form.group_name} maxLength={120}
                    onChange={(e) => setForm({ ...form, group_name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rg_desc2">Description</Label>
                  <Textarea id="rg_desc2" value={form.description} maxLength={500} rows={3}
                    onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="flex items-end justify-between gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="rg_sort2">Sort order</Label>
                    <Input id="rg_sort2" type="number" className="w-28" value={form.sort_order}
                      onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 0 })} />
                  </div>
                  <div className="flex items-center gap-2 pb-2">
                    <Switch id="rg_active2" checked={form.is_active}
                      onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                    <Label htmlFor="rg_active2">Active</Label>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className={form.id ? "px-6 py-4 border-t shrink-0" : ""}>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={upsert.isPending}>
                {upsert.isPending ? 'Saving…' : (form.id ? 'Save changes' : 'Create group')}
              </Button>
            </DialogFooter>
          </DialogContent>

        </Dialog>
      </div>
    </PermissionWrapper>
  );
}
