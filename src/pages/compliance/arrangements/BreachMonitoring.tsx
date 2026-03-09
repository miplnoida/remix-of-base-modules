import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Eye, Building2, DollarSign, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';

const mockBreaches = [
  { id: 'BRH-001', employer: 'Island Construction Ltd', regNo: 'R-10567', planId: 'PP-2025-00045', breachType: 'Missed Installment', breachDate: '2026-03-01', missedAmount: '$5,400', totalRemaining: '$42,000', consecutiveMisses: 2, status: 'Active', autoDetected: true },
  { id: 'BRH-002', employer: 'Palm View Resort', regNo: 'R-10456', planId: 'PP-2025-00038', breachType: 'Partial Payment', breachDate: '2026-02-28', missedAmount: '$1,200', totalRemaining: '$28,500', consecutiveMisses: 1, status: 'Active', autoDetected: true },
  { id: 'BRH-003', employer: 'Tropical Traders Inc', regNo: 'R-11245', planId: 'PP-2026-00012', breachType: 'Missed Installment', breachDate: '2026-02-15', missedAmount: '$3,800', totalRemaining: '$15,200', consecutiveMisses: 1, status: 'Resolved', autoDetected: true },
  { id: 'BRH-004', employer: 'KN Shipping Services', regNo: 'R-11023', planId: 'PP-2025-00022', breachType: 'Late Payment (>7 days)', breachDate: '2026-02-10', missedAmount: '$8,500', totalRemaining: '$85,000', consecutiveMisses: 3, status: 'Escalated to Legal', autoDetected: false },
];

const BreachMonitoring = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-semibold text-foreground">Breach Monitoring</h1>
        </div>
        <p className="text-muted-foreground">Automatic detection and tracking of payment arrangement breaches</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Active Breaches</p><p className="text-2xl font-bold text-destructive">{mockBreaches.filter(b => b.status === 'Active').length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Escalated</p><p className="text-2xl font-bold text-warning">{mockBreaches.filter(b => b.status.startsWith('Escalated')).length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Resolved</p><p className="text-2xl font-bold text-success">{mockBreaches.filter(b => b.status === 'Resolved').length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Auto-Detected</p><p className="text-2xl font-bold text-primary">{mockBreaches.filter(b => b.autoDetected).length}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Breach ID</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Employer</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Type</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Date</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Missed Amt</th>
                  <th className="text-center py-2 px-3 text-muted-foreground font-medium">Consecutive</th>
                  <th className="text-center py-2 px-3 text-muted-foreground font-medium">Status</th>
                  <th className="text-center py-2 px-3 text-muted-foreground font-medium">Detection</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mockBreaches.map(b => (
                  <tr key={b.id} className="border-b last:border-0 border-border hover:bg-muted/50">
                    <td className="py-2 px-3 font-mono text-xs font-medium text-foreground">{b.id}</td>
                    <td className="py-2 px-3">
                      <p className="font-medium text-foreground">{b.employer}</p>
                      <p className="text-xs text-muted-foreground font-mono">{b.regNo}</p>
                    </td>
                    <td className="py-2 px-3 text-foreground">{b.breachType}</td>
                    <td className="py-2 px-3 text-foreground">{b.breachDate}</td>
                    <td className="py-2 px-3 text-right font-medium text-foreground">{b.missedAmount}</td>
                    <td className="py-2 px-3 text-center">
                      <Badge variant={b.consecutiveMisses >= 3 ? 'destructive' : b.consecutiveMisses >= 2 ? 'default' : 'secondary'} className="text-[10px]">
                        {b.consecutiveMisses}x
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <Badge variant={b.status === 'Active' ? 'destructive' : b.status === 'Resolved' ? 'default' : 'secondary'} className="text-[10px]">
                        {b.status}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <Badge variant="outline" className="text-[10px]">{b.autoDetected ? 'Auto' : 'Manual'}</Badge>
                    </td>
                    <td className="py-2 px-3 text-right"><Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BreachMonitoring;
