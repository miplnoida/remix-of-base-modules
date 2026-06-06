/**
 * SmartSelect — thin wrapper around SearchableSelect for use in BN config screens.
 * Supports async/loading state and a help tooltip.
 */
import * as React from 'react';
import { SearchableSelect, SearchableSelectOption } from '@/components/ui/searchable-select';
import { Loader2, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';

export interface SmartSelectProps {
  label?: string;
  options: SearchableSelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  includeAllOption?: string;
}

export function SmartSelect({
  label,
  options,
  value,
  onValueChange,
  placeholder = 'Select…',
  helpText,
  required,
  disabled,
  loading,
  error,
  includeAllOption,
}: SmartSelectProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex items-center gap-1.5">
          <Label className="text-sm font-medium">
            {label}
            {required && <span className="text-destructive ml-0.5">*</span>}
          </Label>
          {helpText && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">{helpText}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </div>
      )}
      <SearchableSelect
        options={options}
        value={value}
        onValueChange={onValueChange}
        placeholder={loading ? 'Loading…' : placeholder}
        disabled={disabled || loading}
        includeAllOption={includeAllOption}
        className={error ? 'border-destructive focus-visible:ring-destructive' : ''}
      />
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
