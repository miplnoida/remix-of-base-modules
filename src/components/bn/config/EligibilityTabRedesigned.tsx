/**
 * Eligibility Tab — Redesigned (Phase 1)
 *
 * Goal: clean, business-friendly view of eligibility rules for a product.
 * - Summary cards
 * - Rule Groups (collapsible cards, friendly sentence per rule)
 * - Product Parameters auto-derived from rules with missing values
 * - Add Rule via existing Wizard
 * - Advanced details hidden behind a per-rule toggle
 *
 * Phase 2 will add a dedicated bn_product_parameter table and a real
 * Test Eligibility runner against live data.
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Plus, Trash2, ChevronDown, ChevronRight, Wand2, Library, FolderPlus, LayoutGrid,
  ShieldAlert, ShieldCheck, Info, AlertTriangle, CheckCircle2, ScrollText, FlaskConical,
  Pencil, Scale,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useBnEligibilityRules,
  useUpsertBnEligibilityRule,
  useDeleteBnEligibilityRule,
} from '@/hooks/bn/useBnProduct';
import type { BnEligibilityRule } from '@/types/bn';
import { getFieldDef, ELIGIBILITY_OPERATOR_LABELS, type EligibilityOperator } from '@/services/bn/eligibility/fieldRegistry';
import { RULE_GROUPS } from '@/services/bn/eligibility/eligibilityFactRegistry';
import { RuleWizardDialog } from './RuleWizardDialog';
import { CataloguePickerDialog } from './CataloguePickerDialog';
import { AddRuleGroupFromCatalogueDialog } from './AddRuleGroupFromCatalogueDialog';
import { AddRulesByCategoryDialog } from './AddRulesByCategoryDialog';
import { EligibilityConflictPanel } from './EligibilityConflictPanel';
import { ReadOnlyVersionBanner } from './ReadOnlyVersionBanner';
import { TestEligibilityDialog } from './TestEligibilityDialog';

interface Props {
  versionId: string | undefined;
  isReadOnly?: boolean;
  versionStatus?: string | null;
  productCode?: string | null;
}

const UNGROUPED = 'SPECIAL';

export function EligibilityTabRedesigned({ versionId, isReadOnly, versionStatus, productCode }: Props) {
  const { toast } = useToast();
  const { data: rules = [], isLoading } = useBnEligibilityRules(versionId);
  const upsertMutation = useUpsertBnEligibilityRule();
  const deleteMutation = useDeleteBnEligibilityRule();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [groupPickerOpen, setGroupPickerOpen] = useState(false);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [wizardInitial, setWizardInitial] = useState<Partial<BnEligibilityRule> | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(RULE_GROUPS.map((g) => [g.code, true])),
  );
  const [advancedOpen, setAdvancedOpen] = useState<Record<string, boolean>>({});
  const [testOpen, setTestOpen] = useState(false);

  if (!versionId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Select or create a product version first.
        </CardContent>
      </Card>
    );
  }

  // ── Summary metrics ─────────────────────────────────────────────────────
  const summary = useMemo(() => {
    let blocking = 0, warning = 0, infoCount = 0, legalPending = 0, missingParams = 0;
    const parameterRows: Array<{ rule: BnEligibilityRule; label: string; unit?: string }> = [];

    for (const r of rules) {
      const sev = (r.severity || '').toUpperCase();
      if (sev === 'BLOCK' || sev === 'BLOCKING' || r.fail_action === 'REJECT') blocking++;
      else if (sev === 'WARN' || sev === 'WARNING') warning++;
      else if (sev === 'INFO') infoCount++;

      const rd = (r.rule_definition || {}) as Record<string, unknown>;
      const hasValue =
        rd.value !== undefined && rd.value !== null && rd.value !== '' ||
        (rd.range_from !== undefined && rd.range_from !== '') ||
        rd.field_key === undefined;
      if (rd.field_key && !hasValue && rd.operator && !['exists', 'not_exists', 'EXISTS', 'NOT_EXISTS'].includes(String(rd.operator))) {
        missingParams++;
        const fd = getFieldDef(String(rd.field_key));
        parameterRows.push({ rule: r, label: fd?.label || r.rule_name, unit: fd?.valueType });
      }
      // legal confirmation pending: rule flagged but not yet acknowledged
      if ((r as any).legal_status === 'PENDING') legalPending++;
    }
    return { total: rules.length, blocking, warning, infoCount, missingParams, legalPending, parameterRows };
  }, [rules]);

  // ── Group rules ────────────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const map = new Map<string, BnEligibilityRule[]>();
    for (const g of RULE_GROUPS) map.set(g.code, []);
    for (const r of rules) {
      const key = r.group_code && map.has(r.group_code) ? r.group_code : UNGROUPED;
      map.get(key)!.push(r);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.rule_name.localeCompare(b.rule_name));
    }
    return map;
  }, [rules]);

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Delete rule ${code}? This cannot be undone.`)) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: 'Rule deleted' });
    } catch (e: any) {
      toast({ title: 'Delete failed', description: e?.message, variant: 'destructive' });
    }
  };

  const handleToggleActive = async (rule: BnEligibilityRule, next: boolean) => {
    try {
      await upsertMutation.mutateAsync({ ...rule, is_active: next });
    } catch (e: any) {
      toast({ title: 'Update failed', description: e?.message, variant: 'destructive' });
    }
  };

  const businessSentence = (rule: BnEligibilityRule): string => {
    const rd = (rule.rule_definition || {}) as Record<string, any>;
    const fd = getFieldDef(rd.field_key);
    if (!fd) return rule.rule_name;
    const opLabel = friendlyOperatorPhrase(rd.operator, fd.valueType);
    const valuePart =
      rd.operator === 'BETWEEN'
        ? `${formatValue(rd.range_from)} and ${formatValue(rd.range_to)}`
        : formatValue(rd.value);
    return `${fd.label} ${opLabel} ${valuePart}`.trim();
  };

  return (
    <div className="space-y-6">
      <ReadOnlyVersionBanner show={!!isReadOnly} status={versionStatus} />

      {/* A. Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <SummaryTile icon={<ScrollText className="h-4 w-4" />} label="Total rules" value={summary.total} tone="default" />
        <SummaryTile icon={<ShieldAlert className="h-4 w-4" />} label="Blocking" value={summary.blocking} tone="destructive" />
        <SummaryTile icon={<AlertTriangle className="h-4 w-4" />} label="Warnings" value={summary.warning} tone="warning" />
        <SummaryTile icon={<Info className="h-4 w-4" />} label="Informational" value={summary.infoCount} tone="muted" />
        <SummaryTile icon={<Scale className="h-4 w-4" />} label="Legal pending" value={summary.legalPending} tone="muted" />
        <SummaryTile icon={<CheckCircle2 className="h-4 w-4" />} label="Missing values" value={summary.missingParams} tone={summary.missingParams > 0 ? 'warning' : 'success'} />
      </div>

      {/* Toolbar */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-lg">Eligibility</CardTitle>
            <CardDescription>
              Simple business rules that decide whether a claim is eligible for this product.
            </CardDescription>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" disabled={isReadOnly} onClick={() => setCategoryPickerOpen(true)} className="gap-2">
              <LayoutGrid className="h-4 w-4" /> Add by Category
            </Button>
            <Button variant="outline" size="sm" disabled={isReadOnly} onClick={() => setGroupPickerOpen(true)} className="gap-2">
              <FolderPlus className="h-4 w-4" /> Add from Rule Group
            </Button>
            <Button variant="outline" size="sm" disabled={isReadOnly} onClick={() => setPickerOpen(true)} className="gap-2">
              <Library className="h-4 w-4" /> Catalogue
            </Button>
            <Button size="sm" disabled={isReadOnly} onClick={() => { setWizardInitial(null); setWizardOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> Add Rule
            </Button>
            <Button variant="outline" size="sm" onClick={() => setTestOpen(true)} className="gap-2">
              <FlaskConical className="h-4 w-4" /> Test Eligibility
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <EligibilityConflictPanel rules={rules} />
        </CardContent>
      </Card>

      {/* B. Rule Groups */}
      {isLoading ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Loading rules…</CardContent></Card>
      ) : rules.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No eligibility rules yet. Click <strong>Add Rule</strong> to create one, or pull a set from the catalogue.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {RULE_GROUPS.map((g) => {
            const items = grouped.get(g.code) ?? [];
            if (items.length === 0) return null;
            const isOpen = openGroups[g.code] ?? true;
            return (
              <Card key={g.code}>
                <CardHeader
                  className="flex flex-row items-center justify-between cursor-pointer py-3"
                  onClick={() => setOpenGroups((p) => ({ ...p, [g.code]: !isOpen }))}
                >
                  <div className="flex items-center gap-2">
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <CardTitle className="text-base">{g.label}</CardTitle>
                    <Badge variant="secondary">{items.length}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{g.description}</span>
                </CardHeader>
                {isOpen && (
                  <CardContent className="space-y-2 pt-0">
                    {items.map((rule) => (
                      <RuleRow
                        key={rule.id}
                        rule={rule}
                        sentence={businessSentence(rule)}
                        advancedOpen={!!advancedOpen[rule.id]}
                        onToggleAdvanced={() => setAdvancedOpen((p) => ({ ...p, [rule.id]: !p[rule.id] }))}
                        onToggleActive={(v) => handleToggleActive(rule, v)}
                        onEdit={() => { setWizardInitial(rule); setWizardOpen(true); }}
                        onDelete={() => handleDelete(rule.id, rule.rule_code)}
                        disabled={!!isReadOnly}
                      />
                    ))}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* C. Product Parameters */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Product Parameters</CardTitle>
          <CardDescription>
            Values that selected rules need. Set the value on the rule to clear the missing flag.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {summary.parameterRows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              All rules have their values configured.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground border-b">
                  <tr>
                    <th className="text-left py-2 font-medium">Parameter</th>
                    <th className="text-left py-2 font-medium">Used by rule</th>
                    <th className="text-left py-2 font-medium">Value</th>
                    <th className="text-left py-2 font-medium">Status</th>
                    <th className="text-right py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.parameterRows.map(({ rule, label }) => (
                    <tr key={rule.id} className="border-b last:border-0">
                      <td className="py-2">{label}</td>
                      <td className="py-2 text-muted-foreground">{rule.rule_name}</td>
                      <td className="py-2 italic text-muted-foreground">empty</td>
                      <td className="py-2"><Badge variant="outline" className="text-amber-700 border-amber-300">Missing</Badge></td>
                      <td className="py-2 text-right">
                        <Button size="sm" variant="outline" disabled={isReadOnly}
                          onClick={() => { setWizardInitial(rule); setWizardOpen(true); }}>
                          Set value
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      {versionId && (
        <RuleWizardDialog
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          productVersionId={versionId}
          productCode={productCode ?? null}
          initial={wizardInitial}
        />
      )}
      {versionId && (
        <>
          <CataloguePickerDialog open={pickerOpen} onOpenChange={setPickerOpen} versionId={versionId} />
          <AddRuleGroupFromCatalogueDialog
            open={groupPickerOpen}
            onOpenChange={setGroupPickerOpen}
            versionId={versionId}
            productCode={productCode ?? null}
          />
          <AddRulesByCategoryDialog
            open={categoryPickerOpen}
            onOpenChange={setCategoryPickerOpen}
            versionId={versionId}
          />
          <TestEligibilityDialog
            open={testOpen}
            onOpenChange={setTestOpen}
            versionId={versionId}
            productCode={productCode ?? null}
          />
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────────────

function SummaryTile({
  icon, label, value, tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: 'default' | 'destructive' | 'warning' | 'muted' | 'success';
}) {
  const toneClass =
    tone === 'destructive' ? 'text-destructive'
    : tone === 'warning' ? 'text-amber-700'
    : tone === 'success' ? 'text-emerald-700'
    : tone === 'muted' ? 'text-muted-foreground'
    : 'text-foreground';
  return (
    <Card className="border bg-card">
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {icon}<span>{label}</span>
        </div>
        <div className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function RuleRow({
  rule, sentence, advancedOpen, onToggleAdvanced, onToggleActive, onEdit, onDelete, disabled,
}: {
  rule: BnEligibilityRule;
  sentence: string;
  advancedOpen: boolean;
  onToggleAdvanced: () => void;
  onToggleActive: (next: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const sev = (rule.severity || 'BLOCK').toUpperCase();
  const sevVariant: 'destructive' | 'secondary' | 'outline' | 'default' =
    sev === 'BLOCK' || sev === 'BLOCKING' ? 'destructive'
    : sev === 'WARN' || sev === 'WARNING' ? 'secondary'
    : sev === 'REFER' ? 'outline'
    : 'outline';
  const sevLabel =
    sev === 'BLOCK' || sev === 'BLOCKING' ? 'Blocking'
    : sev === 'WARN' || sev === 'WARNING' ? 'Warning'
    : sev === 'REFER' ? 'Refer'
    : 'Info';

  const rd = (rule.rule_definition || {}) as Record<string, any>;
  const fd = getFieldDef(rd.field_key);

  return (
    <div className="rounded-md border bg-background">
      <div className="flex items-start gap-3 p-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{rule.rule_name}</span>
            <Badge variant={sevVariant} className="text-[10px]">{sevLabel}</Badge>
            {rule.overrideable && <Badge variant="outline" className="text-[10px]">Overrideable</Badge>}
            {!rule.is_active && <Badge variant="outline" className="text-[10px] opacity-70">Inactive</Badge>}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{sentence}</p>
          {rule.fail_message && (
            <p className="text-xs text-muted-foreground/80 mt-1 italic">“{rule.fail_message}”</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <div className="flex items-center gap-1 mr-1">
            <Switch
              checked={rule.is_active}
              onCheckedChange={onToggleActive}
              disabled={disabled}
              aria-label="Active"
            />
          </div>
          <Button variant="ghost" size="icon" disabled={disabled} onClick={onEdit} title="Edit">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" disabled={disabled} onClick={onDelete} title="Delete">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      <Collapsible open={advancedOpen} onOpenChange={onToggleAdvanced}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center gap-1 px-3 py-1.5 text-[11px] text-muted-foreground hover:bg-muted/40 border-t"
          >
            {advancedOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Advanced details
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono text-muted-foreground">
            <div><span className="text-foreground/70">Code:</span> {rule.rule_code}</div>
            <div><span className="text-foreground/70">Group:</span> {rule.group_code || '—'}</div>
            <div><span className="text-foreground/70">Fact:</span> {String(rd.field_key || rule.fact_key || '—')}</div>
            <div><span className="text-foreground/70">Operator:</span> {String(rd.operator || '—')}</div>
            <div><span className="text-foreground/70">Value:</span> {formatValue(rd.value)}</div>
            <div><span className="text-foreground/70">Source:</span> {fd?.dataSource || rule.data_source || '—'}</div>
            <div><span className="text-foreground/70">Resolver:</span> {fd?.resolver || '—'}</div>
            <div><span className="text-foreground/70">Fail action:</span> {rule.fail_action}</div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function formatValue(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'yes' : 'no';
  return String(v);
}

function friendlyOperatorPhrase(op: string | undefined, valueType: string): string {
  switch (op) {
    case '>=': return valueType === 'date' ? 'on or after' : 'at least';
    case '>':  return valueType === 'date' ? 'after' : 'greater than';
    case '<=': return valueType === 'date' ? 'on or before' : 'at most';
    case '<':  return valueType === 'date' ? 'before' : 'less than';
    case '==':
    case '=':  return 'equals';
    case '!=': return 'is not';
    case 'IN': return 'is one of';
    case 'BETWEEN': return 'between';
    case 'exists':
    case 'EXISTS': return 'must exist';
    case 'not_exists':
    case 'NOT_EXISTS': return 'must not exist';
    default: return ELIGIBILITY_OPERATOR_LABELS[op as EligibilityOperator] ?? (op ?? '');
  }
}

export default EligibilityTabRedesigned;
