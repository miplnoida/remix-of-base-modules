import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Award360TabKey } from './viewModels';
import { AWARD_360_TABS } from './viewModels';
import type { Award360TabAccess } from './useAward360TabAccess';

const LABEL: Record<Award360TabKey, string> = {
  overview: 'Overview',
  pensioner: 'Pensioner',
  claim: 'Claim',
  product: 'Product',
  beneficiaries: 'Beneficiaries',
  schedule: 'Schedule',
  payments: 'Payments',
  'life-certificates': 'Life Certs',
  medical: 'Medical',
  suspensions: 'Suspensions',
  overpayments: 'Overpayments',
  communications: 'Communications',
  audit: 'Audit',
};

export interface TabCounts {
  beneficiaries?: number;
  schedule?: number;
  payments?: number;
  'life-certificates'?: { count: number; warn: boolean };
  medical?: { count: number; warn: boolean };
  suspensions?: { count: number; warn: boolean };
  overpayments?: { outstanding: number };
  communications?: { failed: number };
}

export const Award360TabNavigation: React.FC<{
  active: Award360TabKey;
  onChange: (t: Award360TabKey) => void;
  counts: TabCounts;
  access: Record<Award360TabKey, Award360TabAccess>;
}> = ({ active, onChange, counts, access }) => {
  const visibleTabs = AWARD_360_TABS.filter((t) => access[t]?.visible);
  return (
    <div className="mb-4 overflow-x-auto border-b" role="tablist" aria-label="Award 360 tabs">
      <div className="flex min-w-max gap-1">
        {visibleTabs.map((t) => {
          const isActive = t === active;
          let badge: React.ReactNode = null;
          if (t === 'beneficiaries' && counts.beneficiaries) badge = counts.beneficiaries;
          if (t === 'schedule' && counts.schedule) badge = counts.schedule;
          if (t === 'payments' && counts.payments) badge = counts.payments;
          if (t === 'life-certificates' && counts['life-certificates']?.warn) badge = `${counts['life-certificates']!.count} overdue`;
          if (t === 'medical' && counts.medical?.warn) badge = `${counts.medical!.count} due`;
          if (t === 'suspensions' && counts.suspensions?.warn) badge = `${counts.suspensions!.count} pending`;
          if (t === 'overpayments' && (counts.overpayments?.outstanding ?? 0) > 0) badge = `$${counts.overpayments!.outstanding.toFixed(0)}`;
          if (t === 'communications' && (counts.communications?.failed ?? 0) > 0) badge = `${counts.communications!.failed} failed`;
          return (
            <Button
              key={t}
              role="tab"
              aria-selected={isActive}
              variant={isActive ? 'default' : 'ghost'}
              size="sm"
              className="rounded-b-none"
              onClick={() => onChange(t)}
              data-tab={t}
            >
              {LABEL[t]}
              {badge != null ? (
                <Badge variant="secondary" className="ml-2">
                  {badge}
                </Badge>
              ) : null}
            </Button>
          );
        })}
      </div>
    </div>
  );
};
