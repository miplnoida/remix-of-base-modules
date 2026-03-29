import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';

interface MultiSelectChipsProps {
  label: string;
  required?: boolean;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  maxSelections?: number;
  helperText?: string;
}

export function MultiSelectChips({
  label,
  required,
  options,
  selected,
  onChange,
  maxSelections,
  helperText,
}: MultiSelectChipsProps) {
  const toggle = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(s => s !== option));
    } else {
      if (maxSelections && selected.length >= maxSelections) return;
      onChange([...selected, option]);
    }
  };

  const remove = (option: string) => {
    onChange(selected.filter(s => s !== option));
  };

  return (
    <div className="space-y-2">
      <Label>{label} {required && <span className="text-destructive">*</span>}</Label>
      {helperText && <p className="text-[10px] text-muted-foreground">{helperText}</p>}
      
      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map(s => (
            <Badge key={s} variant="secondary" className="text-xs gap-1 pr-1">
              {s}
              <button
                type="button"
                onClick={() => remove(s)}
                className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      
      {/* Options grid */}
      <div className="border rounded-md p-2 max-h-[180px] overflow-y-auto space-y-0.5 bg-background">
        {options.map(option => {
          const isSelected = selected.includes(option);
          const isDisabled = !isSelected && !!maxSelections && selected.length >= maxSelections;
          return (
            <label
              key={option}
              className={`flex items-center gap-2 text-sm cursor-pointer hover:bg-muted rounded px-2 py-1 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => !isDisabled && toggle(option)}
                disabled={isDisabled}
              />
              <span className="select-none">{option}</span>
            </label>
          );
        })}
      </div>
      {maxSelections && (
        <p className="text-[10px] text-muted-foreground">Select up to {maxSelections} options</p>
      )}
    </div>
  );
}
