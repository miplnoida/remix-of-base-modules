import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle, Clock, DollarSign, Scale, FileText, Shield } from 'lucide-react';

interface SnapshotData {
  filedCount: number;
  notFiledCount: number;
  paidCount: number;
  partialCount: number;
  unpaidCount: number;
  totalOutstanding: number;
  openViolations: number;
  reviewViolations: number;
  repeatCount: number;
  hasActiveArrangement: boolean;
  currentNoticeStage: string | null;
}

interface Props {
  snapshot: SnapshotData | null;
  isLoading: boolean;
}

export default function ComplianceSnapshot({ snapshot, isLoading }: Props) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Compliance Snapshot</CardTitle></CardHeader>
        <CardContent><p className="text-xs text-muted-foreground animate-pulse">Loading employer context...</p></CardContent>
      </Card>
    );
  }

  if (!snapshot) {
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Compliance Snapshot</CardTitle></CardHeader>
        <CardContent><p className="text-xs text-muted-foreground">Select an employer to view compliance history</p></CardContent>
      </Card>
    );
  }

  const items = [
    { icon: FileText, label: 'Filing (last 6)', value: `${snapshot.filedCount}/6 filed`, color: snapshot.notFiledCount > 0 ? 'text-amber-600' : 'text-emerald-600' },
    { icon: DollarSign, label: 'Payment', value: `${snapshot.paidCount} paid, ${snapshot.unpaidCount} unpaid`, color: snapshot.unpaidCount > 0 ? 'text-red-600' : 'text-emerald-600' },
    { icon: AlertTriangle, label: 'Outstanding', value: `EC$${snapshot.totalOutstanding.toLocaleString()}`, color: snapshot.totalOutstanding > 0 ? 'text-red-600' : 'text-emerald-600' },
    { icon: Shield, label: 'Open Violations', value: `${snapshot.openViolations}`, color: snapshot.openViolations > 0 ? 'text-amber-600' : 'text-muted-foreground' },
    { icon: Clock, label: 'Review Queue', value: `${snapshot.reviewViolations}`, color: snapshot.reviewViolations > 0 ? 'text-amber-600' : 'text-muted-foreground' },
    { icon: Scale, label: 'Repeat (12mo)', value: `${snapshot.repeatCount}`, color: snapshot.repeatCount >= 3 ? 'text-red-600' : 'text-muted-foreground' },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Compliance Snapshot
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <item.icon className="h-3 w-3" />
              {item.label}
            </span>
            <span className={`font-medium ${item.color}`}>{item.value}</span>
          </div>
        ))}

        <div className="border-t pt-2 mt-2 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Arrangement</span>
            <Badge variant={snapshot.hasActiveArrangement ? 'default' : 'outline'} className="text-[10px] h-5">
              {snapshot.hasActiveArrangement ? 'Active' : 'None'}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Notice Stage</span>
            <Badge variant={snapshot.currentNoticeStage ? 'secondary' : 'outline'} className="text-[10px] h-5">
              {snapshot.currentNoticeStage || 'None'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
