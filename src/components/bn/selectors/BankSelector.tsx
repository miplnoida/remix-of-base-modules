import { useMemo } from 'react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useBanks } from '@/hooks/bn/useBnPaymentMasters';
import type { BnBankMaster } from '@/types/bnBankEft';

interface Props {
  /** bank_code currently selected (canonical id used by payment profile). */
  value: string;
  onChange: (bank: BnBankMaster | null) => void;
  countryCode?: string | null;
  disabled?: boolean;
  includeInactive?: boolean;
  placeholder?: string;
  className?: string;
}

export default function BankSelector({
  value, onChange, countryCode, disabled, includeInactive = false, placeholder = 'Select bank…', className,
}: Props) {
  const { data: banks = [], isLoading } = useBanks(countryCode ?? null);

  const filtered = useMemo(
    () => banks.filter((b: any) => includeInactive || b.is_active !== false),
    [banks, includeInactive],
  );
  const options = useMemo(
    () => filtered.map((b) => ({
      value: b.bank_code,
      label: `${b.bank_code} — ${b.bank_name}${(b as any).is_active === false ? ' (inactive)' : ''}`,
      searchText: `${b.bank_code} ${b.bank_name} ${(b as any).swift_code ?? ''}`,
    })),
    [filtered],
  );

  return (
    <SearchableSelect
      options={options}
      value={value}
      onValueChange={(v) => {
        const picked = filtered.find((b) => b.bank_code === v) ?? null;
        onChange(picked);
      }}
      placeholder={isLoading ? 'Loading banks…' : placeholder}
      searchPlaceholder="Search by code or name…"
      emptyMessage="No banks configured."
      disabled={disabled || isLoading}
      className={className}
    />
  );
}
