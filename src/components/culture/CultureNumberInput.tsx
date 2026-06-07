import * as React from 'react';
import { Input } from '@/components/ui/input';

interface Props {
  value?: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  min?: number;
  max?: number;
  step?: number;
  integer?: boolean;
}

/**
 * Generic numeric input. Storage always numeric.
 */
export const CultureNumberInput: React.FC<Props> = ({
  value,
  onChange,
  disabled,
  placeholder,
  className,
  min,
  max,
  step = 1,
  integer = false,
}) => {
  const [raw, setRaw] = React.useState<string>(
    value == null || isNaN(Number(value)) ? '' : String(value),
  );

  React.useEffect(() => {
    setRaw(value == null || isNaN(Number(value)) ? '' : String(value));
  }, [value]);

  return (
    <Input
      type="number"
      inputMode={integer ? 'numeric' : 'decimal'}
      step={integer ? 1 : step}
      min={min}
      max={max}
      value={raw}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      onChange={(e) => {
        const v = e.target.value;
        setRaw(v);
        if (v === '') return onChange(null);
        const n = integer ? parseInt(v, 10) : Number(v);
        onChange(isNaN(n) ? null : n);
      }}
    />
  );
};

export default CultureNumberInput;
