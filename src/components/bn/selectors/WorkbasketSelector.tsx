import { useMemo } from 'react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useWorkbaskets, type BnWorkbasketRow } from '@/hooks/bn/useBnPaymentMasters';

interface Props {
  /** basket_code currently selected. */
  value: string;
  onChange: (basket: BnWorkbasketRow | null) => void;
  productCategory?: string | null;
  countryCode?: string | null;
  disabled?: boolean;
  includeInactive?: boolean;
  className?: string;
}

export default function WorkbasketSelector({
  value, onChange, productCategory, countryCode, disabled, includeInactive = false, className,
}: Props) {
  const { data: baskets = [], isLoading } = useWorkbaskets({
    productCategory: productCategory ?? null,
    countryCode: countryCode ?? null,
    activeOnly: !includeInactive,
  });

  const options = useMemo(
    () => baskets.map((b) => ({
      value: b.basket_code,
      label: `${b.basket_code} — ${b.basket_name}${b.is_active === false ? ' (inactive)' : ''}`,
      searchText: `${b.basket_code} ${b.basket_name} ${b.assigned_role}`,
    })),
    [baskets],
  );

  return (
    <SearchableSelect
      options={options}
      value={value}
      onValueChange={(v) => {
        const picked = baskets.find((b) => b.basket_code === v) ?? null;
        onChange(picked);
      }}
      placeholder={isLoading ? 'Loading workbaskets…' : 'Select workbasket…'}
      searchPlaceholder="Search by code, name, or role…"
      emptyMessage="No workbaskets configured."
      disabled={disabled || isLoading}
      className={className}
    />
  );
}
