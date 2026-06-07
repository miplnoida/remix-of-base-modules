import { useMemo } from 'react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { usePaymentMethods } from '@/hooks/bn/useBnPaymentMasters';
import type { BnPaymentMethod as BnPaymentMethodCode } from '@/types/bnPaymentProfile';

interface Props {
  value: BnPaymentMethodCode | '';
  onChange: (method: BnPaymentMethodCode) => void;
  /** Restrict to product policy's allowed methods (codes). */
  allowedMethods?: BnPaymentMethodCode[];
  disabled?: boolean;
  className?: string;
}

export default function PaymentMethodSelector({
  value, onChange, allowedMethods, disabled, className,
}: Props) {
  const { data: methods = [], isLoading } = usePaymentMethods();

  const options = useMemo(() => {
    const filtered = methods
      .filter((m: any) => m.is_active !== false)
      .filter((m: any) => !allowedMethods?.length || allowedMethods.includes(m.method_code as BnPaymentMethodCode));
    return filtered.map((m: any) => ({
      value: m.method_code as string,
      label: `${m.method_code} — ${m.method_name ?? m.method_code}`,
      searchText: `${m.method_code} ${m.method_name ?? ''}`,
    }));
  }, [methods, allowedMethods]);

  return (
    <SearchableSelect
      options={options}
      value={value}
      onValueChange={(v) => onChange(v as BnPaymentMethodCode)}
      placeholder={isLoading ? 'Loading methods…' : 'Select payment method…'}
      searchPlaceholder="Search…"
      emptyMessage="No payment methods configured."
      disabled={disabled || isLoading}
      className={className}
    />
  );
}
