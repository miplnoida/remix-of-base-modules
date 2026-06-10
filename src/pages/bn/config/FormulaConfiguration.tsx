/**
 * Formula Configuration — Reusable formula template library
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Edit } from 'lucide-react';
import { toast } from 'sonner';
import { useBnFormulaTemplates, useUpsertBnFormulaTemplate } from '@/hooks/bn/useBnConfig';
import { useUserCode } from '@/hooks/useUserCode';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { PageHeader } from '@/components/common/PageHeader';
import { BnScreenRoleBanner } from '@/components/bn/shared';
import { CodeFieldWithAutoGenerate, FormulaBuilder, SmartSelect } from '@/components/bn/smart';
import { useBnConfigAudit } from '@/hooks/bn/useBnConfigAudit';
import { parseFormula } from '@/lib/bn/formulaParser';
import { FormulaTestPanel } from '@/components/bn/config/FormulaTestPanel';
import type { BnFormulaTemplate } from '@/types/bn';
import { BNDataGrid, type BNColumnDef } from '@/components/bn/grid';

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

const OUTPUT_TYPES = [
  { value: 'NUMBER', label: 'Number' },
  { value: 'MONEY', label: 'Money' },
  { value: 'PERCENT', label: 'Percent' },
];

export default function FormulaConfiguration() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormulaForm>(emptyForm);
  const { data: formulas = [], isLoading } = useBnFormulaTemplates();
  const upsert = useUpsertBnFormulaTemplate();
  const { userCode } = useUserCode();
  const audit = useBnConfigAudit();


  const otherCodes = formulas
    .filter((f: BnFormulaTemplate) => f.id !== form.id)
    .map((f: BnFormulaTemplate) => f.template_code);

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
    // Block duplicate codes
    if (otherCodes.map(c => c.toUpperCase()).includes(form.template_code.trim().toUpperCase())) {
      toast.error('Duplicate code', { description: 'Another formula already uses this code.' });
      return;
    }
    // Validate formula against the registry
    const parsed = parseFormula(form.formula_expression);
    if (!parsed.valid) {
      toast.error('Formula is invalid', { description: parsed.errors.join('; ') });
      return;
    }
    try {
      const before = form.id ? formulas.find((f: BnFormulaTemplate) => f.id === form.id) ?? null : null;
      const saved = await upsert.mutateAsync({
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
      audit.log({
        entityType: 'bn_formula_template',
        entityId: (saved as any)?.id ?? form.id ?? 'new',
        action: form.id ? 'UPDATE' : 'CREATE',
        before,
        after: { ...form, variables_used: parsed.variablesUsed },
      });
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
          title="Formula Library"
          subtitle="Reusable calculation formula library"
          breadcrumbs={[
            { label: 'Benefit Management', href: '/bn/claims' },
            { label: 'Configuration' },
            { label: 'Formula Library' },
          ]}
        />

        <BnScreenRoleBanner
          role="library"
          productAssemblyHint
          description="Reusable calculation building blocks. To assign a formula to a benefit product, open Product Catalog → select the product version → Calculation tab."
        />

        <BNDataGrid<BnFormulaTemplate>
          id="bn.formula-library"
          columns={[
            { accessorKey: 'template_code', header: 'Code', meta: { label: 'Code', pinLeft: true, width: 160 }, cell: ({ getValue }) => <span className="font-mono text-sm">{String(getValue() ?? '')}</span> },
            { accessorKey: 'template_name', header: 'Name', meta: { label: 'Name', width: 260 }, cell: ({ getValue }) => <span className="font-medium text-sm">{String(getValue() ?? '')}</span> },
            { accessorKey: 'output_type', header: 'Output', meta: { label: 'Output', width: 120 }, cell: ({ getValue }) => <Badge variant="outline">{String(getValue() ?? '—')}</Badge> },
            { accessorKey: 'formula_expression', header: 'Expression', meta: { label: 'Expression', width: 380 }, cell: ({ getValue }) => <span className="font-mono text-xs text-muted-foreground">{String(getValue() ?? '—')}</span> },
            { accessorKey: 'country_code', header: 'Country', meta: { label: 'Country', width: 100 }, cell: ({ getValue }) => <Badge variant="outline">{String(getValue() || 'Global')}</Badge> },
            { accessorKey: 'is_active', header: 'Active', meta: { label: 'Active', width: 90 }, cell: ({ getValue }) => getValue() ? <Badge>Yes</Badge> : <Badge variant="secondary">No</Badge> },
          ] as BNColumnDef<BnFormulaTemplate>[]}
          data={formulas as BnFormulaTemplate[]}
          isLoading={isLoading}
          searchPlaceholder="Search formulas..."
          defaultSort={[{ id: 'template_code', desc: false }]}
          onCreate={openAdd}
          onRowClick={(f) => openEdit(f)}
          rowActions={[
            { key: 'edit', label: 'Edit', icon: <Edit className="h-3.5 w-3.5" />, onClick: (f) => openEdit(f) },
          ]}
          exportFilename="bn_formula_library"
          emptyMessage="No formula templates yet. Click Create to add one."
        />


        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{form.id ? 'Edit Formula Template' : 'Add Formula Template'}</DialogTitle>
              <DialogDescription>
                Reusable calculation block. Pick variables from the registry — unknown variable names are rejected.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <CodeFieldWithAutoGenerate
                  label="Code"
                  required
                  prefix="FRM"
                  value={form.template_code}
                  onChange={(v) => setForm({ ...form, template_code: v })}
                  existingCodes={otherCodes}
                  disabled={!!form.id}
                  helpText="Unique formula code. Cannot be changed after creation."
                />
                <div className="space-y-1.5">
                  <Label htmlFor="fm_country">Country code</Label>
                  <Input id="fm_country" value={form.country_code} maxLength={3} placeholder="Leave blank for global"
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
              <FormulaBuilder
                value={form.formula_expression}
                onChange={(v) => setForm({ ...form, formula_expression: v })}
              />
              <FormulaTestPanel expression={form.formula_expression} outputType={form.output_type} />
              <div className="flex items-end justify-between gap-4">
                <div className="w-48">
                  <SmartSelect
                    label="Output type"
                    options={OUTPUT_TYPES}
                    value={form.output_type}
                    onValueChange={(v) => setForm({ ...form, output_type: v })}
                  />
                </div>
                <div className="flex items-center gap-2 pb-2">
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
