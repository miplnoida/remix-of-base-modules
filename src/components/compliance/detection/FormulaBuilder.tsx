import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Plus, X, GripVertical, Sparkles, ArrowRight,
} from 'lucide-react';
import {
  FormulaTerm, FormulaFactor, FactorType, TermOperator, FactorJoinOp,
  BASE_METRICS, RATE_SOURCES, DERIVED_METRICS, FUNCTION_WRAPPERS,
  FACTOR_TYPE_CONFIG, resolveFactorLabel, generateFormulaFromTerms,
  createBlankTerm, createFactor, generateId,
} from './calculationConstants';

interface FormulaBuilderProps {
  terms: FormulaTerm[];
  onChange: (terms: FormulaTerm[]) => void;
}

// ── Factor Chip ──
const FactorChip = ({
  factor,
  isFirst,
  onRemove,
  onChangeJoinOp,
}: {
  factor: FormulaFactor;
  isFirst: boolean;
  onRemove: () => void;
  onChangeJoinOp: (op: FactorJoinOp) => void;
}) => {
  const cfg = FACTOR_TYPE_CONFIG[factor.type];
  const label = resolveFactorLabel(factor);

  return (
    <div className="flex items-center gap-1">
      {!isFirst && (
        <button
          type="button"
          onClick={() => onChangeJoinOp(factor.joinOp === 'multiply' ? 'divide' : 'multiply')}
          className="text-xs font-bold text-muted-foreground hover:text-foreground px-1 py-0.5 rounded hover:bg-muted transition-colors cursor-pointer select-none"
          title="Click to toggle × / ÷"
        >
          {factor.joinOp === 'divide' ? '÷' : '×'}
        </button>
      )}
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${cfg.bgClass} transition-all`}>
        <span className={`text-[9px] font-bold uppercase ${cfg.color}`}>{cfg.label}</span>
        <span className="text-foreground">{label}</span>
        <button type="button" onClick={onRemove} className="ml-0.5 hover:text-destructive transition-colors">
          <X className="h-3 w-3" />
        </button>
      </span>
    </div>
  );
};

// ── Add Factor Popover ──
const AddFactorPopover = ({ onAdd }: { onAdd: (type: FactorType, value: string) => void }) => {
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<FactorType | ''>('');
  const [constantValue, setConstantValue] = useState('');

  const handleSelect = (type: FactorType, value: string) => {
    onAdd(type, value);
    setOpen(false);
    setSelectedType('');
    setConstantValue('');
  };

  const handleAddConstant = () => {
    if (constantValue.trim()) {
      handleSelect('constant', constantValue.trim());
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-primary border border-dashed border-border hover:border-primary">
          <Plus className="h-3 w-3 mr-1" /> Factor
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b border-border">
          <p className="text-xs font-semibold text-foreground">Add Factor</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Select the type and value for this operand</p>
        </div>

        {/* Type selector */}
        <div className="p-2">
          <Select value={selectedType} onValueChange={v => setSelectedType(v as FactorType)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Choose factor type..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="base_metric">🟢 Base Metric (financial amounts)</SelectItem>
              <SelectItem value="rate_source">🔵 Rate / Config Source</SelectItem>
              <SelectItem value="derived_metric">🟡 Derived Metric (computed values)</SelectItem>
              <SelectItem value="constant">⚪ Constant (fixed number)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Value list */}
        {selectedType === 'base_metric' && (
          <div className="max-h-48 overflow-y-auto border-t border-border">
            {BASE_METRICS.map(m => (
              <button key={m.value} type="button" onClick={() => handleSelect('base_metric', m.value)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors border-b border-border/50 last:border-0">
                <span className="font-medium">{m.label}</span>
                <span className="text-muted-foreground ml-1">— {m.description}</span>
              </button>
            ))}
          </div>
        )}

        {selectedType === 'rate_source' && (
          <div className="max-h-48 overflow-y-auto border-t border-border">
            {['c3_config', 'compliance', 'fixed', 'derived'].map(type => {
              const items = RATE_SOURCES.filter(r => r.type === type);
              if (!items.length) return null;
              const groupLabel = type === 'c3_config' ? 'C3 Configuration' : type === 'compliance' ? 'Compliance Policies' : type === 'fixed' ? 'Fixed / Override' : 'Derived';
              return (
                <React.Fragment key={type}>
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase bg-muted/50">{groupLabel}</div>
                  {items.map(r => (
                    <button key={r.value} type="button" onClick={() => handleSelect('rate_source', r.value)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors border-b border-border/50 last:border-0">
                      <span className="font-medium">{r.label}</span>
                      {r.configKey && <Badge variant="outline" className="text-[8px] h-3.5 px-1 ml-1">C3</Badge>}
                    </button>
                  ))}
                </React.Fragment>
              );
            })}
          </div>
        )}

        {selectedType === 'derived_metric' && (
          <div className="max-h-48 overflow-y-auto border-t border-border">
            {DERIVED_METRICS.map(d => (
              <button key={d.value} type="button" onClick={() => handleSelect('derived_metric', d.value)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors border-b border-border/50 last:border-0">
                <span className="font-medium">{d.label}</span>
                <span className="text-muted-foreground ml-1">— {d.description}</span>
              </button>
            ))}
          </div>
        )}

        {selectedType === 'constant' && (
          <div className="p-2 border-t border-border flex gap-2">
            <Input
              type="number"
              step="any"
              placeholder="e.g. 365, 12, 0.05"
              value={constantValue}
              onChange={e => setConstantValue(e.target.value)}
              className="h-8 text-xs"
              onKeyDown={e => e.key === 'Enter' && handleAddConstant()}
            />
            <Button type="button" size="sm" className="h-8 text-xs" onClick={handleAddConstant} disabled={!constantValue.trim()}>
              Add
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

// ── Term Card ──
const TermCard = ({
  term,
  index,
  onUpdate,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  isDragTarget,
  totalTerms,
}: {
  term: FormulaTerm;
  index: number;
  onUpdate: (updated: FormulaTerm) => void;
  onRemove: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  isDragTarget: boolean;
  totalTerms: number;
}) => {
  const addFactor = (type: FactorType, value: string) => {
    const joinOp: FactorJoinOp = 'multiply';
    onUpdate({ ...term, factors: [...term.factors, createFactor(type, value, joinOp)] });
  };

  const removeFactor = (factorId: string) => {
    onUpdate({ ...term, factors: term.factors.filter(f => f.id !== factorId) });
  };

  const changeFactorJoinOp = (factorId: string, op: FactorJoinOp) => {
    onUpdate({ ...term, factors: term.factors.map(f => f.id === factorId ? { ...f, joinOp: op } : f) });
  };

  const toggleOperator = () => {
    if (index === 0) return;
    onUpdate({ ...term, operator: term.operator === 'subtract' ? 'add' : 'subtract' });
  };

  const setFunctionWrapper = (fn: string) => {
    onUpdate({ ...term, functionWrapper: fn === 'none' ? undefined : fn });
  };

  return (
    <div className="space-y-1">
      {/* Operator connector */}
      {index > 0 && (
        <div className="flex items-center justify-center py-1">
          <button
            type="button"
            onClick={toggleOperator}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border border-border hover:border-primary hover:bg-primary/5 transition-all cursor-pointer select-none"
            title="Click to toggle + / −"
          >
            <span className="text-primary text-sm">{term.operator === 'subtract' ? '−' : '+'}</span>
            <span className="text-muted-foreground font-normal text-[10px]">click to toggle</span>
          </button>
        </div>
      )}

      {/* Term card */}
      <div
        draggable
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className={`group relative border rounded-lg p-3 transition-all ${
          isDragTarget ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border bg-card hover:border-muted-foreground/30'
        }`}
      >
        {/* Header row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground/40 cursor-grab active:cursor-grabbing" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Term {index + 1}</span>
            {/* Function wrapper */}
            <Select value={term.functionWrapper || 'none'} onValueChange={setFunctionWrapper}>
              <SelectTrigger className="h-6 w-[90px] text-[10px] border-dashed">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FUNCTION_WRAPPERS.map(fw => (
                  <SelectItem key={fw.value} value={fw.value} className="text-xs">
                    {fw.label} <span className="text-muted-foreground ml-1">— {fw.description}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {totalTerms > 1 && (
            <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={onRemove}>
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Factors row */}
        <div className="flex items-center flex-wrap gap-1.5 min-h-[32px]">
          {term.functionWrapper && term.functionWrapper !== 'none' && (
            <span className="text-xs font-mono text-purple-600 dark:text-purple-400 font-bold">{term.functionWrapper}(</span>
          )}

          {term.factors.length === 0 && (
            <span className="text-xs text-muted-foreground italic">No factors — add a base metric, rate, or derived value</span>
          )}

          {term.factors.map((factor, fi) => (
            <FactorChip
              key={factor.id}
              factor={factor}
              isFirst={fi === 0}
              onRemove={() => removeFactor(factor.id)}
              onChangeJoinOp={(op) => changeFactorJoinOp(factor.id, op)}
            />
          ))}

          {term.functionWrapper && term.functionWrapper !== 'none' && (
            <span className="text-xs font-mono text-purple-600 dark:text-purple-400 font-bold">)</span>
          )}

          <AddFactorPopover onAdd={addFactor} />
        </div>
      </div>
    </div>
  );
};

// ── Main Formula Builder ──
export const FormulaBuilder = ({ terms, onChange }: FormulaBuilderProps) => {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const addTerm = () => {
    onChange([...terms, createBlankTerm(terms.length === 0 ? null : 'add')]);
  };

  const updateTerm = (index: number, updated: FormulaTerm) => {
    const next = [...terms];
    next[index] = updated;
    onChange(next);
  };

  const removeTerm = (index: number) => {
    const next = terms.filter((_, i) => i !== index);
    // Ensure first term has no operator
    if (next.length > 0 && next[0].operator !== null) {
      next[0] = { ...next[0], operator: null };
    }
    onChange(next);
  };

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };

  const handleDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === targetIdx) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }
    const next = [...terms];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(targetIdx, 0, moved);
    // Fix operators: first term = null, rest = their current or 'add'
    next.forEach((t, i) => {
      if (i === 0) t.operator = null;
      else if (!t.operator) t.operator = 'add';
    });
    onChange(next);
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const preview = generateFormulaFromTerms(terms);

  return (
    <div className="space-y-3">
      {/* Term cards */}
      {terms.map((term, idx) => (
        <TermCard
          key={term.id}
          term={term}
          index={idx}
          totalTerms={terms.length}
          onUpdate={(updated) => updateTerm(idx, updated)}
          onRemove={() => removeTerm(idx)}
          onDragStart={(e) => handleDragStart(e, idx)}
          onDragOver={(e) => handleDragOver(e, idx)}
          onDrop={(e) => handleDrop(e, idx)}
          isDragTarget={dragOverIdx === idx && dragIdx !== idx}
        />
      ))}

      {/* Add term button */}
      <Button type="button" variant="outline" size="sm" onClick={addTerm} className="text-xs w-full border-dashed">
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        Add Term
      </Button>

      {/* Live Formula Preview */}
      {terms.length > 0 && terms.some(t => t.factors.length > 0) && (
        <div className="bg-muted/50 border border-border rounded-lg p-3 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Live Formula Preview</span>
          </div>
          <p className="text-sm font-mono text-primary leading-relaxed break-words">{preview}</p>
          <div className="flex flex-wrap gap-1 pt-1">
            {terms.flatMap(t => t.factors).map(f => {
              const cfg = FACTOR_TYPE_CONFIG[f.type];
              return (
                <Badge key={f.id} variant="outline" className={`text-[9px] ${cfg.color}`}>
                  {cfg.label}: {resolveFactorLabel(f)}
                </Badge>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
