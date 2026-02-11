import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  AlertTriangle,
  CheckCircle2,
  History,
  ShieldCheck,
  PauseCircle,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { formatDisplayDate } from '@/lib/dateFormat';
import { useSelfEmployed } from '@/hooks/useSelfEmployed';

interface SEPStatusPanelProps {
  ssn: string;
  selfEmployed: ReturnType<typeof useSelfEmployed>;
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; variant: string; color: string }> = {
  P: { label: 'Pending', icon: AlertTriangle, variant: 'secondary', color: 'text-amber-500' },
  V: { label: 'Verified', icon: ShieldCheck, variant: 'default', color: 'text-blue-500' },
  A: { label: 'Active', icon: CheckCircle2, variant: 'default', color: 'text-green-500' },
  S: { label: 'Suspended', icon: PauseCircle, variant: 'destructive', color: 'text-orange-500' },
  C: { label: 'Ceased', icon: XCircle, variant: 'outline', color: 'text-muted-foreground' },
};

const allowedTransitions: Record<string, string[]> = {
  P: ['V', 'A', 'C'],
  V: ['A', 'S', 'C'],
  A: ['S', 'C'],
  S: ['A', 'C'],
  C: [],
};

export const SEPStatusPanel: React.FC<SEPStatusPanelProps> = ({ ssn, selfEmployed }) => {
  const {
    activities,
    auditHistory,
    loading,
    changeStatus,
    loadAuditHistory,
    eligibility,
    contributionSummary,
  } = selfEmployed;

  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  const selfRefNo = activities.length > 0 ? activities[0].self_ref_no : null;
  const currentStatus = activities.length > 0 ? activities[0].status || 'P' : null;
  const currentConfig = currentStatus ? statusConfig[currentStatus] : null;
  const transitions = currentStatus ? allowedTransitions[currentStatus] || [] : [];

  useEffect(() => {
    if (selfRefNo) {
      loadAuditHistory();
    }
  }, [selfRefNo, loadAuditHistory]);

  const handleChangeStatus = async () => {
    if (!selfRefNo || !newStatus) return;
    await changeStatus(selfRefNo, newStatus);
    setShowStatusDialog(false);
    setNewStatus('');
  };

  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Register as self-employed first to view status and audit trail.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              {currentConfig && (
                <>
                  <currentConfig.icon className={`h-8 w-8 ${currentConfig.color}`} />
                  <div>
                    <p className="text-sm text-muted-foreground">Current Status</p>
                    <Badge variant={currentConfig.variant as any} className="text-sm">
                      {currentConfig.label}
                    </Badge>
                  </div>
                </>
              )}
            </div>
            <div className="text-sm space-y-1 mt-4">
              <p><span className="text-muted-foreground">SREF:</span> <strong className="font-mono">{selfRefNo}</strong></p>
              <p><span className="text-muted-foreground">SSN:</span> <strong className="font-mono">{ssn}</strong></p>
              <p><span className="text-muted-foreground">Name:</span> <strong>{eligibility?.ip_name || '-'}</strong></p>
              <p><span className="text-muted-foreground">Activities:</span> <strong>{activities.length}</strong></p>
            </div>
            {transitions.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4 w-full"
                onClick={() => setShowStatusDialog(true)}
              >
                Change Status
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <History className="h-4 w-4" /> Activity Summary
            </h3>
            <div className="text-sm space-y-2">
              {activities.map((act) => (
                <div key={act.activity_seq_no} className="flex items-center justify-between border-b pb-1 last:border-0">
                  <div>
                    <span className="font-mono text-xs">#{act.activity_seq_no}</span>
                    <span className="ml-2">{act.activity_type || 'Unknown'}</span>
                  </div>
                  <Badge variant={statusConfig[act.status || 'P']?.variant as any} className="text-xs">
                    {statusConfig[act.status || 'P']?.label}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold mb-3">Contribution Overview</h3>
            <div className="text-sm space-y-2">
              <p><span className="text-muted-foreground">Total Records:</span> <strong>{contributionSummary?.total_contributions ?? 0}</strong></p>
              <p><span className="text-muted-foreground">Total SS Paid:</span> <strong>${(contributionSummary?.total_ss_amount ?? 0).toFixed(2)}</strong></p>
              <p><span className="text-muted-foreground">Period Range:</span></p>
              <p className="text-xs">
                {contributionSummary?.earliest_period ? formatDisplayDate(contributionSummary.earliest_period) : '-'}
                {' → '}
                {contributionSummary?.latest_period ? formatDisplayDate(contributionSummary.latest_period) : '-'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Audit History */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4" /> Audit Trail
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Activity Type</TableHead>
                <TableHead>Modified By</TableHead>
                <TableHead>Modified Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditHistory.map((record) => (
                <TableRow key={record.audit_id}>
                  <TableCell className="font-mono text-xs">{record.audit_id}</TableCell>
                  <TableCell>
                    <Badge variant={
                      record.action === 'Deleted' ? 'destructive' :
                      record.action?.includes('Before') ? 'secondary' : 'default'
                    } className="text-xs">
                      {record.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono">{record.activity_seq_no || '-'}</TableCell>
                  <TableCell>
                    {record.status ? (
                      <Badge variant={statusConfig[record.status]?.variant as any} className="text-xs">
                        {statusConfig[record.status]?.label || record.status}
                      </Badge>
                    ) : '-'}
                  </TableCell>
                  <TableCell>{record.activity_type || '-'}</TableCell>
                  <TableCell>{record.modifier || '-'}</TableCell>
                  <TableCell>{record.modified_date ? format(new Date(record.modified_date), 'dd/MM/yyyy HH:mm') : '-'}</TableCell>
                </TableRow>
              ))}
              {auditHistory.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No audit records found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Status Change Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change SEP Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg text-sm">
              Current Status: <Badge variant={currentConfig?.variant as any}>{currentConfig?.label}</Badge>
            </div>
            <div>
              <Label>New Status *</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger><SelectValue placeholder="Select new status" /></SelectTrigger>
                <SelectContent>
                  {transitions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {statusConfig[status]?.label || status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {newStatus === 'C' && (
              <div className="p-3 bg-destructive/10 rounded-lg text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 inline mr-1" />
                Ceasing will end all active business activities and prevent new contributions.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>Cancel</Button>
            <Button
              onClick={handleChangeStatus}
              disabled={!newStatus || loading}
              variant={newStatus === 'C' ? 'destructive' : 'default'}
            >
              Confirm Status Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
