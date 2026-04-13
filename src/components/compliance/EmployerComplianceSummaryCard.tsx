import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Clock, FileText, Shield } from 'lucide-react';
import { useEmployerComplianceSummary } from '@/hooks/useEmployerComplianceSummary';
import { formatDateForDisplay } from '@/lib/format-config';
import { Skeleton } from '@/components/ui/skeleton';

interface EmployerComplianceSummaryCardProps {
  employerId: string | undefined;
  /** Compact mode hides secondary details */
  compact?: boolean;
  className?: string;
}

export const EmployerComplianceSummaryCard: React.FC<EmployerComplianceSummaryCardProps> = ({
  employerId,
  compact = false,
  className = '',
}) => {
  const { data: summary, isLoading, isError } = useEmployerComplianceSummary(employerId);

  if (!employerId) return null;

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !summary) return null;

  const hasWarning = !!summary.warningMessage;
  const isClean = !hasWarning && summary.linkedOpenCaseCount === 0 && !summary.breachDetected;

  const statusColor = (() => {
    if (summary.arrangementStatus === 'DEFAULTED') return 'destructive';
    if (summary.breachDetected || summary.overdueInstallmentCount > 0) return 'destructive';
    if (summary.arrangementStatus === 'ACTIVE') return 'default';
    if (summary.arrangementStatus === 'COMPLETED') return 'secondary';
    return 'outline';
  })();

  return (
    <Card className={`${className} ${hasWarning ? 'border-destructive/40' : ''}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          Compliance Summary
          {isClean && (
            <Badge variant="secondary" className="ml-auto text-xs">
              <CheckCircle className="h-3 w-3 mr-1" />
              Clear
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3 text-sm">
        {/* Warning banner */}
        {hasWarning && (
          <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-2.5 text-destructive text-xs">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{summary.warningMessage}</span>
          </div>
        )}

        {/* Arrangement row */}
        {summary.arrangementStatus && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Arrangement
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs">{summary.arrangementNumber}</span>
              <Badge variant={statusColor} className="text-xs">
                {summary.arrangementStatus}
              </Badge>
            </div>
          </div>
        )}

        {/* Key metrics */}
        {!compact && summary.hasActiveArrangement && (
          <>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Total Debt</span>
                <span className="font-medium text-foreground">
                  ${summary.totalDebt.toLocaleString('en', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Paid</span>
                <span className="font-medium text-foreground">
                  ${summary.totalPaid.toLocaleString('en', { minimumFractionDigits: 2 })}
                </span>
              </div>
              {summary.nextDueDate && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Next Due</span>
                  <span className="font-medium text-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDateForDisplay(summary.nextDueDate)}
                  </span>
                </div>
              )}
              {summary.overdueInstallmentCount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Overdue</span>
                  <span className="font-medium text-destructive">
                    {summary.overdueInstallmentCount} installment(s)
                  </span>
                </div>
              )}
            </div>

            {summary.outstandingInstallmentAmount > 0 && (
              <div className="flex justify-between text-xs pt-1 border-t">
                <span className="text-muted-foreground">Outstanding</span>
                <span className="font-semibold">
                  ${summary.outstandingInstallmentAmount.toLocaleString('en', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </>
        )}

        {/* Open cases */}
        {summary.linkedOpenCaseCount > 0 && (
          <div className="flex items-center justify-between text-xs pt-1 border-t">
            <span className="text-muted-foreground">Open Cases</span>
            <Badge variant="outline" className="text-xs">
              {summary.linkedOpenCaseCount}
            </Badge>
          </div>
        )}

        {/* No arrangement at all */}
        {!summary.arrangementStatus && summary.linkedOpenCaseCount === 0 && (
          <p className="text-xs text-muted-foreground italic">
            No active arrangement or open cases.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
