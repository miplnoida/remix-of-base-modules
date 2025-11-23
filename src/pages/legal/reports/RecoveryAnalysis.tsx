import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, TrendingDown, Scale } from 'lucide-react';

export default function RecoveryAnalysis() {
  const recoveryData = {
    totalCourtOrdered: 12456780,
    totalRecovered: 8345210,
    recoveryRate: 67,
    pendingRecovery: 4111570,
    byQuarter: [
      { quarter: 'Q1 2024', courtOrdered: 2850000, recovered: 1920000, rate: 67 },
      { quarter: 'Q2 2024', courtOrdered: 3120000, recovered: 2145000, rate: 69 },
      { quarter: 'Q3 2024', courtOrdered: 2980000, recovered: 1980000, rate: 66 },
      { quarter: 'Q4 2024', courtOrdered: 3506780, recovered: 2300210, rate: 66 }
    ],
    byCaseType: [
      { type: 'Non-payment', courtOrdered: 5200000, recovered: 3650000, rate: 70 },
      { type: 'Late Filing', courtOrdered: 3100000, recovered: 2180000, rate: 70 },
      { type: 'Non-registration', courtOrdered: 2800000, recovered: 1750000, rate: 63 },
      { type: 'Significant Arrears', courtOrdered: 1356780, recovered: 765210, rate: 56 }
    ]
  };

  return (
    <div className="flex-1 space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Recovery Analysis</h1>
        <p className="text-muted-foreground">Recovery vs court-ordered amounts</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Court-Ordered</p>
              <p className="text-2xl font-bold mt-2">${recoveryData.totalCourtOrdered.toLocaleString()}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Scale className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Recovered</p>
              <p className="text-2xl font-bold mt-2 text-green-600">${recoveryData.totalRecovered.toLocaleString()}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Recovery Rate</p>
              <p className="text-2xl font-bold mt-2">{recoveryData.recoveryRate}%</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending Recovery</p>
              <p className="text-2xl font-bold mt-2 text-orange-600">${recoveryData.pendingRecovery.toLocaleString()}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
              <TrendingDown className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Quarterly Recovery Performance</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Quarter</th>
                <th className="text-right p-3 text-sm font-medium text-muted-foreground">Court-Ordered Amount</th>
                <th className="text-right p-3 text-sm font-medium text-muted-foreground">Amount Recovered</th>
                <th className="text-right p-3 text-sm font-medium text-muted-foreground">Recovery Rate</th>
              </tr>
            </thead>
            <tbody>
              {recoveryData.byQuarter.map((item, idx) => (
                <tr key={idx} className="border-b hover:bg-muted/50">
                  <td className="p-3 font-medium">{item.quarter}</td>
                  <td className="p-3 text-right">${item.courtOrdered.toLocaleString()}</td>
                  <td className="p-3 text-right text-green-600">${item.recovered.toLocaleString()}</td>
                  <td className="p-3 text-right">
                    <Badge variant={item.rate >= 70 ? 'default' : item.rate >= 60 ? 'secondary' : 'destructive'}>
                      {item.rate}%
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Recovery by Case Type</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Case Type</th>
                <th className="text-right p-3 text-sm font-medium text-muted-foreground">Court-Ordered Amount</th>
                <th className="text-right p-3 text-sm font-medium text-muted-foreground">Amount Recovered</th>
                <th className="text-right p-3 text-sm font-medium text-muted-foreground">Pending</th>
                <th className="text-right p-3 text-sm font-medium text-muted-foreground">Recovery Rate</th>
              </tr>
            </thead>
            <tbody>
              {recoveryData.byCaseType.map((item, idx) => (
                <tr key={idx} className="border-b hover:bg-muted/50">
                  <td className="p-3 font-medium">{item.type}</td>
                  <td className="p-3 text-right">${item.courtOrdered.toLocaleString()}</td>
                  <td className="p-3 text-right text-green-600">${item.recovered.toLocaleString()}</td>
                  <td className="p-3 text-right text-orange-600">${(item.courtOrdered - item.recovered).toLocaleString()}</td>
                  <td className="p-3 text-right">
                    <Badge variant={item.rate >= 70 ? 'default' : item.rate >= 60 ? 'secondary' : 'destructive'}>
                      {item.rate}%
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
