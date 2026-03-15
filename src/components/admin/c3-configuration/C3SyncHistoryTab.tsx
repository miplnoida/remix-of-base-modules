import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getConfigSyncLogs,
  getConfigChangeSummary,
  WizConfigSyncLog,
} from '@/services/wizAdminApiService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, RefreshCw, Eye, ArrowLeft, ArrowRight, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

const PAGE_SIZE = 15;

const FIELD_LABELS: Record<string, string> = {
  min_age_ss: 'Min Age (SS)',
  max_age_ss: 'Max Age (SS)',
  min_age_levy: 'Min Age (Levy)',
  max_age_levy: 'Max Age (Levy)',
  employee_ss_rate: 'Employee SS Rate',
  employee_ss_max_wage: 'Employee SS Max Wage',
  employer_ss_rate: 'Employer SS Rate',
  employer_eib_rate: 'Employer EIB Rate',
  employer_eib_max_wage: 'Employer EIB Max Wage',
  employer_ss_max_wage: 'Employer SS Max Wage',
  employer_levy_rate: 'Employer Levy Rate',
  employer_severance_rate: 'Employer Severance Rate',
  submission_due_day: 'Submission Due Day',
  levy_penalty_initial_rate: 'Levy Penalty Initial Rate',
  levy_penalty_subsequent_rate: 'Levy Penalty Subsequent Rate',
  severance_penalty_initial_rate: 'Severance Penalty Initial Rate',
  severance_penalty_subsequent_rate: 'Severance Penalty Subsequent Rate',
  ss_fine_initial_rate: 'SS Fine Initial Rate',
  ss_fine_subsequent_rate: 'SS Fine Subsequent Rate',
  nwd_employee_levy_rate: 'NWD Employee Levy Rate',
  levy_monthly_threshold: 'Levy Monthly Threshold',
  levy_use_monthly_when_exceeded: 'Levy Use Monthly When Exceeded',
};

const TABLE_LABELS: Record<string, string> = {
  wiz_c3_config_details: 'Configuration Details (Rates & Thresholds)',
  wiz_c3_config_periods: 'Configuration Periods',
  wiz_levy_slabs: 'Levy Slabs',
  wiz_bonus_policy_defaults: 'Bonus Policy Defaults',
  wiz_bonus_policy_exceptions: 'Bonus Policy Exceptions',
  wiz_holiday_pay_policy_defaults: 'Holiday Pay Policy Defaults',
  wiz_holiday_pay_policy_exceptions: 'Holiday Pay Policy Exceptions',
  wiz_calculation_config: 'Calculation Config (Global Rules)',
  wiz_income_codes: 'Income Codes',
  wiz_income_cat: 'Income Categories',
  wiz_self_emp_contrib_rate: 'Self-Employed Contribution Rates',
  wiz_income_code_policy_default: 'Income Code Policy Defaults',
  wiz_income_code_policy_exceptions: 'Income Code Policy Exceptions',
};

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return '—';
  try {
    return format(new Date(dateStr), 'dd/MM/yyyy HH:mm:ss');
  } catch {
    return dateStr;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'applied':
      return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Applied</Badge>;
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>;
    case 'received':
      return <Badge variant="secondary">Received</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function C3SyncHistoryTab() {
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<WizConfigSyncLog | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['wiz-config-sync-logs', page, statusFilter],
    queryFn: async () => {
      const res = await getConfigSyncLogs({
        page_offset: page * PAGE_SIZE,
        page_limit: PAGE_SIZE,
        status: statusFilter === 'all' ? null : statusFilter,
      });
      return res.data!;
    },
  });

  const { data: summary, isLoading: summaryLoading, error: summaryError } = useQuery({
    queryKey: ['wiz-config-change-summary', selectedLog?.id],
    queryFn: async () => {
      const res = await getConfigChangeSummary(selectedLog!.id);
      return res.data!;
    },
    enabled: !!selectedLog,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
        <p className="font-medium">Failed to load sync history</p>
        <p className="text-sm mt-1">{(error as Error).message}</p>
      </div>
    );
  }

  const logs = data?.logs || [];
  const total = data?.total_records || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Publish History (C3-Wizard)
              </CardTitle>
              <CardDescription>
                History of C3 configuration publishes and field-level changes applied on C3-Wizard
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="applied">Applied</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Published At</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Periods</TableHead>
                  <TableHead className="text-center">Levy Slabs</TableHead>
                  <TableHead className="text-center">Bonus Pol.</TableHead>
                  <TableHead className="text-center">Bonus Exc.</TableHead>
                  <TableHead className="text-center">Holiday Pol.</TableHead>
                  <TableHead className="text-center">Holiday Exc.</TableHead>
                  <TableHead className="text-center">Calc Config</TableHead>
                  <TableHead className="text-center">Income Codes</TableHead>
                  <TableHead className="text-center">SE Rates</TableHead>
                  <TableHead className="text-center">IC Pol.</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead className="text-center">Changes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map(log => (
                  <TableRow key={log.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedLog(log)}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {formatDateTime(log.received_from_admin_at)}
                    </TableCell>
                    <TableCell>{log.sync_version}</TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    <TableCell className="text-center">{log.config_periods_count}</TableCell>
                    <TableCell className="text-center">{log.levy_slabs_count}</TableCell>
                    <TableCell className="text-center">{log.bonus_policies_count}</TableCell>
                    <TableCell className="text-center">{log.bonus_exceptions_count}</TableCell>
                    <TableCell className="text-center">{log.holiday_policies_count}</TableCell>
                    <TableCell className="text-center">{log.holiday_exceptions_count}</TableCell>
                    <TableCell className="text-center">{(log as any).calculation_config_count || 0}</TableCell>
                    <TableCell className="text-center">{(log as any).income_codes_count || 0}</TableCell>
                    <TableCell className="text-center">{(log as any).se_contrib_rates_count || 0}</TableCell>
                    <TableCell className="text-center">{(log as any).income_code_policies_count || 0}</TableCell>
                    <TableCell className="text-sm text-destructive max-w-[200px] truncate">
                      {log.error_message || '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="sm" className="gap-1">
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={15} className="text-center py-8 text-muted-foreground">
                      No publish history found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  Next <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => { if (!open) setSelectedLog(null); }}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChevronRight className="h-5 w-5 text-primary" />
              Changes — {selectedLog ? formatDateTime(selectedLog.received_from_admin_at) : ''}
            </DialogTitle>
            <DialogDescription>
              {selectedLog && (
                <span className="flex items-center gap-3 mt-1">
                  {getStatusBadge(selectedLog.status)}
                  <span>Version {selectedLog.sync_version}</span>
                  {selectedLog.applied_at && (
                    <span className="text-xs text-muted-foreground">Applied: {formatDateTime(selectedLog.applied_at)}</span>
                  )}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {summaryLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : summaryError ? (
            <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
              <p className="font-medium">Unable to load change details</p>
              <p className="text-sm mt-1">
                {(summaryError as Error).message?.includes('permission denied')
                  ? 'The C3-Wizard system has not yet granted access to the change history table. Please contact the C3-Wizard team to enable the "wiz_config_change_history" table permissions.'
                  : (summaryError as Error).message}
              </p>
            </div>
          ) : summary ? (
            <div className="space-y-6">
              {summary.total_changes === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="font-medium">No field-level changes detected</p>
                  <p className="text-sm mt-1">All values were identical to the previous publish.</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    <strong>{summary.total_changes}</strong> field{summary.total_changes !== 1 ? 's' : ''} changed across{' '}
                    {Object.keys(summary.changes_by_table).length} table{Object.keys(summary.changes_by_table).length !== 1 ? 's' : ''}
                  </p>
                  {Object.entries(summary.changes_by_table).map(([tableName, changes]) => (
                    <div key={tableName}>
                      <h4 className="text-sm font-semibold text-foreground mb-2">
                        {TABLE_LABELS[tableName] || tableName}
                      </h4>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Field</TableHead>
                              <TableHead className="text-center">Old Value</TableHead>
                              <TableHead className="text-center">New Value</TableHead>
                              <TableHead>Changed By</TableHead>
                              <TableHead>Changed At</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {changes.map((change, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="font-medium">
                                  {FIELD_LABELS[change.field_name] || change.field_name}
                                </TableCell>
                                <TableCell className="text-center">
                                  <span className="text-destructive bg-destructive/10 px-2 py-0.5 rounded text-sm">
                                    {change.old_value ?? '—'}
                                  </span>
                                </TableCell>
                                <TableCell className="text-center">
                                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-sm">
                                    {change.new_value ?? '—'}
                                  </span>
                                </TableCell>
                                <TableCell>{change.changed_by || '—'}</TableCell>
                                <TableCell className="whitespace-nowrap text-sm">
                                  {formatDateTime(change.changed_at)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
