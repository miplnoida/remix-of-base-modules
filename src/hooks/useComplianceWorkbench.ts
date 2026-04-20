import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import type { ComplianceOperationalRole } from '@/lib/compliance/capabilities';

export interface WorkbenchMetric {
  key: string;
  label: string;
  count: number;
  href: string;
  tone?: 'default' | 'warning' | 'danger' | 'success';
}

export interface WorkbenchData {
  metrics: WorkbenchMetric[];
  recentVisits: any[];
  pendingApprovals: any[];
  loading: boolean;
}

/**
 * Aggregates role-appropriate counts for the Compliance Workbench.
 * Uses shielded queries — any individual failure resolves to 0 so the
 * dashboard never blocks on a single missing table.
 */
export function useComplianceWorkbench(role: ComplianceOperationalRole) {
  const { user } = useSupabaseAuth() as any;
  const userId = user?.id ?? null;

  return useQuery({
    queryKey: ['compliance-workbench', role, userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async (): Promise<{
      metrics: WorkbenchMetric[];
      recentVisits: any[];
      pendingApprovals: any[];
    }> => {
      // Cast to any — many compliance tables aren't in generated types yet.
      // Each query is shielded; failures resolve to 0 so the dashboard never breaks.
      const sb: any = supabase;
      const safeCount = async (
        builder: () => Promise<{ count: number | null; error: any }>,
      ): Promise<number> => {
        try {
          const { count, error } = await builder();
          if (error) return 0;
          return count ?? 0;
        } catch {
          return 0;
        }
      };

      // === Inspector / common metrics ===
      const myOpenViolations = await safeCount(async () =>
        supabase
          .from('compliance_violations')
          .select('id', { count: 'exact', head: true })
          .eq('assigned_inspector_id', userId)
          .in('status', ['open', 'pending', 'in_progress']),
      );

      const myActivePlans = await safeCount(async () =>
        supabase
          .from('weekly_audit_plans')
          .select('id', { count: 'exact', head: true })
          .eq('inspector_id', userId)
          .in('status', ['draft', 'approved', 'in_progress']),
      );

      const myVisitsToday = await safeCount(async () => {
        const today = new Date().toISOString().slice(0, 10);
        return supabase
          .from('audit_plan_items')
          .select('id', { count: 'exact', head: true })
          .eq('inspector_id', userId)
          .eq('visit_date', today);
      });

      const myPendingReports = await safeCount(async () =>
        supabase
          .from('weekly_inspector_reports')
          .select('id', { count: 'exact', head: true })
          .eq('inspector_id', userId)
          .eq('status', 'draft'),
      );

      // === Senior / Head — supervisory metrics ===
      const plansAwaitingApproval =
        role === 'senior' || role === 'head'
          ? await safeCount(async () =>
              supabase
                .from('weekly_audit_plans')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'pending_approval'),
            )
          : 0;

      const reportsAwaitingReview =
        role === 'senior' || role === 'head'
          ? await safeCount(async () =>
              supabase
                .from('weekly_inspector_reports')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'submitted'),
            )
          : 0;

      // === Head — module-wide KPIs ===
      const openCases =
        role === 'head'
          ? await safeCount(async () =>
              supabase
                .from('compliance_cases')
                .select('id', { count: 'exact', head: true })
                .in('status', ['open', 'in_progress', 'investigation']),
            )
          : 0;

      const breachAlerts =
        role === 'head'
          ? await safeCount(async () =>
              supabase
                .from('compliance_breach_events')
                .select('id', { count: 'exact', head: true })
                .eq('resolved', false),
            )
          : 0;

      const legalEscalations =
        role === 'head'
          ? await safeCount(async () =>
              supabase
                .from('legal_referrals')
                .select('id', { count: 'exact', head: true })
                .in('status', ['pending', 'submitted', 'in_review']),
            )
          : 0;

      // === Build metrics array per role ===
      const metrics: WorkbenchMetric[] = [];

      if (role === 'inspector' || role === 'senior' || role === 'head') {
        metrics.push(
          {
            key: 'visits-today',
            label: 'My Visits Today',
            count: myVisitsToday,
            href: '/compliance/field/my-plans',
            tone: myVisitsToday > 0 ? 'warning' : 'default',
          },
          {
            key: 'active-plans',
            label: 'My Active Plans',
            count: myActivePlans,
            href: '/compliance/field/my-plans',
          },
          {
            key: 'pending-reports',
            label: 'My Pending Reports',
            count: myPendingReports,
            href: '/compliance/field/all-reports',
            tone: myPendingReports > 2 ? 'warning' : 'default',
          },
          {
            key: 'open-violations',
            label: 'My Open Violations',
            count: myOpenViolations,
            href: '/compliance/violations',
          },
        );
      }

      if (role === 'senior' || role === 'head') {
        metrics.push(
          {
            key: 'plans-approval',
            label: 'Plans Awaiting Approval',
            count: plansAwaitingApproval,
            href: '/compliance/field/plan-review',
            tone: plansAwaitingApproval > 0 ? 'warning' : 'default',
          },
          {
            key: 'reports-review',
            label: 'Reports Awaiting Review',
            count: reportsAwaitingReview,
            href: '/compliance/field/report-review',
            tone: reportsAwaitingReview > 0 ? 'warning' : 'default',
          },
        );
      }

      if (role === 'head') {
        metrics.push(
          {
            key: 'open-cases',
            label: 'Open Cases',
            count: openCases,
            href: '/compliance/cases',
          },
          {
            key: 'breach-alerts',
            label: 'Active Breach Alerts',
            count: breachAlerts,
            href: '/compliance/arrangements/breach-monitoring',
            tone: breachAlerts > 0 ? 'danger' : 'success',
          },
          {
            key: 'legal-escalations',
            label: 'Legal Escalations',
            count: legalEscalations,
            href: '/compliance/legal/queue',
          },
        );
      }

      return { metrics, recentVisits: [], pendingApprovals: [] };
    },
  });
}
