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
}

/**
 * Money input. Storage is always numeric. Display uses plain numeric entry
 * (locale formatting applied on display via culture.formatCurrency).
 */
export const CultureMoneyInput: React.FC<Props> = ({
  value,
  onChange,
  disabled,
  placeholder,
  className,
  min,
  max,
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
      inputMode="decimal"
      step="0.01"
      min={min}
      max={max}
      value={raw}
      placeholder={placeholder ?? '0.00'}
      disabled={disabled}
      className={className}
      onChange={(e) => {
        const v = e.target.value;
        setRaw(v);
        onChange(v === '' ? null : Number(v));
      }}
    />
  );
};

export default CultureMoneyInput;
