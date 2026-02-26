import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Info, Save, Check } from 'lucide-react';
import { useBonusPolicyDefault, useUpdateBonusPolicyDefault } from '@/hooks/useBonusPolicy';
import { useUserCode } from '@/hooks/useUserCode';
import type { BonusPolicyDefault, BonusDistribution, CalculationMethod } from '@/types/bonusPolicy';
import { DEFAULT_DISTRIBUTION } from '@/types/bonusPolicy';

export function BonusPolicyDefaultTab() {
  const { data: policy, isLoading } = useBonusPolicyDefault();
  const updateMutation = useUpdateBonusPolicyDefault();
  const { userCode } = useUserCode();

  const [form, setForm] = useState<Partial<BonusPolicyDefault>>({});
  const [cappingEnabled, setCappingEnabled] = useState(false);

  useEffect(() => {
    if (policy) {
      setForm({ ...policy });
      setCappingEnabled(policy.min_bonus_amount != null || policy.max_bonus_amount != null);
    }
  }, [policy]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[40vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!policy) {
    return <div className="text-center py-8 text-muted-foreground">No default bonus policy found.</div>;
  }

  const dist: BonusDistribution = (form.distribution as BonusDistribution) ?? DEFAULT_DISTRIBUTION;

  const setField = <K extends keyof BonusPolicyDefault>(key: K, value: BonusPolicyDefault[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const setDist = (cycle: keyof BonusDistribution, key: string, value: boolean) => {
    const newDist = JSON.parse(JSON.stringify(dist)) as BonusDistribution;
    const cycleObj = newDist[cycle] as Record<string, boolean>;

    if (key === 'divide' && value) {
      Object.keys(cycleObj).forEach(k => { cycleObj[k] = k === 'divide'; });
    } else if (key !== 'divide' && value) {
      cycleObj['divide'] = false;
      cycleObj[key] = true;
    } else {
      cycleObj[key] = value;
    }

    setField('distribution', newDist);
  };

  const handleSave = () => {
    if (!form.include_in_levy && !form.include_in_severance) {
      return;
    }
    const updates = { ...form };
    if (!cappingEnabled) {
      updates.min_bonus_amount = null;
      updates.max_bonus_amount = null;
    }
    updateMutation.mutate({ id: policy.id, updates, userCode: userCode || undefined });
  };

  const bothOff = !form.include_in_levy && !form.include_in_severance;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Default Bonus Policy</CardTitle>
            <CardDescription>Applies to all payroll periods unless overridden by an exception rule.</CardDescription>
          </div>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">● ACTIVE</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Info banner */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <span className="text-sm text-muted-foreground">
            This policy is the base configuration. Exception policies defined in the <strong>Bonus Policy Exceptions</strong> tab will override these settings for the specified period.
          </span>
        </div>

        {/* 1. Applicability */}
        <SectionLabel>Bonus Applicability in C3</SectionLabel>
        <div className="space-y-3">
          <ToggleRow label="Include Bonus in Levy" hint="Bonus amount added to levy base calculation" checked={!!form.include_in_levy} onChange={v => setField('include_in_levy', v)} />
          <ToggleRow label="Include Bonus in Severance" hint="Bonus amount added to severance base calculation" checked={!!form.include_in_severance} onChange={v => setField('include_in_severance', v)} />
          {bothOff && (
            <div className="flex items-center gap-2 text-sm text-destructive p-2 bg-destructive/10 rounded-md border border-destructive/20">
              ⚠ At least one applicability option must be enabled.
            </div>
          )}
        </div>

        {/* 2. Calculation Method */}
        <SectionLabel>Bonus Calculation Method</SectionLabel>
        <div className="space-y-3">
          <RadioOption
            selected={form.calculation_method === 'merge'}
            onClick={() => setField('calculation_method', 'merge')}
            label="Merge bonus with regular earnings"
            hint="Bonus is combined into the standard pay run"
          />
          <RadioOption
            selected={form.calculation_method === 'separate'}
            onClick={() => setField('calculation_method', 'separate')}
            label="Calculate bonus separately"
            hint="Bonus is processed in an isolated calculation"
          />
          {form.calculation_method === 'separate' && (
            <div className="ml-4 p-4 bg-muted/50 border rounded-lg space-y-3">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Select Calculation Method(s)</p>
              <CheckOption
                checked={!!form.calc_flat_enabled}
                onChange={v => setField('calc_flat_enabled', v)}
                label="Flat Percentage"
                hint="A fixed percentage applied on the bonus base amount"
              >
                {form.calc_flat_enabled && (
                  <div className="flex items-center gap-2 mt-2" onClick={e => e.stopPropagation()}>
                    <Input
                      type="number"
                      className="w-24"
                      placeholder="e.g. 15"
                      value={form.calc_flat_percentage ?? ''}
                      onChange={e => setField('calc_flat_percentage', e.target.value ? Number(e.target.value) : null)}
                      min={0} max={100}
                    />
                    <span className="text-sm font-semibold text-muted-foreground">%</span>
                  </div>
                )}
              </CheckOption>
              <CheckOption
                checked={!!form.calc_slab_enabled}
                onChange={v => setField('calc_slab_enabled', v)}
                label="Levy Slab Based"
                hint="Bonus calculated using predefined levy slabs"
              />
              {!form.calc_flat_enabled && !form.calc_slab_enabled && (
                <div className="text-sm text-destructive p-2 bg-destructive/10 rounded-md border border-destructive/20">
                  ⚠ At least one calculation method must be selected.
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. Distribution (only for merge) */}
        {form.calculation_method === 'merge' && (
          <>
            <SectionLabel>Bonus Distribution by Payroll Cycle</SectionLabel>
            <p className="text-xs text-muted-foreground -mt-4">
              Select when the bonus should be included for each payroll frequency. Checking a specific week/payment will automatically uncheck &quot;Divide equally&quot;, and vice versa.
            </p>
            <div className="space-y-4">
              <CycleBlock title="Weekly" cycle="weekly" dist={dist} setDist={setDist}
                items={[
                  { key: 'w1', label: 'Include in 1st week' },
                  { key: 'w2', label: 'Include in 2nd week' },
                  { key: 'w3', label: 'Include in 3rd week' },
                  { key: 'w4', label: 'Include in 4th / last week' },
                  { key: 'divide', label: 'Divide equally across all weeks', isDivide: true },
                ]}
              />
              <CycleBlock title="Bi-weekly" cycle="biweekly" dist={dist} setDist={setDist}
                items={[
                  { key: 'b1', label: 'Include in 1st payment' },
                  { key: 'b2', label: 'Include in last payment' },
                  { key: 'divide', label: 'Divide equally across both payments', isDivide: true },
                ]}
              />
              <CycleBlock title="Semi-monthly" cycle="semimonthly" dist={dist} setDist={setDist}
                items={[
                  { key: 's1', label: 'Include in 1st payment' },
                  { key: 's2', label: 'Include in last payment' },
                  { key: 'divide', label: 'Divide equally across both payments', isDivide: true },
                ]}
              />
              <CycleBlock title="Monthly" cycle="monthly" dist={dist} setDist={setDist}
                items={[
                  { key: 'm1', label: 'Include in monthly payment' },
                ]}
              />
            </div>
          </>
        )}

        {/* 4. Capping */}
        <div className="flex items-center gap-3">
          <Checkbox
            id="capping-enabled"
            checked={cappingEnabled}
            onCheckedChange={(v) => {
              const val = !!v;
              setCappingEnabled(val);
              if (!val) {
                setField('min_bonus_amount', null);
                setField('max_bonus_amount', null);
              }
            }}
            className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
          />
          <SectionLabel>Capping on Eligible Bonus Amount</SectionLabel>
        </div>
        {cappingEnabled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Minimum Bonus Amount</Label>
              <Input type="number" placeholder="e.g. 500" value={form.min_bonus_amount ?? ''} onChange={e => setField('min_bonus_amount', e.target.value ? Number(e.target.value) : null)} />
            </div>
            <div className="space-y-1.5">
              <Label>Maximum Bonus Amount</Label>
              <Input type="number" placeholder="e.g. 50000" value={form.max_bonus_amount ?? ''} onChange={e => setField('max_bonus_amount', e.target.value ? Number(e.target.value) : null)} />
            </div>
          </div>
        )}

        {/* 5. Contribution Base */}
        <SectionLabel>Contribution Base Calculation</SectionLabel>
        <p className="text-xs text-muted-foreground -mt-4">Selected contributions will include bonus amount in their base calculation.</p>
        <div className="border rounded-lg divide-y">
          <ContribRow label="Employee Contribution" checked={!!form.contrib_employee} onChange={v => setField('contrib_employee', v)} />
          <ContribRow label="Employer Contribution" checked={!!form.contrib_employer} onChange={v => setField('contrib_employer', v)} />
          <ContribRow label="EIR (Employer Insurance Rate)" checked={!!form.contrib_eir} onChange={v => setField('contrib_eir', v)} />
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 pt-4 border-t">
          <Button onClick={handleSave} disabled={updateMutation.isPending || bothOff}>
            {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save
          </Button>
          <Button variant="outline" onClick={() => policy && setForm({ ...policy })}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Sub-components ----

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-xs font-medium text-foreground uppercase tracking-widest">
      {children}
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-b-0">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={checked} onCheckedChange={onChange} />
        <span className="text-xs text-muted-foreground w-6">{checked ? 'Yes' : 'No'}</span>
      </div>
    </div>
  );
}

function RadioOption({ selected, onClick, label, hint }: { selected: boolean; onClick: () => void; label: string; hint: string }) {
  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
        selected ? 'border-emerald-400 bg-emerald-50' : 'border-border bg-muted/30 hover:bg-muted/50'
      }`}
      onClick={onClick}
    >
      <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
        selected ? 'border-emerald-600 bg-emerald-600' : 'border-muted-foreground/40'
      }`}>
        {selected && <Check className="h-3 w-3 text-white" />}
      </div>
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
    </div>
  );
}

function CheckOption({ checked, onChange, label, hint, children }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint: string; children?: React.ReactNode }) {
  return (
    <div
      className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
        checked ? 'border-emerald-400 bg-emerald-50' : 'border-border bg-muted/30 hover:bg-muted/50'
      }`}
      onClick={() => onChange(!checked)}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 ${
          checked ? 'bg-emerald-600 border-emerald-600' : 'border-2 border-muted-foreground/40'
        }`}>
          {checked && <Check className="h-3 w-3 text-white" />}
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium">{label}</div>
          <div className="text-xs text-muted-foreground">{hint}</div>
          {children}
        </div>
      </div>
    </div>
  );
}

function ContribRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
      <span className="text-sm font-medium">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

interface CycleItem { key: string; label: string; isDivide?: boolean }

function CycleBlock({ title, cycle, dist, setDist, items }: {
  title: string;
  cycle: keyof BonusDistribution;
  dist: BonusDistribution;
  setDist: (cycle: keyof BonusDistribution, key: string, value: boolean) => void;
  items: CycleItem[];
}) {
  const cycleObj = dist[cycle] as Record<string, boolean>;
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="px-4 py-2 bg-muted/50 border-b text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <div className="p-3 space-y-2">
        {items.map(item => {
          const isChecked = !!cycleObj[item.key];
          return (
            <div
              key={item.key}
              className={`flex items-center gap-3 px-3 py-2 rounded-md border cursor-pointer transition-colors ${
                isChecked
                  ? 'border-emerald-300 bg-emerald-50'
                  : 'border-border bg-muted/20 hover:bg-muted/40'
              }`}
              onClick={() => setDist(cycle, item.key, !isChecked)}
            >
              <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                isChecked
                  ? 'bg-emerald-600 border-emerald-600'
                  : 'border-2 border-muted-foreground/40'
              }`}>
                {isChecked && <Check className="h-3 w-3 text-white" />}
              </div>
              <span className={`text-sm ${item.isDivide ? 'italic text-muted-foreground' : ''}`}>{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
