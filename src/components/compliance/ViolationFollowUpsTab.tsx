import { ViolationActionPlanTab } from './ViolationActionPlanTab';

interface ViolationFollowUpsTabProps {
  violationId: string;
  employerId?: string;
  employerName?: string;
}

/**
 * Follow-Ups tab for the Violation Detail page.
 * Wraps ViolationActionPlanTab which now reads/writes to ce_follow_up_actions.
 */
export function ViolationFollowUpsTab({ violationId, employerId, employerName }: ViolationFollowUpsTabProps) {
  return (
    <ViolationActionPlanTab
      violationId={violationId}
      employerId={employerId}
      employerName={employerName}
    />
  );
}
