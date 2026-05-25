/**
 * All Arrangements — primary list. Reuses existing PaymentArrangements page.
 * Permission gate via PermissionWrapper on the existing route.
 */
import PaymentArrangements from './PaymentArrangements';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
export default function AllArrangementsPage() {
  return (
    <PermissionWrapper moduleName="manage_compliance">
      <PaymentArrangements />
    </PermissionWrapper>
  );
}
