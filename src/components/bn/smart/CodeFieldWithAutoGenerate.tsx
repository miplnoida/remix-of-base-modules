/**
 * CodeFieldWithAutoGenerate — auto-suggests a unique code from a prefix and
 * blocks duplicates by checking against a provided existingCodes set.
 */
import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Wand2 } from 'lucide-react';

interface Props {
  label?: string;
  prefix: string;
  value: string;
  onChange: (v: string) => void;
  existingCodes?: string[];
  disabled?: boolean;
  required?: boolean;
  helpText?: string;
}

function nextCode(prefix: string, taken: Set<string>): string {
  for (let i = 1; i < 10000; i++) {
    const code = `${prefix}-${String(i).padStart(4, '0')}`;
    if (!taken.has(code)) return code;
  }
  return `${prefix}-${Date.now()}`;
}

export function CodeFieldWithAutoGenerate({
  label = 'Code',
  prefix,
  value,
  onChange,
  existingCodes = [],
  disabled,
  required,
  helpText,
}: Props) {
  const taken = React.useMemo(() => new Set(existingCodes.map((c) => c.toUpperCase())), [existingCodes]);
  const isDuplicate = value.trim().length > 0 && taken.has(value.trim().toUpperCase());

  return (
    <div className="space-y-1.5">
      {label && (
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
      )}
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          disabled={disabled}
          placeholder={`${prefix}-0001`}
          className={isDuplicate ? 'border-destructive focus-visible:ring-destructive' : ''}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled}
          onClick={() => onChange(nextCode(prefix, taken))}
          title="Auto-generate next available code"
        >
          <Wand2 className="h-4 w-4" />
        </Button>
      </div>
      {isDuplicate && <p className="text-xs text-destructive">This code already exists. Pick a different one or auto-generate.</p>}
      {helpText && !isDuplicate && <p className="text-xs text-muted-foreground">{helpText}</p>}
    </div>
  );
}
