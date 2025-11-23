import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, TrendingUp } from 'lucide-react';

export default function AgingReceivables() {
  const agingData = {
    totalOutstanding: 18645230,
    buckets: [
      { range: '0-30 days', amount: 3200000, cases: 12, percentage: 17 },
      { range: '31-60 days', amount: 4100000, cases: 18, percentage: 22 },
      { range: '61-90 days', amount: 3850000, cases: 15, percentage: 21 },
      { range: '91-180 days', amount: 4250000, cases: 22, percentage: 23 },
      { range: '181-365 days', amount: 2145230, cases: 14, percentage: 12 },
      { range: 'Over 365 days', amount: 1100000, cases: 8, percentage: 6 }
    ],
    byEmployer: [
      { employer: 'Caribbean Construction Ltd', amount: 10778330, ageRange: 'Over 365 days', lastPayment: '2023-01-15' },
      { employer: 'Island Resort & Spa', amount: 2145000, ageRange: '181-365 days', lastPayment: '2023-08-20' },
      { employer: 'Tech Solutions Inc', amount: 1850000, ageRange: '91-180 days', lastPayment: '2024-02-10' },
      { employer: 'Belmont Services Ltd', amount: 1200000, ageRange: '61-90 days', lastPayment: '2024-03-15' },
      { employer: 'Paradise Hotels Group', amount: 980000, ageRange: '31-60 days', lastPayment: '2024-04-01' }
    ]
  };

  const getRiskLevel = (range: string) => {
    if (range.includes('Over') || range.includes('181-365')) return 'high';
    if (range.includes('91-180') || range.includes('61-90')) return 'medium';
    return 'low';
  };

  return (
    <div className="flex-1 space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Aging Receivables</h1>
        <p className="text-muted-foreground">Legal receivables aging buckets</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Outstanding</p>
              <p className="text-2xl font-bold mt-2">${agingData.totalOutstanding.toLocaleString()}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">High Risk (&gt;180 days)</p>
              <p className="text-2xl font-bold mt-2 text-destructive">
                ${(agingData.buckets[4].amount + agingData.buckets[5].amount).toLocaleString()}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Cases</p>
              <p className="text-2xl font-bold mt-2">
                {agingData.buckets.reduce((sum, b) => sum + b.cases, 0)}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Aging Buckets</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Age Range</th>
                <th className="text-right p-3 text-sm font-medium text-muted-foreground">Outstanding Amount</th>
                <th className="text-right p-3 text-sm font-medium text-muted-foreground">Number of Cases</th>
                <th className="text-right p-3 text-sm font-medium text-muted-foreground">% of Total</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Risk Level</th>
              </tr>
            </thead>
            <tbody>
              {agingData.buckets.map((bucket, idx) => {
                const riskLevel = getRiskLevel(bucket.range);
                return (
                  <tr key={idx} className="border-b hover:bg-muted/50">
                    <td className="p-3 font-medium">{bucket.range}</td>
                    <td className="p-3 text-right">${bucket.amount.toLocaleString()}</td>
                    <td className="p-3 text-right">{bucket.cases}</td>
                    <td className="p-3 text-right">{bucket.percentage}%</td>
                    <td className="p-3">
                      <Badge variant={
                        riskLevel === 'high' ? 'destructive' :
                        riskLevel === 'medium' ? 'secondary' : 'default'
                      }>
                        {riskLevel === 'high' ? 'High Risk' : riskLevel === 'medium' ? 'Medium Risk' : 'Low Risk'}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Top 5 Aged Receivables by Employer</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Employer</th>
                <th className="text-right p-3 text-sm font-medium text-muted-foreground">Outstanding Amount</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Age Range</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Last Payment</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Risk Level</th>
              </tr>
            </thead>
            <tbody>
              {agingData.byEmployer.map((item, idx) => {
                const riskLevel = getRiskLevel(item.ageRange);
                return (
                  <tr key={idx} className="border-b hover:bg-muted/50">
                    <td className="p-3 font-medium">{item.employer}</td>
                    <td className="p-3 text-right">${item.amount.toLocaleString()}</td>
                    <td className="p-3">{item.ageRange}</td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {new Date(item.lastPayment).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <Badge variant={
                        riskLevel === 'high' ? 'destructive' :
                        riskLevel === 'medium' ? 'secondary' : 'default'
                      }>
                        {riskLevel === 'high' ? 'High Risk' : riskLevel === 'medium' ? 'Medium Risk' : 'Low Risk'}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
