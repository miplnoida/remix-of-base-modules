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

/**
 * Aggregates role-appropriate counts for the Compliance Workbench.
 * Each query is shielded — failures resolve to 0 so a missing table
 * never breaks the dashboard.
 */
export function useComplianceWorkbench(role: ComplianceOperationalRole) {
  const { user } = useSupabaseAuth() as any;
  const userId = user?.id ?? null;

  return useQuery({
    queryKey: ['compliance-workbench', role, userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async (): Promise<{ metrics: WorkbenchMetric[] }> => {
      // Cast — many compliance tables aren't in generated supabase types.
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

      const today = new Date().toISOString().slice(0, 10);

      // === Inspector / common ===
      const myOpenViolations = await safeCount(() =>
        sb
          .from('ce_violations')
          .select('id', { count: 'exact', head: true })
          .eq('assigned_to_user_id', userId)
          .in('status', ['open', 'pending', 'in_progress', 'investigating']),
      );

      const myActivePlans = await safeCount(() =>
        sb
          .from('ce_weekly_plans')
          .select('id', { count: 'exact', head: true })
          .eq('inspector_id', userId)
          .in('status', ['draft', 'approved', 'in_progress']),
      );

      const myVisitsToday = await safeCount(() =>
        sb
          .from('ce_weekly_plan_items')
          .select('id', { count: 'exact', head: true })
          .eq('scheduled_date', today)
          .neq('execution_status', 'completed'),
      );

      const myDraftPlans = await safeCount(() =>
        sb
          .from('ce_weekly_plans')
          .select('id', { count: 'exact', head: true })
          .eq('inspector_id', userId)
          .eq('status', 'draft'),
      );

      // === Senior / Head ===
      const plansAwaitingApproval =
        role === 'senior' || role === 'head'
          ? await safeCount(() =>
              sb
                .from('ce_weekly_plans')
                .select('id', { count: 'exact', head: true })
                .in('status', ['submitted', 'pending_approval', 'pending_review']),
            )
          : 0;

      const reportsAwaitingReview =
        role === 'senior' || role === 'head'
          ? await safeCount(() =>
              sb
                .from('ce_weekly_plans')
                .select('id', { count: 'exact', head: true })
                .in('status', ['report_submitted', 'report_pending_review']),
            )
          : 0;

      // === Head — module-wide ===
      const openCases =
        role === 'head'
          ? await safeCount(() =>
              sb
                .from('ce_cases')
                .select('id', { count: 'exact', head: true })
                .in('status', ['open', 'in_progress', 'investigation', 'active']),
            )
          : 0;

      const breachAlerts =
        role === 'head'
          ? await safeCount(() =>
              sb
                .from('ce_breach_monitoring')
                .select('id', { count: 'exact', head: true })
                .in('status', ['open', 'active', 'unresolved']),
            )
          : 0;

      const legalEscalations =
        role === 'head'
          ? await safeCount(() =>
              sb
                .from('ce_legal_referrals')
                .select('id', { count: 'exact', head: true })
                .in('status', ['pending', 'submitted', 'in_review', 'open']),
            )
          : 0;

      const metrics: WorkbenchMetric[] = [];

      if (role === 'inspector' || role === 'senior' || role === 'head') {
        metrics.push(
          {
            key: 'visits-today',
            label: 'Visits Today',
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
            key: 'draft-plans',
            label: 'Draft Plans',
            count: myDraftPlans,
            href: '/compliance/field/plan-builder',
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

      return { metrics };
    },
  });
}
