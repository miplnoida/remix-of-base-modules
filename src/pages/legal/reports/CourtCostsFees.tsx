import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, FileText, Scale, TrendingUp } from 'lucide-react';

export default function CourtCostsFees() {
  const feeData = {
    totalRevenue: 2456780,
    filingFees: 856000,
    courtCosts: 1245000,
    legalFees: 355780,
    byMonth: [
      { month: 'Jan 2024', filingFees: 78000, courtCosts: 125000, legalFees: 35000, total: 238000 },
      { month: 'Feb 2024', filingFees: 82000, courtCosts: 132000, legalFees: 38000, total: 252000 },
      { month: 'Mar 2024', filingFees: 75000, courtCosts: 118000, legalFees: 32000, total: 225000 },
      { month: 'Apr 2024', filingFees: 88000, courtCosts: 145000, legalFees: 42000, total: 275000 },
      { month: 'May 2024', filingFees: 92000, courtCosts: 155000, legalFees: 45000, total: 292000 },
      { month: 'Jun 2024', filingFees: 85000, courtCosts: 138000, legalFees: 38780, total: 261780 }
    ],
    byCaseType: [
      { type: 'Non-payment', filingFees: 345000, courtCosts: 520000, legalFees: 145000, total: 1010000 },
      { type: 'Late Filing', filingFees: 256000, courtCosts: 385000, legalFees: 98000, total: 739000 },
      { type: 'Non-registration', filingFees: 185000, courtCosts: 245000, legalFees: 78780, total: 508780 },
      { type: 'Significant Arrears', filingFees: 70000, courtCosts: 95000, legalFees: 34000, total: 199000 }
    ]
  };

  return (
    <div className="flex-1 space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Court Costs & Fees</h1>
        <p className="text-muted-foreground">Legal fees and court cost revenue</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold mt-2">${feeData.totalRevenue.toLocaleString()}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Filing Fees</p>
              <p className="text-2xl font-bold mt-2">${feeData.filingFees.toLocaleString()}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Court Costs</p>
              <p className="text-2xl font-bold mt-2">${feeData.courtCosts.toLocaleString()}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
              <Scale className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Legal Fees</p>
              <p className="text-2xl font-bold mt-2">${feeData.legalFees.toLocaleString()}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Monthly Revenue Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Month</th>
                <th className="text-right p-3 text-sm font-medium text-muted-foreground">Filing Fees</th>
                <th className="text-right p-3 text-sm font-medium text-muted-foreground">Court Costs</th>
                <th className="text-right p-3 text-sm font-medium text-muted-foreground">Legal Fees</th>
                <th className="text-right p-3 text-sm font-medium text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody>
              {feeData.byMonth.map((item, idx) => (
                <tr key={idx} className="border-b hover:bg-muted/50">
                  <td className="p-3 font-medium">{item.month}</td>
                  <td className="p-3 text-right">${item.filingFees.toLocaleString()}</td>
                  <td className="p-3 text-right">${item.courtCosts.toLocaleString()}</td>
                  <td className="p-3 text-right">${item.legalFees.toLocaleString()}</td>
                  <td className="p-3 text-right font-bold">${item.total.toLocaleString()}</td>
                </tr>
              ))}
              <tr className="border-t-2 font-bold bg-muted/30">
                <td className="p-3">Total (6 months)</td>
                <td className="p-3 text-right">
                  ${feeData.byMonth.reduce((sum, m) => sum + m.filingFees, 0).toLocaleString()}
                </td>
                <td className="p-3 text-right">
                  ${feeData.byMonth.reduce((sum, m) => sum + m.courtCosts, 0).toLocaleString()}
                </td>
                <td className="p-3 text-right">
                  ${feeData.byMonth.reduce((sum, m) => sum + m.legalFees, 0).toLocaleString()}
                </td>
                <td className="p-3 text-right">
                  ${feeData.byMonth.reduce((sum, m) => sum + m.total, 0).toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Revenue by Case Type</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Case Type</th>
                <th className="text-right p-3 text-sm font-medium text-muted-foreground">Filing Fees</th>
                <th className="text-right p-3 text-sm font-medium text-muted-foreground">Court Costs</th>
                <th className="text-right p-3 text-sm font-medium text-muted-foreground">Legal Fees</th>
                <th className="text-right p-3 text-sm font-medium text-muted-foreground">Total Revenue</th>
                <th className="text-right p-3 text-sm font-medium text-muted-foreground">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {feeData.byCaseType.map((item, idx) => (
                <tr key={idx} className="border-b hover:bg-muted/50">
                  <td className="p-3 font-medium">{item.type}</td>
                  <td className="p-3 text-right">${item.filingFees.toLocaleString()}</td>
                  <td className="p-3 text-right">${item.courtCosts.toLocaleString()}</td>
                  <td className="p-3 text-right">${item.legalFees.toLocaleString()}</td>
                  <td className="p-3 text-right font-bold">${item.total.toLocaleString()}</td>
                  <td className="p-3 text-right">
                    <Badge variant="outline">
                      {Math.round((item.total / feeData.totalRevenue) * 100)}%
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
