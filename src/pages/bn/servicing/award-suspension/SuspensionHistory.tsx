import type { SuspensionRequestListItem } from '@/services/bn/awardSuspensionViewService';
import { SuspensionRequestsRegister } from './SuspensionRequestsRegister';
import { useMemo } from 'react';

interface Props {
  rows: SuspensionRequestListItem[];
  loading: boolean;
  onView: (requestId: string) => void;
}

const HISTORY_STATUSES = ['APPROVED', 'APPLIED', 'REJECTED', 'WITHDRAWN', 'CANCELLED'];

export function SuspensionHistory({ rows, loading, onView }: Props) {
  const historyRows = useMemo(
    () => rows.filter((r) => HISTORY_STATUSES.includes(r.status)),
    [rows]
  );
  return (
    <SuspensionRequestsRegister
      rows={historyRows}
      loading={loading}
      onView={onView}
      title="Completed, applied, rejected or withdrawn requests"
      emptyLabel="No historical requests to display yet."
    />
  );
}
