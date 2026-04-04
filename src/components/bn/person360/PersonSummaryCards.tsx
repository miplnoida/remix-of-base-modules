/**
 * Person 360 — Summary Cards
 * 
 * Key metrics at a glance.
 * Sources: bn_claim, bn_entitlement, bn_payment_instruction, ip_wages
 * Read-only.
 */
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, CheckCircle2, Wallet, CreditCard, Clock, CalendarCheck } from 'lucide-react';
import type { Person360Summary } from '@/services/bn/person360Service';

interface PersonSummaryCardsProps {
  summary: Person360Summary;
}

const cards: Array<{ key: keyof Person360Summary; label: string; icon: any; color: string; isCurrency?: boolean }> = [
  { key: 'totalClaims', label: 'Total Claims', icon: FileText, color: 'text-blue-600' },
  { key: 'activeClaims', label: 'Active Claims', icon: Clock, color: 'text-amber-600' },
  { key: 'activeEntitlements', label: 'Active Entitlements', icon: CheckCircle2, color: 'text-emerald-600' },
  { key: 'pendingPayables', label: 'Pending Payables', icon: CreditCard, color: 'text-violet-600' },
  { key: 'totalContributionWeeks', label: 'Contribution Weeks', icon: CalendarCheck, color: 'text-primary' },
  { key: 'totalDisbursed', label: 'Total Disbursed', icon: Wallet, color: 'text-teal-600', isCurrency: true },
];

export const PersonSummaryCards: React.FC<PersonSummaryCardsProps> = ({ summary }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
    {cards.map(({ key, label, icon: Icon, color, isCurrency }) => (
      <Card key={key} className="group hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Icon className={`h-4 w-4 ${color}`} />
            <span className="text-xs text-muted-foreground font-medium">{label}</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {(isCurrency as boolean)
              ? `$${(summary[key] as number).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
              : (summary[key] as number).toLocaleString()
            }
          </p>
        </CardContent>
      </Card>
    ))}
  </div>
);
