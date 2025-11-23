import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, TrendingUp, Target, Award } from 'lucide-react';

export default function PerformanceMetrics() {
  const metricsData = {
    avgTimeToJudgment: 145,
    targetTimeToJudgment: 120,
    avgRecoveryRate: 67,
    targetRecoveryRate: 75,
    caseResolutionRate: 82,
    targetResolutionRate: 85,
    byOfficer: [
      { officer: 'Sarah Johnson', casesHandled: 45, avgDaysToJudgment: 132, recoveryRate: 72, resolved: 38 },
      { officer: 'Michael Chen', casesHandled: 52, avgDaysToJudgment: 125, recoveryRate: 75, resolved: 44 },
      { officer: 'Lisa Wang', casesHandled: 38, avgDaysToJudgment: 148, recoveryRate: 65, resolved: 30 },
      { officer: 'David Rodriguez', casesHandled: 41, avgDaysToJudgment: 155, recoveryRate: 63, resolved: 32 },
      { officer: 'Emma Thompson', casesHandled: 48, avgDaysToJudgment: 138, recoveryRate: 68, resolved: 41 }
    ],
    byCaseType: [
      { type: 'Non-payment', avgDaysToJudgment: 135, recoveryRate: 70, casesResolved: 85, totalCases: 98 },
      { type: 'Late Filing', avgDaysToJudgment: 142, recoveryRate: 70, casesResolved: 72, totalCases: 86 },
      { type: 'Non-registration', avgDaysToJudgment: 158, recoveryRate: 63, casesResolved: 52, totalCases: 68 },
      { type: 'Significant Arrears', avgDaysToJudgment: 185, recoveryRate: 56, casesResolved: 15, totalCases: 28 }
    ]
  };

  return (
    <div className="flex-1 space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Performance Metrics</h1>
        <p className="text-muted-foreground">Time to judgment and recovery rates</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Avg Time to Judgment</p>
              <p className="text-2xl font-bold mt-2">{metricsData.avgTimeToJudgment} days</p>
              <p className="text-xs text-muted-foreground mt-1">Target: {metricsData.targetTimeToJudgment} days</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
          </div>
          <Badge variant={metricsData.avgTimeToJudgment <= metricsData.targetTimeToJudgment ? 'default' : 'destructive'}>
            {metricsData.avgTimeToJudgment > metricsData.targetTimeToJudgment 
              ? `${metricsData.avgTimeToJudgment - metricsData.targetTimeToJudgment} days over target`
              : 'On Target'}
          </Badge>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Avg Recovery Rate</p>
              <p className="text-2xl font-bold mt-2">{metricsData.avgRecoveryRate}%</p>
              <p className="text-xs text-muted-foreground mt-1">Target: {metricsData.targetRecoveryRate}%</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <Badge variant={metricsData.avgRecoveryRate >= metricsData.targetRecoveryRate ? 'default' : 'secondary'}>
            {metricsData.avgRecoveryRate < metricsData.targetRecoveryRate 
              ? `${metricsData.targetRecoveryRate - metricsData.avgRecoveryRate}% below target`
              : 'Meeting Target'}
          </Badge>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Case Resolution Rate</p>
              <p className="text-2xl font-bold mt-2">{metricsData.caseResolutionRate}%</p>
              <p className="text-xs text-muted-foreground mt-1">Target: {metricsData.targetResolutionRate}%</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <Badge variant={metricsData.caseResolutionRate >= metricsData.targetResolutionRate ? 'default' : 'secondary'}>
            {metricsData.caseResolutionRate < metricsData.targetResolutionRate 
              ? `${metricsData.targetResolutionRate - metricsData.caseResolutionRate}% below target`
              : 'Meeting Target'}
          </Badge>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Performance by Legal Officer</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Officer</th>
                <th className="text-right p-3 text-sm font-medium text-muted-foreground">Cases Handled</th>
                <th className="text-right p-3 text-sm font-medium text-muted-foreground">Avg Days to Judgment</th>
                <th className="text-right p-3 text-sm font-medium text-muted-foreground">Recovery Rate</th>
                <th className="text-right p-3 text-sm font-medium text-muted-foreground">Cases Resolved</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Performance</th>
              </tr>
            </thead>
            <tbody>
              {metricsData.byOfficer.map((item, idx) => {
                const resolutionRate = Math.round((item.resolved / item.casesHandled) * 100);
                const performanceScore = 
                  (item.avgDaysToJudgment <= metricsData.targetTimeToJudgment ? 1 : 0) +
                  (item.recoveryRate >= metricsData.targetRecoveryRate ? 1 : 0) +
                  (resolutionRate >= metricsData.targetResolutionRate ? 1 : 0);
                
                return (
                  <tr key={idx} className="border-b hover:bg-muted/50">
                    <td className="p-3 font-medium">{item.officer}</td>
                    <td className="p-3 text-right">{item.casesHandled}</td>
                    <td className="p-3 text-right">
                      <Badge variant={item.avgDaysToJudgment <= metricsData.targetTimeToJudgment ? 'default' : 'secondary'}>
                        {item.avgDaysToJudgment} days
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <Badge variant={item.recoveryRate >= metricsData.targetRecoveryRate ? 'default' : 'secondary'}>
                        {item.recoveryRate}%
                      </Badge>
                    </td>
                    <td className="p-3 text-right">{item.resolved}/{item.casesHandled}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {performanceScore >= 2 && <Award className="h-4 w-4 text-amber-600" />}
                        <Badge variant={performanceScore >= 2 ? 'default' : 'secondary'}>
                          {performanceScore === 3 ? 'Excellent' : performanceScore === 2 ? 'Good' : 'Needs Improvement'}
                        </Badge>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Performance by Case Type</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Case Type</th>
                <th className="text-right p-3 text-sm font-medium text-muted-foreground">Avg Days to Judgment</th>
                <th className="text-right p-3 text-sm font-medium text-muted-foreground">Recovery Rate</th>
                <th className="text-right p-3 text-sm font-medium text-muted-foreground">Cases Resolved</th>
                <th className="text-right p-3 text-sm font-medium text-muted-foreground">Resolution Rate</th>
              </tr>
            </thead>
            <tbody>
              {metricsData.byCaseType.map((item, idx) => {
                const resolutionRate = Math.round((item.casesResolved / item.totalCases) * 100);
                return (
                  <tr key={idx} className="border-b hover:bg-muted/50">
                    <td className="p-3 font-medium">{item.type}</td>
                    <td className="p-3 text-right">
                      <Badge variant={item.avgDaysToJudgment <= metricsData.targetTimeToJudgment ? 'default' : 'secondary'}>
                        {item.avgDaysToJudgment} days
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <Badge variant={item.recoveryRate >= metricsData.targetRecoveryRate ? 'default' : 'secondary'}>
                        {item.recoveryRate}%
                      </Badge>
                    </td>
                    <td className="p-3 text-right">{item.casesResolved}/{item.totalCases}</td>
                    <td className="p-3 text-right">
                      <Badge variant={resolutionRate >= metricsData.targetResolutionRate ? 'default' : 'secondary'}>
                        {resolutionRate}%
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
