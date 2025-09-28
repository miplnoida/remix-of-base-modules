import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Download, Filter } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { zones } from '@/data/auditData';
import { useToast } from '@/hooks/use-toast';

export default function AuditReports() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [reportFilters, setReportFilters] = useState({
    zone: 'all',
    period: '',
    status: 'all',
    auditor: 'all',
    dateFrom: '',
    dateTo: ''
  });

  const generateReport = (reportType: string) => {
    toast({
      title: "Report Generated",
      description: `${reportType} report has been generated and downloaded.`
    });
  };

  const reportTypes = [
    {
      id: 'plan-summary',
      title: 'Audit Plan Summary Report',
      description: 'Summary of audit plans by zone and period',
      filters: ['zone', 'period', 'status']
    },
    {
      id: 'plan-detail',
      title: 'Plan Detail Report',
      description: 'Detailed view of plan assignments and notes',
      filters: ['zone', 'period']
    },
    {
      id: 'activity-schedule',
      title: 'Activity Schedule Report',
      description: 'List of scheduled audit events',
      filters: ['zone', 'auditor', 'dateFrom', 'dateTo']
    },
    {
      id: 'auditor-workload',
      title: 'Auditor Workload Report',
      description: 'Number of planned and completed activities by auditor',
      filters: ['auditor', 'dateFrom', 'dateTo']
    },
    {
      id: 'employer-status',
      title: 'Employer Audit Status Report',
      description: 'Audit activities and compliance status by employer',
      filters: ['zone', 'dateFrom', 'dateTo']
    },
    {
      id: 'findings-compliance',
      title: 'Findings & Compliance Report',
      description: 'Observations and monetary variance analysis',
      filters: ['zone', 'dateFrom', 'dateTo']
    },
    {
      id: 'followup-register',
      title: 'Follow-Up Action Register',
      description: 'Pending and overdue follow-up actions',
      filters: ['status', 'dateFrom', 'dateTo']
    },
    {
      id: 'closeout-summary',
      title: 'Plan Closeout Summary',
      description: 'KPIs and compliance distribution',
      filters: ['zone', 'period']
    },
    {
      id: 'audit-trail',
      title: 'Audit Trail Report',
      description: 'System actions and user activity log',
      filters: ['auditor', 'dateFrom', 'dateTo']
    }
  ];

  const FilterComponent = ({ reportType }: { reportType: any }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {reportType.filters.includes('zone') && (
        <div className="space-y-2">
          <Label>Zone</Label>
          <Select value={reportFilters.zone} onValueChange={(value) => setReportFilters({...reportFilters, zone: value})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Zones</SelectItem>
              {zones.map(zone => (
                <SelectItem key={zone.id} value={zone.id}>{zone.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      {reportType.filters.includes('period') && (
        <div className="space-y-2">
          <Label>Period</Label>
          <Input
            type="month"
            value={reportFilters.period}
            onChange={(e) => setReportFilters({...reportFilters, period: e.target.value})}
          />
        </div>
      )}
      
      {reportType.filters.includes('status') && (
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={reportFilters.status} onValueChange={(value) => setReportFilters({...reportFilters, status: value})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      
      {reportType.filters.includes('auditor') && (
        <div className="space-y-2">
          <Label>Auditor</Label>
          <Select value={reportFilters.auditor} onValueChange={(value) => setReportFilters({...reportFilters, auditor: value})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Auditors</SelectItem>
              <SelectItem value="auditor.jdoe@secureserve.gov">John Doe</SelectItem>
              <SelectItem value="auditor.asmith@secureserve.gov">Alice Smith</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      
      {reportType.filters.includes('dateFrom') && (
        <div className="space-y-2">
          <Label>From Date</Label>
          <Input
            type="date"
            value={reportFilters.dateFrom}
            onChange={(e) => setReportFilters({...reportFilters, dateFrom: e.target.value})}
          />
        </div>
      )}
      
      {reportType.filters.includes('dateTo') && (
        <div className="space-y-2">
          <Label>To Date</Label>
          <Input
            type="date"
            value={reportFilters.dateTo}
            onChange={(e) => setReportFilters({...reportFilters, dateTo: e.target.value})}
          />
        </div>
      )}
    </div>
  );

  if (!hasPermission('generate_reports')) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">You don't have permission to generate reports.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Audit Reports</h1>
        <p className="text-muted-foreground">Generate audit reports and analytics</p>
      </div>

      <Tabs defaultValue="reports">
        <TabsList>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="reports" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reportTypes.map((reportType) => (
              <Card key={reportType.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    {reportType.title}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{reportType.description}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FilterComponent reportType={reportType} />
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => generateReport(reportType.title)}
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Generate PDF
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => generateReport(`${reportType.title} (Excel)`)}
                    >
                      Excel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Compliance Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Compliance trend chart would be displayed here
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Audit Activity Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Activity overview chart would be displayed here
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Monetary Variance Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Variance analysis chart would be displayed here
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Auditor Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Performance metrics would be displayed here
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}