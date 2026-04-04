import { Badge } from '@/components/ui/badge';

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' }> = {
  RECEIVED: { label: 'Received', variant: 'outline' },
  VERIFIED: { label: 'Verified', variant: 'default' },
  REJECTED: { label: 'Rejected', variant: 'destructive' },
  WAIVED: { label: 'Waived', variant: 'warning' },
  PENDING_INFO: { label: 'Pending Info', variant: 'secondary' },
  EXPIRED: { label: 'Expired', variant: 'destructive' },
  OUTSTANDING: { label: 'Outstanding', variant: 'outline' },
  FULFILLED: { label: 'Fulfilled', variant: 'default' },
};

interface Props {
  status: string;
  className?: string;
}

export function EvidenceStatusBadge({ status, className }: Props) {
  const config = STATUS_CONFIG[status] || { label: status, variant: 'outline' as const };
  return <Badge variant={config.variant} className={className}>{config.label}</Badge>;
}
