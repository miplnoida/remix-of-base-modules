import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/common';
import { useIADepartments, useIADepartmentFunctions } from '@/hooks/useAuditData';
import { useIARiskAssessments } from '@/hooks/useAuditDataPhase2';
import { AlertTriangle, CheckCircle, ShieldAlert, Shield } from 'lucide-react';

interface CoverageRiskTabProps {
  planId: string;
  engagements: any[];
}

export function CoverageRiskTab({ planId, engagements }: CoverageRiskTabProps) {
  const { data: departments = [] } = useIADepartments();
  const { data: functions = [] } = useIADepartmentFunctions('all');
  const { data: assessments = [] } = useIARiskAssessments();

  // Risk distribution of planned engagements
  const riskDist = useMemo(() => {
    const dist = { Critical: 0, High: 0, Medium: 0, Low: 0, Unrated: 0 };
    (engagements || []).forEach((e: any) => {
      const rating = e.engagement_risk_rating || 'Unrated';
      if (rating in dist) dist[rating as keyof typeof dist]++;
      else dist.Unrated++;
    });
    return dist;
  }, [engagements]);

  // Department coverage
  const deptCoverage = useMemo(() => {
    const coveredDeptIds = new Set((engagements || []).map((e: any) => e.department_id).filter(Boolean));
    return (departments || []).map((dept: any) => ({
      id: dept.id,
      name: dept.name,
      covered: coveredDeptIds.has(dept.id),
      engCount: (engagements || []).filter((e: any) => e.department_id === dept.id).length,
      riskRating: dept.risk_rating || 'Unrated',
    }));
  }, [departments, engagements]);

  // Function coverage gaps: high/critical risk functions without planned engagement
  const functionGaps = useMemo(() => {
    const coveredFuncIds = new Set((engagements || []).map((e: any) => e.function_id).filter(Boolean));
    const riskMap = new Map<string, any>();
    (assessments || []).forEach((a: any) => {
      if (a.function_id && !riskMap.has(a.function_id)) riskMap.set(a.function_id, a);
    });

    return (functions || [])
      .filter((fn: any) => {
        const assessment = riskMap.get(fn.id);
        const risk = assessment?.risk_level || fn.risk_rating || 'Low';
        return ['High', 'Critical'].includes(risk) && !coveredFuncIds.has(fn.id);
      })
      .map((fn: any) => {
        const assessment = riskMap.get(fn.id);
        const dept = (departments || []).find((d: any) => d.id === fn.department_id);
        return {
          id: fn.id,
          functionName: fn.function_name,
          departmentName: dept?.name || '—',
          riskLevel: assessment?.risk_level || fn.risk_rating || 'High',
          riskScore: assessment?.risk_score,
        };
      });
  }, [functions, engagements, assessments, departments]);

  const totalDepts = departments.length;
  const coveredDepts = deptCoverage.filter(d => d.covered).length;
  const coveragePct = totalDepts > 0 ? Math.round((coveredDepts / totalDepts) * 100) : 0;

  const totalHighCritical = riskDist.Critical + riskDist.High;
  const totalEngagements = engagements?.length || 0;
  const highCriticalPct = totalEngagements > 0 ? Math.round((totalHighCritical / totalEngagements) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-semibold text-foreground">{coveragePct}%</p>
            <p className="text-xs text-muted-foreground">Department Coverage</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-semibold text-foreground">{highCriticalPct}%</p>
            <p className="text-xs text-muted-foreground">High/Critical Focus</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-semibold text-destructive">{functionGaps.length}</p>
            <p className="text-xs text-muted-foreground">Uncovered High-Risk Functions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-semibold text-foreground">{totalEngagements}</p>
            <p className="text-xs text-muted-foreground">Total Planned Engagements</p>
          </CardContent>
        </Card>
      </div>

      {/* Risk Distribution */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Risk Distribution of Planned Engagements</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            {Object.entries(riskDist).map(([level, count]) => (
              <div key={level} className="flex items-center gap-2">
                <StatusBadge status={level} />
                <span className="text-sm font-medium">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Department Coverage */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Department Coverage</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {deptCoverage.map((dept) => (
              <div key={dept.id} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-2">
                  {dept.covered ? <CheckCircle className="h-4 w-4 text-green-600" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
                  <span className="text-sm">{dept.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={dept.riskRating} />
                  <span className="text-xs text-muted-foreground">{dept.engCount} engagement(s)</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gaps */}
      {functionGaps.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-destructive" />
              High/Critical Risk Functions Without Coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {functionGaps.map((gap) => (
                <div key={gap.id} className="flex items-center justify-between p-2 border border-destructive/20 rounded bg-destructive/5">
                  <div>
                    <p className="text-sm font-medium">{gap.functionName}</p>
                    <p className="text-xs text-muted-foreground">{gap.departmentName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={gap.riskLevel} />
                    {gap.riskScore != null && <span className="text-xs text-muted-foreground">Score: {gap.riskScore}</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
