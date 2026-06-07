import * as React from 'react';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { parseDateInput, toStorageDateTime } from '@/lib/culture/culture';
import { format } from 'date-fns';

interface Props {
  /** Stored ISO-8601 datetime */
  value?: string | null;
  onChange: (isoValue: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Date+time input bound to Global Settings date format.
 * Storage always ISO-8601 UTC.
 */
export const CultureDateTimeInput: React.FC<Props> = ({
  value,
  onChange,
  disabled,
  className,
}) => {
  const initial = value ? new Date(value) : undefined;
  const [date, setDate] = React.useState<Date | undefined>(initial);
  const [time, setTime] = React.useState<string>(initial ? format(initial, 'HH:mm') : '');

  React.useEffect(() => {
    if (!date) return;
    const [h, m] = (time || '00:00').split(':').map((n) => parseInt(n, 10) || 0);
    const combined = new Date(date);
    combined.setHours(h, m, 0, 0);
    onChange(toStorageDateTime(combined));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, time]);

  return (
    <div className={`flex gap-2 ${className ?? ''}`}>
      <DatePicker date={date} onDateChange={setDate} disabled={disabled} />
      <Input
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        disabled={disabled}
        className="w-32"
      />
    </div>
  );
};

export default CultureDateTimeInput;
