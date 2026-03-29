import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText, Plus, Search, BarChart3, Shield, Users, TrendingUp,
  Clock, AlertTriangle, CheckCircle2, Eye, Download, Briefcase,
  PieChart, MessageSquare, CalendarClock, History, ArrowRight,
  FileCheck, BookOpen, ClipboardList, Layers, Filter, RotateCcw
} from 'lucide-react';
import { useIAAuditReports } from '@/hooks/useAuditReports';
import { useIAEngagements } from '@/hooks/useAuditDataPhase2';
import { useIADepartments, useIAFindings, useIAActionTracking } from '@/hooks/useAuditData';
import { formatDateForDisplay } from '@/lib/format-config';
import { StatusBadge } from '@/components/common';

const REPORT_TYPES = [
  {
    id: 'engagement',
    title: 'Engagement Report',
    description: 'Individual audit engagement findings, responses, and recommendations',
    icon: FileText,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800',
  },
  {
    id: 'executive',
    title: 'Executive Summary',
    description: 'High-level overview for senior management and leadership',
    icon: Briefcase,
    color: 'text-purple-600',
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    border: 'border-purple-200 dark:border-purple-800',
  },
  {
    id: 'committee',
    title: 'Committee / Board Pack',
    description: 'Comprehensive pack for audit committee and board review',
    icon: Users,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  {
    id: 'findings',
    title: 'Findings & Actions',
    description: 'Consolidated findings, management responses, and action tracking',
    icon: AlertTriangle,
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800',
  },
  {
    id: 'portfolio',
    title: 'Portfolio Performance',
    description: 'Audit plan execution, coverage, and performance analytics',
    icon: TrendingUp,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50 dark:bg-indigo-950/30',
    border: 'border-indigo-200 dark:border-indigo-800',
  },
  {
    id: 'followup',
    title: 'Follow-up Validation',
    description: 'Validate implementation of agreed management actions',
    icon: CheckCircle2,
    color: 'text-teal-600',
    bg: 'bg-teal-50 dark:bg-teal-950/30',
    border: 'border-teal-200 dark:border-teal-800',
  },
];

const DASHBOARD_LINKS = [
  { label: 'Communication Compliance', desc: 'Auditee lifecycle tracking', icon: MessageSquare, path: '/audit/reports/communication-compliance' },
  { label: 'Plan Slippage', desc: 'Planned vs actual timelines', icon: CalendarClock, path: '/audit/reports/plan-slippage' },
  { label: 'Overdue Actions', desc: 'Action aging analysis', icon: AlertTriangle, path: '/audit/reports/overdue-actions' },
  { label: 'Carry-Forward Aging', desc: 'Prior audit finding tracking', icon: History, path: '/audit/reports/carry-forward-aging' },
  { label: 'Engagement Summary', desc: 'Engagement completion analytics', icon: BarChart3, path: '/audit/reports/engagement-summary' },
];

export function AuditReportCenter() {
  const navigate = useNavigate();
  const { data: reports = [] } = useIAAuditReports();
  const { data: engagements = [] } = useIAEngagements();
  const { data: departments = [] } = useIADepartments();
  const { data: findings = [] } = useIAFindings();
  const { data: actions = [] } = useIAActionTracking();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const departmentNameById = useMemo(
    () => Object.fromEntries(departments.map((d: any) => [d.id, d.name])),
    [departments]
  );
  const engagementById = useMemo(
    () => Object.fromEntries(engagements.map((e: any) => [e.id, e])),
    [engagements]
  );

  const stats = useMemo(() => {
    const total = reports.length;
    const drafts = reports.filter((r: any) => r.status === 'Draft').length;
    const finals = reports.filter((r: any) => r.status === 'Final').length;
    const inReview = reports.filter((r: any) => r.status === 'In Review' || r.status === 'Submitted').length;
    const openFindings = findings.filter((f: any) => f.status !== 'Closed').length;
    const overdueActions = actions.filter((a: any) => a.status !== 'Closed' && a.status !== 'Completed' && a.target_date && new Date(a.target_date) < new Date()).length;
    return { total, drafts, finals, inReview, openFindings, overdueActions };
  }, [reports, findings, actions]);

  const filteredReports = useMemo(() => {
    return reports.filter((r: any) => {
      const matchesSearch = !searchTerm || [r.title, r.report_number, r.report_type]
        .join(' ').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchesType = typeFilter === 'all' || r.report_type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [reports, searchTerm, statusFilter, typeFilter]);

  const recentDrafts = useMemo(
    () => reports.filter((r: any) => r.status === 'Draft').slice(0, 5),
    [reports]
  );

  const recentFinals = useMemo(
    () => reports.filter((r: any) => r.status === 'Final').slice(0, 5),
    [reports]
  );

  return (
    <div className="space-y-8">
      {/* Hero Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Reports', value: stats.total, icon: FileText, color: 'text-primary' },
          { label: 'Drafts', value: stats.drafts, icon: Clock, color: 'text-amber-600' },
          { label: 'In Review', value: stats.inReview, icon: Eye, color: 'text-blue-600' },
          { label: 'Final / Issued', value: stats.finals, icon: CheckCircle2, color: 'text-emerald-600' },
          { label: 'Open Findings', value: stats.openFindings, icon: AlertTriangle, color: 'text-destructive' },
          { label: 'Overdue Actions', value: stats.overdueActions, icon: ClipboardList, color: 'text-destructive' },
        ].map((s) => (
          <Card key={s.label} className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <s.icon className={`h-4 w-4 ${s.color}`} />
                <span className="text-2xl font-bold tabular-nums">{s.value}</span>
              </div>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Report Types Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Create New Report</h2>
            <p className="text-sm text-muted-foreground">Select a report type to begin</p>
          </div>
          <Button onClick={() => navigate('/audit/report-builder')} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Report
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {REPORT_TYPES.map((type) => (
            <Card
              key={type.id}
              className={`cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${type.border}`}
              onClick={() => navigate(`/audit/report-builder?template=${type.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-lg ${type.bg}`}>
                    <type.icon className={`h-5 w-5 ${type.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm mb-1">{type.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{type.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Reporting Dashboards */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <PieChart className="h-4 w-4 text-primary" />
            Reporting Dashboards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {DASHBOARD_LINKS.map((d) => (
              <button
                key={d.path}
                onClick={() => navigate(d.path)}
                className="flex items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
              >
                <d.icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{d.label}</p>
                  <p className="text-xs text-muted-foreground">{d.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Reports - Drafts & Final */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              Recent Drafts
              {recentDrafts.length > 0 && (
                <Badge variant="secondary" className="ml-auto text-xs">{recentDrafts.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentDrafts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No draft reports</p>
            ) : (
              <div className="space-y-2">
                {recentDrafts.map((r: any) => (
                  <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/audit/report-builder?id=${r.id}`)}>
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.title || 'Untitled'}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.report_type || 'Engagement Report'} · {r.generated_on ? formatDateForDisplay(r.generated_on) : '—'}
                      </p>
                    </div>
                    <StatusBadge status="Draft" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-emerald-600" />
              Recently Issued
              {recentFinals.length > 0 && (
                <Badge variant="secondary" className="ml-auto text-xs">{recentFinals.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentFinals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No issued reports yet</p>
            ) : (
              <div className="space-y-2">
                {recentFinals.map((r: any) => (
                  <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/audit/report-builder?id=${r.id}`)}>
                    <FileCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.title || 'Untitled'}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.report_number || '—'} · {r.generated_on ? formatDateForDisplay(r.generated_on) : '—'}
                      </p>
                    </div>
                    <StatusBadge status="Final" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* All Reports Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base">All Reports</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search reports..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-9 w-[200px]"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="In Review">In Review</SelectItem>
                  <SelectItem value="Submitted">Submitted</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Final">Final</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-9 w-[160px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Engagement Report">Engagement</SelectItem>
                  <SelectItem value="Executive Summary">Executive</SelectItem>
                  <SelectItem value="Committee Pack">Committee</SelectItem>
                  <SelectItem value="Plan Summary">Plan Summary</SelectItem>
                </SelectContent>
              </Select>
              {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all') && (
                <Button variant="ghost" size="sm" className="h-9" onClick={() => { setSearchTerm(''); setStatusFilter('all'); setTypeFilter('all'); }}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredReports.length === 0 ? (
            <div className="text-center py-12">
              <Layers className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No reports found</p>
              <p className="text-xs text-muted-foreground mt-1">Create a new report to get started</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/audit/report-builder')}>
                <Plus className="h-4 w-4 mr-2" /> New Report
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left p-3 font-medium">Report</th>
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-left p-3 font-medium">Engagement</th>
                    <th className="text-left p-3 font-medium">Department</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Date</th>
                    <th className="text-right p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((r: any) => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <div>
                          <p className="text-sm font-medium">{r.title || 'Untitled'}</p>
                          <p className="text-xs text-muted-foreground">{r.report_number || r.id?.slice(0, 8)}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs font-normal">{r.report_type || '—'}</Badge>
                      </td>
                      <td className="p-3 text-sm">{engagementById[r.engagement_id]?.engagement_name || '—'}</td>
                      <td className="p-3 text-sm">{r.department_id ? departmentNameById[r.department_id] || '—' : '—'}</td>
                      <td className="p-3"><StatusBadge status={r.status || 'Draft'} /></td>
                      <td className="p-3 text-sm text-muted-foreground">{r.generated_on ? formatDateForDisplay(r.generated_on) : '—'}</td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => navigate(`/audit/report-builder?id=${r.id}`)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2">
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
