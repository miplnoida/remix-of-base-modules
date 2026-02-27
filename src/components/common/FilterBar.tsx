import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RotateCcw } from 'lucide-react';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterField {
  key: string;
  label: string;
  type: 'select' | 'date';
  options?: FilterOption[];
  placeholder?: string;
}

interface FilterBarProps {
  filters: FilterField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onReset?: () => void;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  values,
  onChange,
  onReset,
  className = '',
}) => {
  return (
    <div className={`flex flex-wrap items-end gap-3 ${className}`}>
      {filters.map((filter) => (
        <div key={filter.key} className="space-y-1">
          <Label className="text-xs text-muted-foreground">{filter.label}</Label>
          {filter.type === 'select' && filter.options ? (
            <Select value={values[filter.key] || 'all'} onValueChange={(v) => onChange(filter.key, v)}>
              <SelectTrigger className="w-[160px] h-10">
                <SelectValue placeholder={filter.placeholder || 'Select...'} />
              </SelectTrigger>
              <SelectContent>
                {filter.options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              type="date"
              value={values[filter.key] || ''}
              onChange={(e) => onChange(filter.key, e.target.value)}
              className="w-[160px] h-10"
            />
          )}
        </div>
      ))}
      {onReset && (
        <Button variant="ghost" size="sm" onClick={onReset} className="h-10">
          <RotateCcw className="h-4 w-4 mr-1" />Reset
        </Button>
      )}
    </div>
  );
};
