import { Link } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';
import { useSelfLinkStatus } from '@/hooks/external/useSelfLinkStatus';

/** Persistent banner shown when the user has no VERIFIED SELF link. */
export function SelfLinkBanner() {
  const { isLoading, isVerified } = useSelfLinkStatus();
  if (isLoading || isVerified) return null;
  return (
    <Alert className="mb-4 border-amber-300 bg-amber-50 text-amber-900">
      <ShieldAlert className="h-4 w-4 text-amber-600" />
      <AlertTitle>Link your Social Security record</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center gap-3">
        <span className="text-sm">
          Link your Social Security record to unlock contribution history and self-service benefits.
        </span>
        <Button asChild size="sm" variant="default" className="ml-auto">
          <Link to="/claimant/register?step=link">Link my SSN</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
