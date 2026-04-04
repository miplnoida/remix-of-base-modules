import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Shield, Package, FileText, Calculator, Scale, Clock, Info,
  CheckCircle, ChevronDown, ChevronUp, Hash, Layers,
} from 'lucide-react';
import type { BnSimConfigSnapshot } from '@/types/bnSimulation';

interface Props {
  snapshot: BnSimConfigSnapshot | null | undefined;
}

// ── Helpers ──────────────────────────────────────────────

function RuleTable({ rules, columns }: { rules: any[]; columns: { key: string; label: string }[] }) {
  const [expanded, setExpanded] = useState(false);
  const display = expanded ? rules : rules.slice(0, 5);

  if (rules.length === 0) {
    return <p className="text-sm text-muted-foreground italic">No rules configured</p>;
  }

  return (
    <div className="space-y-1">
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/30 border-b border-border">
              {columns.map(c => (
                <th key={c.key} className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {display.map((rule, idx) => (
              <tr key={idx} className="border-b border-border/50 last:border-0">
                {columns.map(c => (
                  <td key={c.key} className="px-3 py-1.5 text-xs font-mono">
                    {typeof rule[c.key] === 'boolean'
                      ? (rule[c.key] ? <CheckCircle className="h-3 w-3 text-emerald-600 inline" /> : '—')
                      : typeof rule[c.key] === 'object'
                        ? <span className="text-muted-foreground">[JSON]</span>
                        : String(rule[c.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rules.length > 5 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? 'Show less' : `Show all ${rules.length} rules`}
        </button>
      )}
    </div>
  );
}

function SummaryBadges({ summary }: { summary: Record<string, number> }) {
  const items = [
    { key: 'eligibility_rule_count', label: 'Eligibility', icon: <Shield className="h-3 w-3" /> },
    { key: 'calculation_rule_count', label: 'Calculation', icon: <Calculator className="h-3 w-3" /> },
    { key: 'timeline_rule_count', label: 'Timeline', icon: <Clock className="h-3 w-3" /> },
    { key: 'document_rule_count', label: 'Document', icon: <FileText className="h-3 w-3" /> },
    { key: 'interaction_rule_count', label: 'Interaction', icon: <Layers className="h-3 w-3" /> },
    { key: 'formula_template_count', label: 'Formulas', icon: <Hash className="h-3 w-3" /> },
    { key: 'override_policy_count', label: 'Overrides', icon: <Scale className="h-3 w-3" /> },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {items.map(item => (
        <div key={item.key} className="flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 py-1.5">
          {item.icon}
          <span className="text-xs text-muted-foreground">{item.label}</span>
          <Badge variant="secondary" className="text-xs h-5 min-w-[20px] justify-center">{summary[item.key] ?? 0}</Badge>
        </div>
      ))}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────

export default function SimConfigSnapshotViewer({ snapshot }: Props) {
  if (!snapshot) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Shield className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No configuration snapshot available.</p>
        </CardContent>
      </Card>
    );
  }

  const cfg = snapshot.config_data as any;
  const product = cfg?.product;
  const version = cfg?.product_version;
  const summary = cfg?._summary || {};

  return (
    <div className="space-y-4">
      {/* Header meta */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Configuration Snapshot
              </CardTitle>
              <CardDescription>Frozen configuration captured at simulation runtime — read-only</CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">{snapshot.snapshot_type}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Capture info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <span className="text-xs text-muted-foreground">Captured At</span>
              <p className="font-medium">{new Date(snapshot.captured_at).toLocaleString()}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Captured By</span>
              <p className="font-medium">{snapshot.captured_by || 'SYSTEM'}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Snapshot ID</span>
              <p className="font-mono text-xs">{snapshot.id.substring(0, 12)}…</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Version</span>
              <p className="font-mono text-xs">{cfg?.snapshot_version || '1.0'}</p>
            </div>
          </div>

          <Separator />

          {/* Product & Version */}
          {(product || version) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {product && (
                <div className="rounded-md border border-border p-3 space-y-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold uppercase text-muted-foreground">Product</span>
                  </div>
                  <div className="grid grid-cols-2 gap-y-1 text-sm">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">{product.benefit_name}</span>
                    <span className="text-muted-foreground">Code</span>
                    <span className="font-mono text-xs">{product.benefit_code}</span>
                  </div>
                </div>
              )}
              {version && (
                <div className="rounded-md border border-border p-3 space-y-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Layers className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold uppercase text-muted-foreground">Version</span>
                  </div>
                  <div className="grid grid-cols-2 gap-y-1 text-sm">
                    <span className="text-muted-foreground">Version #</span>
                    <span className="font-mono">v{version.version_number}</span>
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant="outline" className="w-fit text-xs">{version.status}</Badge>
                    <span className="text-muted-foreground">Effective</span>
                    <span className="text-xs">{version.effective_from || '—'} → {version.effective_to || 'Open'}</span>
                    {version.requires_employer_verification && (
                      <>
                        <span className="text-muted-foreground">Employer Verification</span>
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                      </>
                    )}
                    {version.requires_medical_board_review && (
                      <>
                        <span className="text-muted-foreground">Medical Board</span>
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Summary counts */}
          <div>
            <span className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">Snapshot Contents</span>
            <SummaryBadges summary={summary} />
          </div>
        </CardContent>
      </Card>

      {/* Rule detail tabs */}
      <Card>
        <CardContent className="pt-4">
          <Tabs defaultValue="eligibility">
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="eligibility" className="text-xs">Eligibility ({summary.eligibility_rule_count ?? 0})</TabsTrigger>
              <TabsTrigger value="calculation" className="text-xs">Calculation ({summary.calculation_rule_count ?? 0})</TabsTrigger>
              <TabsTrigger value="timeline" className="text-xs">Timeline ({summary.timeline_rule_count ?? 0})</TabsTrigger>
              <TabsTrigger value="document" className="text-xs">Document ({summary.document_rule_count ?? 0})</TabsTrigger>
              <TabsTrigger value="interaction" className="text-xs">Interaction ({summary.interaction_rule_count ?? 0})</TabsTrigger>
              <TabsTrigger value="formulas" className="text-xs">Formulas ({summary.formula_template_count ?? 0})</TabsTrigger>
              <TabsTrigger value="overrides" className="text-xs">Overrides ({summary.override_policy_count ?? 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="eligibility" className="mt-3">
              <RuleTable
                rules={cfg?.eligibility_rules || []}
                columns={[
                  { key: 'rule_code', label: 'Code' },
                  { key: 'rule_name', label: 'Name' },
                  { key: 'rule_type', label: 'Type' },
                  { key: 'sort_order', label: 'Order' },
                  { key: 'is_active', label: 'Active' },
                ]}
              />
            </TabsContent>

            <TabsContent value="calculation" className="mt-3">
              <RuleTable
                rules={cfg?.calculation_rules || []}
                columns={[
                  { key: 'rule_code', label: 'Code' },
                  { key: 'rule_name', label: 'Name' },
                  { key: 'calc_type', label: 'Calc Type' },
                  { key: 'rounding_rule', label: 'Rounding' },
                  { key: 'sort_order', label: 'Order' },
                ]}
              />
            </TabsContent>

            <TabsContent value="timeline" className="mt-3">
              <RuleTable
                rules={cfg?.timeline_rules || []}
                columns={[
                  { key: 'rule_code', label: 'Code' },
                  { key: 'rule_name', label: 'Name' },
                  { key: 'duration_type', label: 'Duration' },
                  { key: 'sort_order', label: 'Order' },
                ]}
              />
            </TabsContent>

            <TabsContent value="document" className="mt-3">
              <RuleTable
                rules={cfg?.document_rules || []}
                columns={[
                  { key: 'rule_code', label: 'Code' },
                  { key: 'rule_name', label: 'Name' },
                  { key: 'document_type', label: 'Doc Type' },
                  { key: 'is_mandatory', label: 'Required' },
                ]}
              />
            </TabsContent>

            <TabsContent value="interaction" className="mt-3">
              <RuleTable
                rules={cfg?.interaction_rules || []}
                columns={[
                  { key: 'rule_code', label: 'Code' },
                  { key: 'rule_name', label: 'Name' },
                  { key: 'interaction_type', label: 'Type' },
                  { key: 'sort_order', label: 'Order' },
                ]}
              />
            </TabsContent>

            <TabsContent value="formulas" className="mt-3">
              <RuleTable
                rules={cfg?.formula_templates || []}
                columns={[
                  { key: 'template_code', label: 'Code' },
                  { key: 'template_name', label: 'Name' },
                  { key: 'formula_expression', label: 'Expression' },
                  { key: 'output_type', label: 'Output' },
                ]}
              />
            </TabsContent>

            <TabsContent value="overrides" className="mt-3">
              <RuleTable
                rules={cfg?.override_policies || []}
                columns={[
                  { key: 'override_target', label: 'Target' },
                  { key: 'field_path', label: 'Field' },
                  { key: 'allowed_role', label: 'Role' },
                  { key: 'requires_maker_checker', label: 'Maker-Checker' },
                  { key: 'max_override_amount', label: 'Max Amount' },
                ]}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Isolation notice */}
      <div className="rounded-md bg-muted/50 border border-border p-3 flex items-start gap-2">
        <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">
          This snapshot is a <strong>frozen, read-only copy</strong> of the product configuration captured at simulation
          runtime. It does not reflect subsequent changes to the production configuration. Data source: bn_sim_config_snapshot.
        </p>
      </div>
    </div>
  );
}
