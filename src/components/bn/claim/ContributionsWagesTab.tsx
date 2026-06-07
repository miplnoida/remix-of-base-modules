/**
 * Contributions & Wages Tab — Displays contribution history from adapter
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, TrendingUp } from 'lucide-react';
import { useBnContributionSummary } from '@/hooks/bn/useBnIntegration';
import { BnDetailRow, BnDetailSection, BnEmptyState, BnStatCard } from '@/components/bn/shared';

import { formatNumber } from '@/lib/culture/culture';
import { formatDisplayDate } from '@/lib/dateFormat';
interface ContributionsWagesTabProps {
  ssn: string;
  windowStart?: string;
  windowEnd?: string;
}

export const ContributionsWagesTab: React.FC<ContributionsWagesTabProps> = ({
  ssn,
  windowStart,
  windowEnd,
}) => {
  // Default to last 3 years if no window specified
  const now = new Date();
  const threeYearsAgo = new Date(now);
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

  const start = windowStart || threeYearsAgo.toISOString().split('T')[0];
  const end = windowEnd || now.toISOString().split('T')[0];

  const { data: summary, isLoading, error } = useBnContributionSummary(ssn, start, end);

  if (isLoading) return <BnEmptyState type="loading" title="Loading contribution history..." />;
  if (error) return <BnEmptyState type="error" description="Could not load contribution data." />;
  if (!summary) return <BnEmptyState type="empty" title="No contribution data" />;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <BnStatCard
          title="Total Weeks"
          value={summary.totalWeeks}
          icon={BarChart3}
          subtitle={`${start} to ${end}`}
        />
        <BnStatCard
          title="Total Contributions"
          value={`$${formatNumber(summary.totalAmount, 2)}`}
          icon={TrendingUp}
        />
        <BnStatCard
          title="Avg Weekly Wage"
          value={`$${summary.averageWeeklyWage.toFixed(2)}`}
          icon={BarChart3}
        />
        <BnStatCard
          title="Window"
          value={`${summary.totalWeeks} wks`}
          icon={BarChart3}
          subtitle={`of ${Math.round((new Date(end).getTime() - new Date(start).getTime()) / (7 * 24 * 60 * 60 * 1000))} possible`}
        />
      </div>

      {/* Best Weeks Detail */}
      {summary.bestWeeks && summary.bestWeeks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Best Contribution Periods</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Employer</TableHead>
                  <TableHead className="text-right">Wages</TableHead>
                  <TableHead className="text-right">Weeks</TableHead>
                  <TableHead className="text-right">Contributions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.bestWeeks.map((w, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-sm">{w.period}</TableCell>
                    <TableCell className="text-sm">{w.employerName || w.employerRegNo}</TableCell>
                    <TableCell className="text-right font-mono text-sm">${w.wages.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-sm">{w.weeks}</TableCell>
                    <TableCell className="text-right font-mono text-sm">${w.contributions.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
