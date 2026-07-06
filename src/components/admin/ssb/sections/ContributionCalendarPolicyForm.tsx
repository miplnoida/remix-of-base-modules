/**
 * Contribution Calendar Policy Form
 *
 * Rule-based due-date model — see
 * docs/social-security/SSB_CONTRIBUTION_CALENDAR_POLICY_ACCEPTANCE.md
 */
import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { CalendarDays, RefreshCw, Save, GitBranch } from "lucide-react";
import { SsbPolicySectionShell, type SectionConfig } from "@/components/admin/ssb/SsbPolicySectionShell";
import { useSsbImplementationConfig } from "@/hooks/ssb/useSsbImplementationConfig";
import {
  getContributionSchedulePreview,
  loadWeekendDaysForPolicy,
  type ContributionCalendarPolicy,
} from "@/services/ssb/ssbContributionCalendarService";
import { createNewVersion } from "@/services/ssb/ssbPolicyLifecycleService";

const db: any = supabase;

const ruleOptions = [
  { value: "fixed_day_of_current_month",       label: "Fixed day of current month" },
  { value: "fixed_day_of_next_month",          label: "Fixed day of next month" },
  { value: "end_of_month",                     label: "End of month (last calendar day)" },
  { value: "last_working_day_of_month",        label: "Last working day of month" },
  { value: "nth_working_day_after_period_end", label: "Nth working day after period end" },
  { value: "days_after_period_end",            label: "N days after period end" },
  { value: "custom_formula_text",              label: "Custom formula (descriptive)" },
];

const adjOptions = [
  { value: "none",                 label: "No adjustment" },
  { value: "next_working_day",     label: "Move to next working day" },
  { value: "previous_working_day", label: "Move to previous working day" },
  { value: "nearest_working_day",  label: "Move to nearest working day" },
];

const basisOptions = [
  { value: "none",                label: "None" },
  { value: "day_after_due",       label: "Day after adjusted due date" },
  { value: "day_after_grace_end", label: "Day after grace period ends" },
  { value: "custom",              label: "Custom (manual)" },
];

const leapOptions = [
  { value: "natural",       label: "Natural (28/29 as per year)" },
  { value: "fixed_to_28",   label: "Fix February to 28" },
  { value: "extend_to_29",  label: "Extend to 29 in leap years" },
];

const config: SectionConfig = {
  sectionKey: "contribution",
  assetKey: "ssb.contribution_calendar",
  table: "ssb_contribution_calendar_policy",
  title: "Contribution Calendar Policy",
  description:
    "Rule-based due dates for KN. Choose a due-date rule, a working-day adjustment and a grace period. Interest and penalty start from those anchors. Weekends and holidays come from the shared calendar.",
  scopeColumns: ["profile_id"],
  fields: [
    { name: "contribution_period", label: "Contribution period", type: "select", required: true,
      options: [
        { value: "MONTHLY",   label: "Monthly" },
        { value: "WEEKLY",    label: "Weekly" },
        { value: "QUARTERLY", label: "Quarterly" },
      ] },
    { name: "fiscal_year_start_month", label: "Fiscal year start month", type: "number", helpText: "1 = January" },

    { name: "due_date_rule_type", label: "Due date rule", type: "select", required: true, options: ruleOptions },
    { name: "due_day", label: "Due day (of month)", type: "number",
      helpText: "Used for fixed_day rules. 1–31; auto-capped for short months." },
    { name: "days_after_period_end", label: "Days after period end", type: "number",
      helpText: "Used for days_after_period_end rule." },
    { name: "nth_working_day", label: "Nth working day", type: "number",
      helpText: "Used for nth_working_day_after_period_end rule (1 = first working day)." },

    { name: "working_day_adjustment", label: "Working-day adjustment", type: "select", required: true,
      options: adjOptions, helpText: "Applied when the base due date lands on a weekend or holiday." },
    { name: "grace_period_days", label: "Grace period (days)", type: "number", helpText: "Calendar days after the adjusted due date." },
    { name: "interest_start_basis", label: "Interest start basis", type: "select", options: basisOptions },
    { name: "penalty_start_basis",  label: "Penalty start basis",  type: "select", options: basisOptions },

    { name: "calendar_source_code", label: "Calendar / holiday source", type: "text",
      helpText: "Which holiday calendar to consult (e.g. KN-NATIONAL). Blank = default KN-NATIONAL." },
    { name: "leap_year_handling", label: "Leap year handling", type: "select", options: leapOptions },
    { name: "custom_formula_text", label: "Custom formula (descriptive)", type: "textarea",
      helpText: "Used only when the rule is custom_formula_text. Not executed — for policy documentation." },

    { name: "notes", label: "Grace / interest rule notes", type: "textarea" },
  ],
  newDraftDefaults: (profileId) => ({
    profile_id: profileId,
    contribution_period: "MONTHLY",
    fiscal_year_start_month: 1,
    due_date_rule_type: "fixed_day_of_current_month",
    due_day: 14,
    working_day_adjustment: "next_working_day",
    grace_period_days: 0,
    interest_start_basis: "day_after_grace_end",
    penalty_start_basis: "day_after_grace_end",
    calendar_source_code: "KN-NATIONAL",
    weekend_days: [0, 6],
    leap_year_handling: "natural",
  }),
};

// -------------------------------------------------------------------
// Preview panel
// -------------------------------------------------------------------

function DueDatePreview({ profileId }: { profileId: string }) {
  const [year, setYear] = useState<number>(new Date().getFullYear());

  const { data: activePolicy } = useQuery({
    queryKey: ["ssb-contrib-active", profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data, error } = await db
        .from("ssb_contribution_calendar_policy")
        .select("*")
        .eq("profile_id", profileId)
        .eq("status", "ACTIVE")
        .eq("is_current", true)
        .maybeSingle();
      if (error) throw error;
      return data as ContributionCalendarPolicy | null;
    },
  });

  const { data: preview, isFetching, refetch } = useQuery({
    queryKey: ["ssb-contrib-preview", profileId, year, activePolicy],
    enabled: !!activePolicy,
    queryFn: () => getContributionSchedulePreview(activePolicy!, year),
  });

  const monthNames = useMemo(
    () => ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
    [],
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" /> Due-date preview
            </CardTitle>
            <CardDescription>
              Uses the current <b>ACTIVE</b> policy row and the shared public-holiday
              calendar. Change the year and re-run to preview any 12 months.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number" className="w-24" value={year}
              onChange={(e) => setYear(Number(e.target.value) || year)}
            />
            <Button size="sm" variant="outline" onClick={() => refetch()} disabled={!activePolicy || isFetching}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isFetching ? "animate-spin" : ""}`} />
              Recalculate
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!activePolicy ? (
          <div className="text-sm text-muted-foreground border border-dashed rounded-md py-6 text-center">
            No ACTIVE contribution calendar policy yet — activate a draft to enable preview.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Period start</TableHead>
                <TableHead>Period end</TableHead>
                <TableHead>Base due</TableHead>
                <TableHead>Adjusted due</TableHead>
                <TableHead>Grace end</TableHead>
                <TableHead>Interest starts</TableHead>
                <TableHead>Penalty starts</TableHead>
                <TableHead>Adj</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(preview ?? []).map((r) => (
                <TableRow key={`${r.periodYear}-${r.periodMonth}`}>
                  <TableCell className="text-xs font-medium">
                    {monthNames[r.periodMonth - 1]} {r.periodYear}
                  </TableCell>
                  <TableCell className="text-xs">{r.periodStart}</TableCell>
                  <TableCell className="text-xs">{r.periodEnd}</TableCell>
                  <TableCell className="text-xs">{r.baseDueDate}</TableCell>
                  <TableCell className="text-xs font-semibold">{r.adjustedDueDate}</TableCell>
                  <TableCell className="text-xs">{r.graceEndDate}</TableCell>
                  <TableCell className="text-xs">{r.interestStartDate ?? "—"}</TableCell>
                  <TableCell className="text-xs">{r.penaltyStartDate ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {r.baseDueDate === r.adjustedDueDate ? "none" : r.adjustmentApplied}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// -------------------------------------------------------------------
// Section export
// -------------------------------------------------------------------

export default function ContributionCalendarPolicyForm() {
  const { data: profile } = useSsbImplementationConfig();
  return (
    <div className="space-y-4">
      <SsbPolicySectionShell config={config} />
      {profile?.id && <DueDatePreview profileId={profile.id} />}
    </div>
  );
}
