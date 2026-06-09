import { Badge } from '@/components/ui/badge';
import type { GovernanceStatus } from '@/services/bn/governance/ruleGovernanceService';

const META: Record<GovernanceStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  DRAFT:                 { label: 'Draft',                 variant: 'outline' },
  TECHNICAL_REVIEW:      { label: 'Technical Review',      variant: 'secondary' },
  LEGAL_REVIEW:          { label: 'Legal Review',          variant: 'secondary' },
  LEGAL_CONFIRMED:       { label: 'Legal Confirmed',       variant: 'default',
                           className: 'bg-emerald-600 hover:bg-emerald-600 text-white' },
  READY_FOR_PRODUCT_USE: { label: 'Ready for Product Use', variant: 'default',
                           className: 'bg-emerald-700 hover:bg-emerald-700 text-white' },
  ACTIVE:                { label: 'Active',                variant: 'default' },
  RETIRED:               { label: 'Retired',               variant: 'destructive' },
};

export function GovernanceStatusBadge({ status }: { status?: GovernanceStatus | string | null }) {
  const key = (status ?? 'DRAFT') as GovernanceStatus;
  const meta = META[key] ?? META.DRAFT;
  return <Badge variant={meta.variant} className={meta.className}>{meta.label}</Badge>;
}
