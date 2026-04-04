import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BnStatCard, BnEmptyState } from '@/components/bn/shared';
import { BarChart3, TrendingUp, Wallet, Calendar } from 'lucide-react';
import type { ContributionSummary } from '@/services/bn/determinationService';

interface Props {
  summary: ContributionSummary | null;
}

export const ContributionWagePanel: React.FC<Props> = ({ summary }) => {
  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4" /> Contributions & Wages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BnEmptyState type="empty" title="No contribution data" description="Contribution lookup requires a valid SSN." />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Wallet className="h-4 w-4" /> Contributions & Wages
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <BnStatCard title="Total Weeks" value={summary.totalWeeks} icon={BarChart3} subtitle={`${summary.windowStart} – ${summary.windowEnd}`} />
          <BnStatCard title="Total Amount" value={`$${summary.totalAmount.toLocaleString('en', { minimumFractionDigits: 2 })}`} icon={TrendingUp} />
          <BnStatCard title="Avg Weekly Wage" value={`$${summary.averageWeeklyWage.toFixed(2)}`} icon={BarChart3} />
          <BnStatCard title="Window" value={`${summary.windowStart} – ${summary.windowEnd}`} icon={Calendar} />
        </div>
      </CardContent>
    </Card>
  );
};
