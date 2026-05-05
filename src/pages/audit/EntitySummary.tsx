import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2 } from 'lucide-react';
import { PageShell } from '@/components/common';
import { useIARiskAssessments } from '@/hooks/useAuditDataPhase2';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getRiskColor } from '@/lib/audit/riskEngine';
import { formatDepartmentLabel } from '@/lib/audit/departmentLabel';

export default function EntitySummary() {
  const { data: assessments = [], isLoading } = useIARiskAssessments();

  const { data: allDepartments = [] } = useQuery({
    queryKey: ['v_ia_departments_all_summary'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('v_ia_departments' as any) as any).select('*').order('display_label');
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: allFunctions = [] } = useQuery({
    queryKey: ['ia_department_functions_all_incl_inactive'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ia_department_functions' as any).select('*');
      if (error) throw error;
      return data as any[];
    },
  });

  const deptMap = useMemo(() => new Map((allDepartments as any[]).map((d: any) => [d.id, d])), [allDepartments]);

  const funcMap = useMemo(() => {
    const map: Record<string, any> = {};
    allFunctions.forEach((f: any) => { map[f.id] = f; });
    return map;
  }, [allFunctions]);

  const deptSummary = useMemo(() => {
    const summary: Record<string, { name: string; total: number; avgScore: number; critical: number; high: number; medium: number; low: number }> = {};
    (assessments as any[]).forEach((a: any) => {
      const fn = funcMap[a.function_id];
      const deptId = fn?.department_id;
      if (!deptId) return;
      const dept = deptMap.get(deptId);
      if (!summary[deptId]) summary[deptId] = { name: formatDepartmentLabel(dept) || 'Unknown', total: 0, avgScore: 0, critical: 0, high: 0, medium: 0, low: 0 };
      const s = summary[deptId];
      s.total++;
      s.avgScore += Number(a.overall_risk_score) || (Number(a.likelihood_score) * Number(a.impact_score));
      if (a.risk_level === 'Critical') s.critical++;
      else if (a.risk_level === 'High') s.high++;
      else if (a.risk_level === 'Medium') s.medium++;
      else s.low++;
    });
    Object.values(summary).forEach(s => { if (s.total > 0) s.avgScore = Math.round(s.avgScore / s.total * 10) / 10; });
    return Object.values(summary).sort((a, b) => b.avgScore - a.avgScore);
  }, [assessments, funcMap, deptMap]);

  return (
    <PageShell title="Entity Risk Summary" subtitle="Department-level risk overview across all assessed entities" isLoading={isLoading}>
      {deptSummary.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No risk assessment data available.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />Department Risk Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {deptSummary.map((d) => (
                <div key={d.name} className="flex items-center justify-between p-3 rounded-md border">
                  <div>
                    <p className="font-medium text-sm">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.total} assessments | Avg Score: {d.avgScore}</p>
                  </div>
                  <div className="flex gap-2">
                    {d.critical > 0 && <Badge style={{ backgroundColor: getRiskColor('Critical'), color: '#fff' }} className="text-xs">{d.critical} Critical</Badge>}
                    {d.high > 0 && <Badge style={{ backgroundColor: getRiskColor('High'), color: '#fff' }} className="text-xs">{d.high} High</Badge>}
                    {d.medium > 0 && <Badge style={{ backgroundColor: getRiskColor('Medium'), color: '#fff' }} className="text-xs">{d.medium} Medium</Badge>}
                    {d.low > 0 && <Badge style={{ backgroundColor: getRiskColor('Low'), color: '#fff' }} className="text-xs">{d.low} Low</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
