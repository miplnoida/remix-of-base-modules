/**
 * RuleBuilder — multi-row condition builder backed by the eligibility-field
 * and operator registries. No free-text field keys are accepted.
 */
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus } from 'lucide-react';
import { SmartSelect } from './SmartSelect';
import {
  ELIGIBILITY_FIELDS,
  getEligibilityField,
  type EligibilityFieldDef,
} from '@/services/bn/registries/eligibilityFieldRegistry';
import { getOperatorsForType } from '@/services/bn/registries/operatorRegistry';

export interface RuleCondition {
  field: string;
  operator: string;
  value: string;
  value2?: string; // used for BETWEEN
}

interface Props {
  conditions: RuleCondition[];
  onChange: (next: RuleCondition[]) => void;
  disabled?: boolean;
}

const fieldOptions = ELIGIBILITY_FIELDS.map((f) => ({
  value: f.key,
  label: `${f.group} — ${f.label}`,
  searchText: f.key,
}));

export function RuleBuilder({ conditions, onChange, disabled }: Props) {
  const update = (idx: number, patch: Partial<RuleCondition>) => {
    const next = conditions.map((c, i) => (i === idx ? { ...c, ...patch } : c));
    onChange(next);
  };
  const remove = (idx: number) => onChange(conditions.filter((_, i) => i !== idx));
  const add = () => onChange([...conditions, { field: '', operator: '=', value: '' }]);

  return (
    <div className="space-y-2">
      {conditions.length === 0 && (
        <p className="text-sm text-muted-foreground italic">No conditions yet. Add one to begin.</p>
      )}
      {conditions.map((cond, idx) => {
        const fieldDef: EligibilityFieldDef | undefined = getEligibilityField(cond.field);
        const operators = fieldDef ? getOperatorsForType(fieldDef.type) : [];
        const opDef = operators.find((o) => o.key === cond.operator);
        return (
          <div key={idx} className="grid grid-cols-12 gap-2 items-end p-2 rounded border bg-muted/30">
            <div className="col-span-5">
              <SmartSelect
                label={idx === 0 ? 'Field' : undefined}
                options={fieldOptions}
                value={cond.field}
                onValueChange={(v) => {
                  const def = getEligibilityField(v);
                  const ops = def ? getOperatorsForType(def.type) : [];
                  update(idx, { field: v, operator: ops[0]?.key ?? '=', value: '', value2: '' });
                }}
                placeholder="Pick a field…"
                disabled={disabled}
              />
              {fieldDef && (
                <p className="text-[10px] text-muted-foreground mt-1 font-mono truncate">
                  src: {fieldDef.source} · type: {fieldDef.type}
                </p>
              )}
            </div>
            <div className="col-span-2">
              <SmartSelect
                label={idx === 0 ? 'Operator' : undefined}
                options={operators.map((o) => ({ value: o.key, label: o.label }))}
                value={cond.operator}
                onValueChange={(v) => update(idx, { operator: v })}
                disabled={disabled || !fieldDef}
              />
            </div>
            <div className="col-span-4 grid grid-cols-2 gap-2">
              {opDef && opDef.arity >= 1 && (
                <Input
                  placeholder="Value"
                  value={cond.value}
                  onChange={(e) => update(idx, { value: e.target.value })}
                  disabled={disabled}
                  type={fieldDef?.type === 'number' ? 'number' : fieldDef?.type === 'date' ? 'date' : 'text'}
                />
              )}
              {opDef && opDef.arity === 2 && (
                <Input
                  placeholder="and"
                  value={cond.value2 ?? ''}
                  onChange={(e) => update(idx, { value2: e.target.value })}
                  disabled={disabled}
                  type={fieldDef?.type === 'number' ? 'number' : fieldDef?.type === 'date' ? 'date' : 'text'}
                />
              )}
            </div>
            <div className="col-span-1 flex justify-end">
              <Button type="button" variant="ghost" size="icon" disabled={disabled} onClick={() => remove(idx)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        );
      })}
      <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={add}>
        <Plus className="h-4 w-4 mr-1" /> Add condition
      </Button>
    </div>
  );
}
