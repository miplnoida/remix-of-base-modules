import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageShell, DataTable, StatusBadge } from '@/components/common';
import type { DataTableColumn } from '@/components/common';
import { BarChart3, Building2, Briefcase, ClipboardList, FileSearch, ShieldAlert, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useIADepartments, useIADepartmentFunctions, useIAAnnualPlans, useIAFindings, useIAActionTracking } from '@/hooks/useAuditData';
import { useIAEngagements, useIARiskAssessments } from '@/hooks/useAuditDataPhase2';

function deriveRiskLevel(score: number) {
  if (score >= 16) return 'Critical';
  if (score >= 11) return 'High';
  if (score >= 6) return 'Medium';
  return 'Low';
}

export default function AuditDashboard() {
  const navigate = useNavigate();
  const { data: departments = [], isLoading: departmentsLoading } = useIADepartments();
  const { data: functions = [] } = useIADepartmentFunctions('all');
  const { data: plans = [] } = useIAAnnualPlans();
  const { data: audits = [] } = useIAEngagements();
  const { data: findings = [] } = useIAFindings();
  const { data: actions = [] } = useIAActionTracking();
  const { data: assessments = [] } = useIARiskAssessments();

  const functionMap = useMemo(() => Object.fromEntries((functions || []).map((fn: any) => [fn.id, fn])), [functions]);
  const departmentMap = useMemo(() => new Map((departments || []).map((dept: any) => [dept.id, dept])), [departments]);

  const overdueActions = actions.filter((action: any) => {
    const dueDate = action.due_date || action.target_date;
    const completed = ['Completed', 'Closed', 'Resolved'].includes(action.status || action.completion_status);
    return dueDate && !completed && new Date(dueDate) < new Date();
  });

  const completedAudits = audits.filter((audit: any) => ['Closed', 'Completed'].includes(audit.status || ''));
  const openFindings = findings.filter((finding: any) => !['Closed', 'Resolved', 'Accepted'].includes(finding.status || ''));

  const topRiskFunctions = useMemo(() => {
    return [...assessments]
      .map((assessment: any) => {
        const score = Number(assessment.overall_risk_score) || (Number(assessment.impact_score) || 0) * (Number(assessment.likelihood_score) || 0);
        return {
          ...assessment,
          score,
          risk_level: assessment.risk_level || deriveRiskLevel(score),
        };
      })
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 5);
  }, [assessments]);

  const riskByDepartment = useMemo(() => {
    const summary = new Map<string, { name: string; total: number; score: number; critical: number; high: number }>();

    assessments.forEach((assessment: any) => {
      const fn = functionMap[assessment.function_id];
      if (!fn?.department_id) return;
      const dept = departmentMap.get(fn.department_id);
      const score = Number(assessment.overall_risk_score) || (Number(assessment.impact_score) || 0) * (Number(assessment.likelihood_score) || 0);
      const level = assessment.risk_level || deriveRiskLevel(score);
      const current = summary.get(fn.department_id) || {
        name: dept?.name || 'Unknown Department',
        total: 0,
        score: 0,
        critical: 0,
        high: 0,
      };

      current.total += 1;
      current.score += score;
      if (level === 'Critical') current.critical += 1;
      if (level === 'High') current.high += 1;
      summary.set(fn.department_id, current);
    });

    return [...summary.values()]
      .map((item) => ({ ...item, averageScore: item.total ? Math.round((item.score / item.total) * 10) / 10 : 0 }))
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 5);
  }, [assessments, functionMap, departmentMap]);

  const recentFindings = [...findings].slice(0, 5);
  const findingColumns: DataTableColumn<any>[] = [
    {
      key: 'title',
      header: 'Finding',
      render: (row) => <span className="font-medium">{row.title || row.condition || 'Untitled finding'}</span>,
    },
    {
      key: 'audit',
      header: 'Audit',
      render: (row) => {
        const audit = audits.find((item: any) => item.id === row.engagement_id);
        return <span>{audit?.engagement_name || '—'}</span>;
      },
    },
    {
      key: 'risk_rating',
      header: 'Risk',
      render: (row) => <StatusBadge status={row.risk_rating || 'Medium'} />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status || 'Open'} />,
    },
  ];

  const kpis = [
    { label: 'Total Departments', value: departments.length, icon: Building2 },
    { label: 'Total Functions', value: functions.length, icon: ClipboardList },
    { label: 'Audits Planned', value: audits.length || plans.length, icon: Briefcase },
    { label: 'Audits Completed', value: completedAudits.length, icon: CheckCircle2 },
    { label: 'Open Findings', value: openFindings.length, icon: FileSearch },
    { label: 'Overdue Actions', value: overdueActions.length, icon: AlertTriangle },
  ];

  return (
    <PageShell
      title="Internal Audit Dashboard"
      subtitle="Simple department and function audit overview"
      breadcrumbs={[{ label: 'Internal Audit' }, { label: 'Dashboard' }]}
      isLoading={departmentsLoading}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {kpis.map((item) => (
          <Card key={item.label}>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-lg bg-primary/10 p-3 text-primary">
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="text-2xl font-semibold text-foreground">{item.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-4 w-4 text-primary" />
              Top Risk Functions
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate('/audit/risk-matrix')}>View Risk Matrix</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {topRiskFunctions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No function risk assessments available yet.</p>
            ) : (
              topRiskFunctions.map((item: any) => {
                const fn = functionMap[item.function_id];
                const dept = fn ? departmentMap.get(fn.department_id) : null;
                return (
                  <div key={item.id} className="flex flex-col gap-2 rounded-lg border bg-card p-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-medium">{fn?.function_name || 'Unknown Function'}</p>
                      <p className="text-xs text-muted-foreground">{dept?.name || 'Unassigned Department'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={item.risk_level} />
                      <span className="text-xs text-muted-foreground">Score {item.score}</span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary" />
              Risk by Department
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {riskByDepartment.length === 0 ? (
              <p className="text-sm text-muted-foreground">No department risk rollup available yet.</p>
            ) : (
              riskByDepartment.map((item) => (
                <div key={item.name} className="rounded-lg border bg-card p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.total} assessed functions</p>
                    </div>
                    <BadgeLike text={`Avg ${item.averageScore}`} />
                  </div>
                  <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
                    <span>Critical: {item.critical}</span>
                    <span>High: {item.high}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Button variant="outline" className="h-auto justify-start py-3" onClick={() => navigate('/audit/departments')}>Departments</Button>
        <Button variant="outline" className="h-auto justify-start py-3" onClick={() => navigate('/audit/functions')}>Functions</Button>
        <Button variant="outline" className="h-auto justify-start py-3" onClick={() => navigate('/audit/audit-plans')}>Audit Plans</Button>
        <Button variant="outline" className="h-auto justify-start py-3" onClick={() => navigate('/audit/audits')}>Audits</Button>
        <Button variant="outline" className="h-auto justify-start py-3" onClick={() => navigate('/audit/actions')}>Action Tracker</Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Findings</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/audit/findings')}>View all</Button>
        </CardHeader>
        <CardContent>
          <DataTable columns={findingColumns} data={recentFindings} emptyMessage="No findings available." />
        </CardContent>
      </Card>
    </PageShell>
  );
}

function BadgeLike({ text }: { text: string }) {
  return <span className="rounded-full border bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">{text}</span>;
}
