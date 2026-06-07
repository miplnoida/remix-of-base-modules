import { useMemo } from 'react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useBankBranches } from '@/hooks/bn/useBnPaymentMasters';
import type { BnBankBranch } from '@/types/bnBankEft';

interface Props {
  bankCode: string | null | undefined;
  value: string;
  onChange: (branch: BnBankBranch | null) => void;
  disabled?: boolean;
  includeInactive?: boolean;
  className?: string;
}

export default function BranchSelector({
  bankCode, value, onChange, disabled, includeInactive = false, className,
}: Props) {
  const { data: branches = [], isLoading } = useBankBranches(bankCode ?? null);

  const filtered = useMemo(
    () => branches.filter((b: any) => includeInactive || b.is_active !== false),
    [branches, includeInactive],
  );
  const options = useMemo(
    () => filtered.map((b) => ({
      value: b.branch_code,
      label: `${b.branch_code} — ${b.branch_name}${(b as any).is_active === false ? ' (inactive)' : ''}`,
      searchText: `${b.branch_code} ${b.branch_name}`,
    })),
    [filtered],
  );

  const disabledFinal = disabled || !bankCode || isLoading;
  return (
    <SearchableSelect
      options={options}
      value={value}
      onValueChange={(v) => {
        const picked = filtered.find((b) => b.branch_code === v) ?? null;
        onChange(picked);
      }}
      placeholder={!bankCode ? 'Select a bank first…' : isLoading ? 'Loading branches…' : 'Select branch…'}
      searchPlaceholder="Search by code or name…"
      emptyMessage="No branches configured for this bank."
      disabled={disabledFinal}
      className={className}
    />
  );
}
