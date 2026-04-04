/**
 * Person 360 — Workflow Alerts / Notifications Panel
 * 
 * Source: bn_escalation_event (escalations), bn_claim (pending claims)
 * Integration: Reuses existing workflow_instances + notification_templates
 * Read-only indicators
 * Role visibility: Claims Officer, Supervisor, Admin
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, Bell, CheckCircle2 } from 'lucide-react';
import type { Person360Claim } from '@/services/bn/person360Service';
import type { Person360Payable } from '@/services/bn/person360Service';

interface WorkflowAlertsPanelProps {
  claims: Person360Claim[];
  payables: Person360Payable[];
}

export const WorkflowAlertsPanel: React.FC<WorkflowAlertsPanelProps> = ({ claims, payables }) => {
  const pendingInfoClaims = claims.filter(c => c.status === 'PENDING_INFO');
  const urgentClaims = claims.filter(c => c.priority === 'URGENT' && !['CLOSED', 'DENIED'].includes(c.status));
  const heldPayables = payables.filter(p => p.status === 'HELD');
  const overdue = payables.filter(p => new Date(p.due_date) < new Date() && p.status === 'PENDING');

  const alerts = [
    ...(pendingInfoClaims.length > 0
      ? [{ icon: Bell, color: 'text-amber-600', bg: 'bg-amber-500/10', message: `${pendingInfoClaims.length} claim(s) awaiting additional information`, severity: 'warning' as const }]
      : []),
    ...(urgentClaims.length > 0
      ? [{ icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10', message: `${urgentClaims.length} urgent claim(s) requiring immediate attention`, severity: 'critical' as const }]
      : []),
    ...(heldPayables.length > 0
      ? [{ icon: Clock, color: 'text-destructive', bg: 'bg-destructive/10', message: `${heldPayables.length} payment(s) on hold`, severity: 'critical' as const }]
      : []),
    ...(overdue.length > 0
      ? [{ icon: Clock, color: 'text-amber-600', bg: 'bg-amber-500/10', message: `${overdue.length} overdue payable(s)`, severity: 'warning' as const }]
      : []),
  ];

  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <span className="text-sm text-muted-foreground">No active alerts for this contributor</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-300/50">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          Active Alerts ({alerts.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2">
        {alerts.map((alert, idx) => (
          <div key={idx} className={`flex items-center gap-3 rounded-md px-3 py-2 ${alert.bg}`}>
            <alert.icon className={`h-4 w-4 ${alert.color} shrink-0`} />
            <span className="text-sm">{alert.message}</span>
            <Badge variant="outline" className={`ml-auto text-xs ${alert.severity === 'critical' ? 'border-destructive text-destructive' : 'border-amber-400 text-amber-700'}`}>
              {alert.severity}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
