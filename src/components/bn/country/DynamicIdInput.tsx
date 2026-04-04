import React, { useState, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useBnCountry } from '@/contexts/BnCountryContext';

interface DynamicIdInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  label?: string;
}

const DynamicIdInput: React.FC<DynamicIdInputProps> = ({ value, onChange, error, disabled, label }) => {
  const { primaryIdRule, validateId } = useBnCountry();
  const [localError, setLocalError] = useState('');

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    // Apply mask-based filtering: only allow characters matching mask pattern
    if (primaryIdRule?.format_mask) {
      const maxLen = primaryIdRule.digit_length || primaryIdRule.format_mask.length;
      if (v.length > maxLen) return;
    }
    onChange(v);
    if (v) {
      const result = validateId(v);
      setLocalError(result.valid ? '' : result.message);
    } else {
      setLocalError('');
    }
  }, [onChange, primaryIdRule, validateId]);

  const displayError = error || localError;
  const displayLabel = label || primaryIdRule?.id_label || 'ID Number';

  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium">
        {displayLabel}
        <span className="text-destructive ml-1">*</span>
      </Label>
      <Input
        value={value}
        onChange={handleChange}
        placeholder={primaryIdRule?.example_value || ''}
        disabled={disabled}
        maxLength={primaryIdRule?.digit_length || undefined}
        className={displayError ? 'border-destructive focus-visible:ring-destructive' : ''}
      />
      {primaryIdRule && (
        <p className="text-xs text-muted-foreground">
          Format: {primaryIdRule.format_mask} ({primaryIdRule.digit_length} characters)
        </p>
      )}
      {displayError && <p className="text-xs text-destructive mt-1">{displayError}</p>}
    </div>
  );
};

export default DynamicIdInput;
