import * as React from 'react';
import { DatePicker } from '@/components/ui/date-picker';
import { parseDateInput, toStorageDate } from '@/lib/culture/culture';

interface Props {
  /** Stored value in YYYY-MM-DD */
  value?: string | null;
  onChange: (storageValue: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Date input bound to Global Settings → Date Display Format.
 * Storage is always YYYY-MM-DD regardless of display format.
 */
export const CultureDateInput: React.FC<Props> = ({
  value,
  onChange,
  placeholder,
  disabled,
  className,
}) => {
  const dateObj = value ? parseDateInput(value) ?? undefined : undefined;
  return (
    <DatePicker
      date={dateObj}
      onDateChange={(d) => onChange(d ? toStorageDate(d) : '')}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    />
  );
};

export default CultureDateInput;
