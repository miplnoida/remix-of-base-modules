import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Info, Sparkles, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  CALCULATION_FAMILIES,
  CALCULATION_PATTERNS,
  APPLIES_TO_OPTIONS,
  FUND_TYPES,
  SOURCE_CONFIG_OPTIONS,
  FormulaTerm,
  generateFormulaFromTerms,
  getFamilyTemplate,
  convertLegacyToTerms,
  createBlankTerm,
} from './calculationConstants';
import { FormulaBuilder } from './FormulaBuilder';

interface CalculationRule {
  id: string;
  rule_code: string;
  name: string;
  description: string | null;
  applies_to: string;
  formula_expression: string;
  fund_type: string | null;
  source_config: string | null;
  is_enabled: boolean | null;
  violation_type_id: string | null;
  parameters?: Record<string, any> | null;
}

interface ViolationType {
  id: string;
  code: string;
  name: string;
}

function generateNextCode(existingCodes: string[], prefix: string): string {
  const nums = existingCodes
    .filter(c => c.startsWith(prefix))
    .map(c => parseInt(c.replace(prefix, ''), 10))
    .filter(n => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rule: CalculationRule | null;
  violationTypes: ViolationType[];
  onSave: (data: any) => void;
  saving: boolean;
  existingCodes: string[];
}

export const EnhancedCalculationRuleDialog = ({ open, onOpenChange, rule, violationTypes, onSave, saving, existingCodes }: Props) => {
  const isEdit = !!rule;
  const existingParams = rule?.parameters || {};

  const [form, setForm] = useState({
    rule_code: '',
    name: '',
    description: '',
    family: (existingParams as any)?.family || 'custom',
    applies_to: 'penalty',
    pattern: (existingParams as any)?.pattern || 'fixed',
    fund_type: '',
    source_config: 'c3_config_details',
    is_enabled: true,
    violation_type_id: '',
    formula_expression: '',
  });

  const [terms, setTerms] = useState<FormulaTerm[]>([]);

  useEffect(() => {
    if (open) {
      const autoCode = isEdit ? (rule?.rule_code || '') : generateNextCode(existingCodes, 'CR-');
      const params = (rule?.parameters || {}) as any;

      setForm({
        rule_code: autoCode,
        name: rule?.name || '',
        description: rule?.description || '',
        family: params?.family || 'custom',
        applies_to: rule?.applies_to || 'penalty',
        pattern: params?.pattern || 'fixed',
        fund_type: rule?.fund_type || '',
        source_config: rule?.source_config || 'c3_config_details',
        is_enabled: rule?.is_enabled ?? true,
        violation_type_id: rule?.violation_type_id || '',
        formula_expression: rule?.formula_expression || '',
      });

      // Load terms from parameters (new format) or convert legacy
      const loadedTerms = convertLegacyToTerms(params);
      if (loadedTerms && loadedTerms.length > 0) {
        setTerms(loadedTerms);
      } else {
        // Start with one blank term
        setTerms([createBlankTerm(null)]);
      }
    }
  }, [open, rule]);

  // When family changes, apply defaults and offer template
  const handleFamilyChange = (familyValue: string) => {
    const fam = CALCULATION_FAMILIES.find(f => f.value === familyValue);
    if (fam) {
      setForm(p => ({
        ...p,
        family: familyValue,
        pattern: fam.defaultPattern,
        fund_type: fam.defaultFundType,
        applies_to: fam.defaultAppliesTo,
        name: isEdit ? p.name : fam.label,
        description: isEdit ? p.description : fam.description,
      }));
    } else {
      setForm(p => ({ ...p, family: familyValue }));
    }
  };

  const loadTemplate = () => {
    const template = getFamilyTemplate(form.family);
    if (template) {
      setTerms(template);
      toast.success('Template loaded — you can customize the factors');
    } else {
      toast.info('No template available for this family');
    }
  };

  // Auto-generate formula expression from terms
  const formulaPreview = useMemo(() => generateFormulaFromTerms(terms), [terms]);

  const handleSave = () => {
    if (!form.name || !form.family) {
      toast.error('Please check the form for valid information!', {
        description: 'Name and Calculation Family are required.',
        style: { backgroundColor: 'hsl(var(--destructive))', color: 'white', '--description-color': 'white' } as React.CSSProperties,
        classNames: { toast: '!bg-destructive', title: '!text-white', description: '!text-white !opacity-100' },
      });
      return;
    }

    const finalFormula = form.formula_expression || formulaPreview;

    onSave({
      rule_code: form.rule_code,
      name: form.name,
      description: form.description || null,
      applies_to: form.applies_to,
      formula_expression: finalFormula,
      fund_type: form.fund_type || null,
      source_config: form.source_config || null,
      is_enabled: form.is_enabled,
      violation_type_id: form.violation_type_id || null,
      parameters: {
        family: form.family,
        pattern: form.pattern,
        terms: terms,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {isEdit ? 'Edit Calculation Rule' : 'Create Calculation Rule'}
          </DialogTitle>
          <DialogDescription>
            Build multi-factor formulas by combining base metrics, rates, derived values, and constants into terms.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* ── Section 1: Identity ── */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">1</span>
              Rule Identity
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Rule Code</Label>
                <Input value={form.rule_code} readOnly className="bg-muted text-muted-foreground cursor-not-allowed font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label>Name <span className="text-destructive">*</span></Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. SS Fine Calculation" />
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Business description of this calculation..." rows={2} />
            </div>
          </div>

          <Separator />

          {/* ── Section 2: Calculation Family & Pattern ── */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">2</span>
              Calculation Family & Pattern
              <span className="text-xs text-muted-foreground font-normal">— What type of calculation is this?</span>
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Family <span className="text-destructive">*</span></Label>
                <Select value={form.family} onValueChange={handleFamilyChange}>
                  <SelectTrigger><SelectValue placeholder="Select family..." /></SelectTrigger>
                  <SelectContent>
                    {CALCULATION_FAMILIES.map(f => (
                      <SelectItem key={f.value} value={f.value}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{f.label}</span>
                          <span className="text-xs text-muted-foreground">— {f.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Pattern</Label>
                <Select value={form.pattern} onValueChange={v => setForm(p => ({ ...p, pattern: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CALCULATION_PATTERNS.map(p => (
                      <SelectItem key={p.value} value={p.value}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{p.label}</span>
                          <span className="text-xs text-muted-foreground">— {p.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.family && form.family !== 'custom' && (
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {CALCULATION_FAMILIES.find(f => f.value === form.family)?.defaultAppliesTo}
                </Badge>
                {CALCULATION_FAMILIES.find(f => f.value === form.family)?.defaultFundType && (
                  <Badge variant="secondary" className="text-xs">
                    {CALCULATION_FAMILIES.find(f => f.value === form.family)?.defaultFundType}
                  </Badge>
                )}
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs ml-auto" onClick={loadTemplate}>
                  <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                  Load Template
                </Button>
              </div>
            )}
          </div>

          <Separator />

          {/* ── Section 3: Formula Builder ── */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">3</span>
              Formula Builder
              <span className="text-xs text-muted-foreground font-normal">— Compose your formula by adding terms and factors</span>
            </h3>
            <p className="text-[10px] text-muted-foreground mb-3 ml-7">
              Each <strong>Term</strong> is a group of factors multiplied together. Terms are connected with <strong>+</strong> or <strong>−</strong>.
              Click a factor type badge to add operands. Drag terms to reorder.
            </p>
            <FormulaBuilder terms={terms} onChange={setTerms} />
          </div>

          <Separator />

          {/* ── Section 4: Overrides & Config ── */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">4</span>
              Overrides & Configuration
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Applies To</Label>
                <Select value={form.applies_to} onValueChange={v => setForm(p => ({ ...p, applies_to: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {APPLIES_TO_OPTIONS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Fund Type</Label>
                <Select value={form.fund_type || '__all__'} onValueChange={v => setForm(p => ({ ...p, fund_type: v === '__all__' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="All Funds" /></SelectTrigger>
                  <SelectContent>
                    {FUND_TYPES.map(f => <SelectItem key={f.value || '__all__'} value={f.value || '__all__'}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Source Config</Label>
                <Select value={form.source_config} onValueChange={v => setForm(p => ({ ...p, source_config: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SOURCE_CONFIG_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Formula Override <span className="font-normal">(advanced — overrides the auto-generated formula)</span></Label>
              <Textarea
                value={form.formula_expression}
                onChange={e => setForm(p => ({ ...p, formula_expression: e.target.value }))}
                placeholder="Leave empty to use the formula builder output above..."
                rows={2}
                className="font-mono text-xs"
              />
            </div>
          </div>

          <Separator />

          {/* ── Section 5: Scope & Output ── */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">5</span>
              Scope & Output
            </h3>
            <div className="space-y-1.5">
              <Label>Linked Violation Type <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
              <Select value={form.violation_type_id || '__none__'} onValueChange={v => setForm(p => ({ ...p, violation_type_id: v === '__none__' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="All violation types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">All Violation Types</SelectItem>
                  {violationTypes.map(vt => <SelectItem key={vt.id} value={vt.id}>{vt.code} – {vt.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-3">
              <Checkbox checked={form.is_enabled} onCheckedChange={c => setForm(p => ({ ...p, is_enabled: !!c }))} />
              <Label className="font-normal text-sm">Enabled</Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? 'Update Rule' : 'Create Rule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
