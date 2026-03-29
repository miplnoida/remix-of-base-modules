import { useState } from 'react';
import { useC3ConfigPeriods, useToggleC3ConfigActive, C3ConfigWithDetails } from '@/hooks/useC3ConfigManagement';
import { useUserCode } from '@/hooks/useUserCode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, Copy, Settings, Calendar, Plus } from 'lucide-react';
import { formatDisplayDate } from '@/lib/dateFormat';
import { C3ConfigCloneDialog } from '@/components/admin/c3-period-config/C3ConfigCloneDialog';
import { C3ConfigDetailsDialog } from '@/components/admin/c3-period-config/C3ConfigDetailsDialog';
import { C3ConfigCreateDialog } from '@/components/admin/c3-period-config/C3ConfigCreateDialog';

export function C3PeriodConfigTab() {
  const { data: configs, isLoading, error } = useC3ConfigPeriods();
  const toggleActive = useToggleC3ConfigActive();
  const { userCode } = useUserCode();

  const [selectedConfig, setSelectedConfig] = useState<C3ConfigWithDetails | null>(null);
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

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
        <p className="font-medium">Failed to load configurations</p>
        <p className="text-sm mt-1">{(error as Error).message}</p>
      </div>
    );
  }

  const handleClone = (config: C3ConfigWithDetails) => {
    setSelectedConfig(config);
    setShowCloneDialog(true);
  };

  const handleViewDetails = (config: C3ConfigWithDetails) => {
    setSelectedConfig(config);
    setShowDetailsDialog(true);
  };

  const handleToggleActive = async (config: C3ConfigWithDetails, isActive: boolean) => {
    await toggleActive.mutateAsync({
      periodId: config.id,
      isActive,
      userCode: userCode || undefined
    });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Open-ended';
    return formatDisplayDate(dateStr);
  };

  const formatRate = (rate: number) => {
    return `${(rate * 100).toFixed(2)}%`;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Configuration Periods
              </CardTitle>
              <CardDescription>
                Each period defines the calculation rules effective during that date range. Clone existing configurations to create new periods.
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Period
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Start Date</TableHead>
                  <TableHead className="w-[150px]">End Date</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead>SS Rate (Emp)</TableHead>
                  <TableHead>SS Rate (Empr)</TableHead>
                  <TableHead>EIB Rate</TableHead>
                  <TableHead>Levy Rate</TableHead>
                  <TableHead>Severance</TableHead>
                  <TableHead className="w-[180px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs?.map(config => (
                  <TableRow key={config.id}>
                    <TableCell className="font-medium">
                      {formatDate(config.start_date)}
                    </TableCell>
                    <TableCell>
                      {config.end_date ? formatDate(config.end_date) : (
                         <Badge variant="outline" className="bg-primary/10 text-primary">Current</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={config.is_active}
                        onCheckedChange={(checked) => handleToggleActive(config, checked)}
                        disabled={toggleActive.isPending}
                      />
                    </TableCell>
                    <TableCell>{config.details ? formatRate(config.details.employee_ss_rate) : '-'}</TableCell>
                    <TableCell>{config.details ? formatRate(config.details.employer_ss_rate) : '-'}</TableCell>
                    <TableCell>{config.details ? formatRate(config.details.employer_eib_rate) : '-'}</TableCell>
                    <TableCell>{config.details ? formatRate(config.details.employer_levy_rate) : '-'}</TableCell>
                    <TableCell>{config.details ? formatRate(config.details.employer_severance_rate) : '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewDetails(config)}
                          title="View/Edit Details"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleClone(config)}
                          title="Clone Configuration"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!configs || configs.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No configuration periods found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <C3ConfigCreateDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />

      {/* Clone Dialog */}
      <C3ConfigCloneDialog
        isOpen={showCloneDialog}
        onClose={() => setShowCloneDialog(false)}
        sourceConfig={selectedConfig}
      />

      {/* Details Dialog */}
      <C3ConfigDetailsDialog
        isOpen={showDetailsDialog}
        onClose={() => setShowDetailsDialog(false)}
        config={selectedConfig}
      />
    </>
  );
}
