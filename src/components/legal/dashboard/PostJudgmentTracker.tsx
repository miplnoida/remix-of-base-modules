import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { PostJudgmentCase } from '@/adapters/legalDashboardAdapter';
import { AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PostJudgmentTrackerProps {
  data: PostJudgmentCase[] | null;
  loading: boolean;
  onCaseClick?: (caseId: string) => void;
}

export function PostJudgmentTracker({ data, loading, onCaseClick }: PostJudgmentTrackerProps) {
  const navigate = useNavigate();

  if (loading || !data) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          14-Day Post-Judgment Tracker
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Case #</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Judgment Date</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Due By (D+14)</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Days Left</th>
                <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Amount Due</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted-foreground">
                    No cases at risk
                  </td>
                </tr>
              ) : (
                data.map((caseItem) => (
                  <tr
                    key={caseItem.caseNumber}
                    className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => {
                      if (onCaseClick) {
                        onCaseClick(caseItem.caseNumber);
                      } else {
                        navigate(`/legal/cases/${caseItem.caseNumber.toLowerCase()}`);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <td className="py-3 px-2">
                      <span className="text-sm font-medium text-foreground">{caseItem.caseNumber}</span>
                    </td>
                    <td className="py-3 px-2 text-sm text-muted-foreground">
                      {new Date(caseItem.judgmentDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-2 text-sm text-muted-foreground">
                      {new Date(caseItem.dueBy).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-2">
                      {caseItem.daysLeft < 0 ? (
                        <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                          <AlertCircle className="h-3 w-3" />
                          Overdue ({Math.abs(caseItem.daysLeft)}d)
                        </Badge>
                      ) : caseItem.daysLeft <= 3 ? (
                        <Badge variant="destructive" className="w-fit">
                          {caseItem.daysLeft}d left
                        </Badge>
                      ) : caseItem.daysLeft <= 7 ? (
                        <Badge className="bg-orange-500 hover:bg-orange-600 w-fit">
                          {caseItem.daysLeft}d left
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="w-fit">
                          {caseItem.daysLeft}d left
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-2 text-right text-sm font-semibold text-foreground">
                      {formatCurrency(caseItem.amountDue)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
