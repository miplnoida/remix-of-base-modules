import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  FileText, Plus, Search, BarChart3, Shield, Users, TrendingUp,
  Clock, AlertTriangle, CheckCircle2, Eye, Download, Briefcase,
  PieChart, MessageSquare, CalendarClock, History, ArrowRight,
  FileCheck, BookOpen, ClipboardList, Layers, RotateCcw, Sparkles,
  Target, Building2
} from 'lucide-react';
import { useIAAuditReports } from '@/hooks/useAuditReports';
import { useIAEngagements } from '@/hooks/useAuditDataPhase2';
import { useIADepartments, useIAFindings, useIAActionTracking } from '@/hooks/useAuditData';
import { formatDateForDisplay } from '@/lib/format-config';
import { StatusBadge } from '@/components/common';
import { AuditReportTemplateSelector, REPORT_TEMPLATES as TEMPLATES } from './AuditReportTemplateSelector';
import type { ReportTemplate } from './AuditReportTemplateSelector';

const REPORT_TYPE_CARDS = [
  { id: 'engagement', title: 'Engagement Report', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800', matchTypes: ['Engagement Report'] },
  { id: 'executive', title: 'Executive Summary', icon: Briefcase, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-200 dark:border-purple-800', matchTypes: ['Executive Summary'] },
  { id: 'committee', title: 'Committee / Board Pack', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800', matchTypes: ['Committee Pack'] },
  { id: 'findings', title: 'Findings & Actions', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', matchTypes: ['Findings & Actions Report'] },
  { id: 'portfolio', title: 'Portfolio Performance', icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950/30', border: 'border-indigo-200 dark:border-indigo-800', matchTypes: ['Portfolio Performance Report', 'Plan Summary'] },
  { id: 'followup', title: 'Follow-up Validation', icon: CheckCircle2, color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-950/30', border: 'border-teal-200 dark:border-teal-800', matchTypes: ['Follow-up Validation Report'] },
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
  const [deptFilter, setDeptFilter] = useState('all');
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

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

  const typeCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    reports.forEach((r: any) => { const t = r.report_type || ''; map[t] = (map[t] || 0) + 1; });
    return map;
  }, [reports]);

  const filteredReports = useMemo(() => {
    return reports.filter((r: any) => {
      const matchesSearch = !searchTerm || [r.title, r.report_number, r.report_type]
        .join(' ').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchesType = typeFilter === 'all' || r.report_type === typeFilter;
      const matchesDept = deptFilter === 'all' || r.department_id === deptFilter;
      return matchesSearch && matchesStatus && matchesType && matchesDept;
    });
  }, [reports, searchTerm, statusFilter, typeFilter, deptFilter]);

  const recentDrafts = useMemo(() => reports.filter((r: any) => r.status === 'Draft').slice(0, 5), [reports]);
  const recentFinals = useMemo(() => reports.filter((r: any) => r.status === 'Final').slice(0, 5), [reports]);

  const handleTemplateSelect = (template: ReportTemplate) => {
    setShowTemplateSelector(false);
    navigate(`/audit/report-builder?template=${template.id}`);
  };

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/5 via-primary/2 to-background p-6 md:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Audit Report Center</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Create, manage, and issue professional audit reports for engagements, committees, and executive leadership.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={() => setShowTemplateSelector(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" /> New Report
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/audit/report-builder?template=committee')}>
              <Users className="h-4 w-4 mr-2" /> Board Pack
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/audit/report-builder?template=findings')}>
              <ClipboardList className="h-4 w-4 mr-2" /> Findings Export
            </Button>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-primary/3 blur-2xl" />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Reports', value: stats.total, icon: FileText, color: 'text-primary' },
          { label: 'Drafts', value: stats.drafts, icon: Clock, color: 'text-amber-600' },
          { label: 'In Review', value: stats.inReview, icon: Eye, color: 'text-blue-600' },
          { label: 'Final / Issued', value: stats.finals, icon: CheckCircle2, color: 'text-emerald-600' },
          { label: 'Open Findings', value: stats.openFindings, icon: AlertTriangle, color: 'text-destructive' },
          { label: 'Overdue Actions', value: stats.overdueActions, icon: ClipboardList, color: 'text-destructive' },
        ].map((s) => (
          <Card key={s.label} className="relative overflow-hidden group hover:shadow-md transition-shadow">
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

      {/* Main Content Tabs */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Reports</TabsTrigger>
          <TabsTrigger value="by-type">By Type</TabsTrigger>
          <TabsTrigger value="dashboards">Dashboards</TabsTrigger>
        </TabsList>

        {/* All Reports Tab */}
        <TabsContent value="all" className="space-y-6">
          {/* Recent Drafts & Finals */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  Recent Drafts
                  {recentDrafts.length > 0 && <Badge variant="secondary" className="ml-auto text-xs">{recentDrafts.length}</Badge>}
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
                          <p className="text-xs text-muted-foreground">{r.report_type || 'Engagement Report'} · {r.generated_on ? formatDateForDisplay(r.generated_on) : '—'}</p>
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
                  {recentFinals.length > 0 && <Badge variant="secondary" className="ml-auto text-xs">{recentFinals.length}</Badge>}
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
                          <p className="text-xs text-muted-foreground">{r.report_number || '—'} · {r.generated_on ? formatDateForDisplay(r.generated_on) : '—'}</p>
                        </div>
                        <StatusBadge status="Final" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Filtered Report Table */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-base">All Reports</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search reports..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 h-9 w-[180px]" />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9 w-[120px]"><SelectValue placeholder="Status" /></SelectTrigger>
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
                    <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="Engagement Report">Engagement</SelectItem>
                      <SelectItem value="Executive Summary">Executive</SelectItem>
                      <SelectItem value="Committee Pack">Committee</SelectItem>
                      <SelectItem value="Findings & Actions Report">Findings & Actions</SelectItem>
                      <SelectItem value="Portfolio Performance Report">Portfolio</SelectItem>
                      <SelectItem value="Follow-up Validation Report">Follow-up</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={deptFilter} onValueChange={setDeptFilter}>
                    <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="Department" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map((d: any) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || deptFilter !== 'all') && (
                    <Button variant="ghost" size="sm" className="h-9" onClick={() => { setSearchTerm(''); setStatusFilter('all'); setTypeFilter('all'); setDeptFilter('all'); }}>
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
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowTemplateSelector(true)}>
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
                      {filteredReports.map((r: any) => {
                        const eng = engagementById[r.engagement_id];
                        return (
                          <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="p-3">
                              <div>
                                <p className="text-sm font-medium">{r.title || 'Untitled'}</p>
                                <p className="text-xs text-muted-foreground">{r.report_number || r.id?.slice(0, 8)}</p>
                              </div>
                            </td>
                            <td className="p-3"><Badge variant="outline" className="text-xs font-normal">{r.report_type || '—'}</Badge></td>
                            <td className="p-3">
                              <div>
                                <p className="text-sm">{eng?.engagement_name || '—'}</p>
                                {eng?.inherent_risk_level && (
                                  <Badge variant="outline" className="text-[10px] mt-0.5">{eng.inherent_risk_level} Risk</Badge>
                                )}
                              </div>
                            </td>
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
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Type Tab */}
        <TabsContent value="by-type" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {REPORT_TYPE_CARDS.map((type) => {
              const count = type.matchTypes.reduce((sum, t) => sum + (typeCountMap[t] || 0), 0);
              return (
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
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm">{type.title}</h3>
                          {count > 0 && <Badge variant="secondary" className="text-[10px] h-4">{count}</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Click to create a new {type.title.toLowerCase()}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Dashboards Tab */}
        <TabsContent value="dashboards">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <PieChart className="h-4 w-4 text-primary" />
                Reporting Dashboards
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {DASHBOARD_LINKS.map((d) => (
                  <button
                    key={d.path}
                    onClick={() => navigate(d.path)}
                    className="flex items-start gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50 hover:shadow-sm"
                  >
                    <div className="p-2 rounded-lg bg-primary/5">
                      <d.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{d.label}</p>
                      <p className="text-xs text-muted-foreground">{d.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Template Selector Dialog */}
      <AuditReportTemplateSelector
        open={showTemplateSelector}
        onOpenChange={setShowTemplateSelector}
        onSelect={handleTemplateSelect}
      />
    </div>
  );
}
