/**
 * Formula Configuration — Reusable formula template library
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Plus, Edit, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useBnFormulaTemplates, useUpsertBnFormulaTemplate } from '@/hooks/bn/useBnConfig';
import { useUserCode } from '@/hooks/useUserCode';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { PageHeader } from '@/components/common/PageHeader';
import { BnEmptyState, BnFilterBar } from '@/components/bn/shared';
import type { BnFormulaTemplate } from '@/types/bn';

type FormulaForm = {
  id?: string;
  template_code: string;
  template_name: string;
  description: string;
  formula_expression: string;
  output_type: string;
  country_code: string;
  is_active: boolean;
};

const emptyForm: FormulaForm = {
  template_code: '',
  template_name: '',
  description: '',
  formula_expression: '',
  output_type: 'NUMBER',
  country_code: '',
  is_active: true,
};

export default function FormulaConfiguration() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormulaForm>(emptyForm);
  const { data: formulas = [], isLoading } = useBnFormulaTemplates();
  const upsert = useUpsertBnFormulaTemplate();
  const { userCode } = useUserCode();

  const filtered = formulas.filter((f: BnFormulaTemplate) =>
    !search || f.template_name?.toLowerCase().includes(search.toLowerCase()) ||
    f.template_code?.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (f: BnFormulaTemplate) => {
    setForm({
      id: f.id,
      template_code: f.template_code,
      template_name: f.template_name,
      description: f.description ?? '',
      formula_expression: f.formula_expression ?? '',
      output_type: f.output_type ?? 'NUMBER',
      country_code: f.country_code ?? '',
      is_active: f.is_active ?? true,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.template_code.trim() || !form.template_name.trim() || !form.formula_expression.trim()) {
      toast.error('Please check the form for valid information!', {
        description: 'Code, Name and Expression are required.',
      });
      return;
    }
    try {
      await upsert.mutateAsync({
        ...(form.id ? { id: form.id } : {}),
        template_code: form.template_code.trim(),
        template_name: form.template_name.trim(),
        description: form.description.trim() || null,
        formula_expression: form.formula_expression,
        output_type: form.output_type,
        country_code: form.country_code.trim() || null,
        is_active: form.is_active,
        entered_by: userCode ?? null,
      } as Partial<BnFormulaTemplate>);
      toast.success(form.id ? 'Formula updated' : 'Formula created');
      setDialogOpen(false);
    } catch (e: any) {
      toast.error('Save failed', { description: e?.message ?? 'Unable to save formula.' });
    }
  };

  return (
    <PermissionWrapper moduleName="bn_configuration">
      <div className="space-y-6 p-6">
        <PageHeader
          title="Formula Templates"
          subtitle="Reusable calculation formula library"
          breadcrumbs={[
            { label: 'Benefit Management', href: '/bn/claims' },
            { label: 'Configuration' },
            { label: 'Formula Templates' },
          ]}
        />

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Library screen — formulas are attached inside Product Catalog</AlertTitle>
          <AlertDescription>
            Formula Templates are reusable calculation building blocks. To assign a formula to a benefit
            product, open Product Catalog → select the product version → Calculation tab.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader className="pb-3">
            <BnFilterBar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search formulas..."
              filters={[]}
              actions={
                <Button size="sm" className="gap-1.5" onClick={openAdd}>
                  <Plus className="h-3.5 w-3.5" /> Add Formula
                </Button>
              }
            />
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <BnEmptyState type="loading" />
            ) : filtered.length === 0 ? (
              <BnEmptyState type={search ? 'no-results' : 'empty'} title="No formula templates" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Output</TableHead>
                    <TableHead>Expression</TableHead>
                    <TableHead className="w-[60px]">Edit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((f: BnFormulaTemplate) => (
                    <TableRow key={f.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEdit(f)}>
                      <TableCell className="font-mono text-sm">{f.template_code}</TableCell>
                      <TableCell className="font-medium text-sm">{f.template_name}</TableCell>
                      <TableCell><Badge variant="outline">{f.output_type || '—'}</Badge></TableCell>
                      <TableCell className="max-w-[300px] truncate font-mono text-xs text-muted-foreground">{f.formula_expression || '—'}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(f)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>{form.id ? 'Edit Formula Template' : 'Add Formula Template'}</DialogTitle>
              <DialogDescription>
                Reusable calculation block. Assign to products inside Product Catalog → Calculation.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="fm_code">Code *</Label>
                  <Input id="fm_code" value={form.template_code} maxLength={50}
                    onChange={(e) => setForm({ ...form, template_code: e.target.value.toUpperCase() })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fm_country">Country code</Label>
                  <Input id="fm_country" value={form.country_code} maxLength={3} placeholder="e.g. KN"
                    onChange={(e) => setForm({ ...form, country_code: e.target.value.toUpperCase() })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fm_name">Name *</Label>
                <Input id="fm_name" value={form.template_name} maxLength={120}
                  onChange={(e) => setForm({ ...form, template_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fm_desc">Description</Label>
                <Textarea id="fm_desc" value={form.description} maxLength={500} rows={2}
                  onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fm_expr">Expression *</Label>
                <Textarea id="fm_expr" value={form.formula_expression} rows={3} className="font-mono text-xs"
                  placeholder="e.g. avg_wage * 0.6 * weeks"
                  onChange={(e) => setForm({ ...form, formula_expression: e.target.value })} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1.5">
                  <Label htmlFor="fm_out">Output type</Label>
                  <Input id="fm_out" value={form.output_type} className="w-40"
                    onChange={(e) => setForm({ ...form, output_type: e.target.value.toUpperCase() })} />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch id="fm_active" checked={form.is_active}
                    onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                  <Label htmlFor="fm_active">Active</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={upsert.isPending}>
                {upsert.isPending ? 'Saving…' : (form.id ? 'Save changes' : 'Create formula')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionWrapper>
  );
}
