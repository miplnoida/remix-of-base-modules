import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CheckCircle, XCircle, Clock, Filter, Eye, Loader2, Inbox, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchComplianceMonitoringPage,
  fetchComplianceMonitoringStats,
  ComplianceMonitoringFilters,
} from '@/services/complianceReportingService';

const ComplianceMonitoring = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<ComplianceMonitoringFilters>({
    employerId: '',
    employerName: '',
    complianceStatus: '',
    riskLevel: '',
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Reset to first page when filters or page size change
  useEffect(() => {
    setPage(1);
  }, [filters.employerId, filters.employerName, filters.complianceStatus, filters.riskLevel, pageSize]);

  const { data: stats } = useQuery({
    queryKey: ['ce_compliance_monitoring_stats', filters],
    queryFn: () => fetchComplianceMonitoringStats(filters),
  });

  const { data: pageData, isLoading } = useQuery({
    queryKey: ['ce_compliance_monitoring_page', filters, page, pageSize],
    queryFn: () => fetchComplianceMonitoringPage(filters, page, pageSize),
  });

  const rows = pageData?.rows ?? [];
  const total = pageData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const fromIdx = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const toIdx = Math.min(total, page * pageSize);

  const normStatus = (s: string | null) => (s || '').toUpperCase();
  const normRisk = (s: string | null) => (s || '').toUpperCase();

  const getStatusIcon = (status: string | null) => {
    switch (normStatus(status)) {
      case 'COMPLIANT': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'NON_COMPLIANT':
      case 'CRITICAL': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'UNDER_REVIEW':
      case 'PARTIALLY_COMPLIANT': return <Clock className="h-4 w-4 text-warning" />;
      default: return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string | null) => {
    const variants: Record<string, string> = {
      'COMPLIANT': 'bg-success/10 text-success',
      'NON_COMPLIANT': 'bg-destructive/10 text-destructive',
      'CRITICAL': 'bg-destructive/10 text-destructive',
      'UNDER_REVIEW': 'bg-warning/15 text-warning',
      'PARTIALLY_COMPLIANT': 'bg-warning/15 text-warning',
    };
    return variants[normStatus(status)] || 'bg-muted text-muted-foreground';
  };

  const getRiskBadge = (risk: string) => {
    const variants: Record<string, string> = {
      'MINIMAL': 'bg-success/10 text-success',
      'LOW': 'bg-success/10 text-success',
      'MEDIUM': 'bg-warning/15 text-warning',
      'HIGH': 'bg-destructive/10 text-destructive',
      'CRITICAL': 'bg-destructive/10 text-destructive',
    };
    return variants[normRisk(risk)] || 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Compliance Monitoring</h1>
        <p className="text-muted-foreground mt-2">Monitor employer compliance status and violations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-muted-foreground">Compliant</p><p className="text-2xl font-bold text-success">{stats?.compliant ?? 0}</p></div><CheckCircle className="h-8 w-8 text-success" /></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-muted-foreground">Non-Compliant</p><p className="text-2xl font-bold text-destructive">{stats?.nonCompliant ?? 0}</p></div><XCircle className="h-8 w-8 text-destructive" /></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-muted-foreground">Under Review</p><p className="text-2xl font-bold text-warning">{stats?.underReview ?? 0}</p></div><Clock className="h-8 w-8 text-warning" /></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-muted-foreground">High Risk</p><p className="text-2xl font-bold text-destructive">{stats?.highRisk ?? 0}</p></div><AlertTriangle className="h-8 w-8 text-destructive" /></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5" />Filters</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div><Label>Employer ID</Label><Input placeholder="Enter Employer ID" value={filters.employerId} onChange={(e) => setFilters(prev => ({ ...prev, employerId: e.target.value }))} /></div>
            <div><Label>Employer Name</Label><Input placeholder="Enter Employer Name" value={filters.employerName} onChange={(e) => setFilters(prev => ({ ...prev, employerName: e.target.value }))} /></div>
            <div>
              <Label>Status</Label>
              <Select value={filters.complianceStatus} onValueChange={(v) => setFilters(prev => ({ ...prev, complianceStatus: v }))}>
                <SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="COMPLIANT">Compliant</SelectItem>
                  <SelectItem value="NON_COMPLIANT">Non-Compliant</SelectItem>
                  <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Risk Level</Label>
              <Select value={filters.riskLevel} onValueChange={(v) => setFilters(prev => ({ ...prev, riskLevel: v }))}>
                <SelectTrigger><SelectValue placeholder="Select Risk" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="MINIMAL">Minimal</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => setFilters({ employerId: '', employerName: '', complianceStatus: '', riskLevel: '' })}>Clear Filters</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Compliance Records ({total} records)</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Inbox className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No compliance records found</p>
              <p className="text-sm mt-1">Employer compliance statuses will appear here once computed</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-2">Employer ID</th>
                      <th className="text-left p-2">Employer Name</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Risk Level</th>
                      <th className="text-right p-2">Violations</th>
                      <th className="text-right p-2">Arrears</th>
                      <th className="text-left p-2">Last Computed</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((record) => (
                      <tr key={record.id} className="border-b border-border hover:bg-muted/50">
                        <td className="p-2 font-medium font-mono text-sm">{record.employer_id}</td>
                        <td className="p-2">{record.employer_name || '-'}</td>
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(record.overall_compliance_status)}
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(record.overall_compliance_status)}`}>
                              {(record.overall_compliance_status || 'PENDING').replace(/_/g, ' ')}
                            </span>
                          </div>
                        </td>
                        <td className="p-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${getRiskBadge(record.risk_band)}`}>
                            {record.risk_band}
                          </span>
                        </td>
                        <td className="p-2 text-right">
                          {(record.active_violation_count || 0) > 0 ? (
                            <span className="text-destructive font-medium">{record.active_violation_count}</span>
                          ) : (
                            <span className="text-success">0</span>
                          )}
                        </td>
                        <td className="p-2 text-right font-medium">
                          {record.current_arrears_amount ? `$${Number(record.current_arrears_amount).toLocaleString()}` : '$0'}
                        </td>
                        <td className="p-2 text-sm text-muted-foreground">
                          {record.last_computed_at ? new Date(record.last_computed_at).toLocaleDateString('en-GB') : '-'}
                        </td>
                        <td className="p-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1"
                            onClick={() => navigate(`/compliance/field/employer-360/${record.employer_id}`)}
                          >
                            <Eye className="h-3 w-3" />View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {fromIdx}–{toIdx} of {total}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-muted-foreground">Rows per page</Label>
                    <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                      <SelectTrigger className="w-[88px] h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[10, 25, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm px-2">Page {page} of {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ComplianceMonitoring;
