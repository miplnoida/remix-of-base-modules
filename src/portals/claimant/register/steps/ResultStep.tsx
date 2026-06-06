import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertTriangle, ShieldX, Hourglass } from 'lucide-react';
import { createLimitedAccount, type LinkAttemptResult } from '@/services/external/identityLinkingService';

interface Props {
  result: LinkAttemptResult;
  userId: string | null;
}

export function ResultStep({ result, userId }: Props) {
  const navigate = useNavigate();

  const icon = result.decision === 'AUTO_LINK'
    ? <CheckCircle2 className="h-12 w-12 text-emerald-600" />
    : result.decision === 'MANUAL_REVIEW'
      ? <Hourglass className="h-12 w-12 text-amber-600" />
      : result.decision === 'LOCKED'
        ? <ShieldX className="h-12 w-12 text-destructive" />
        : <AlertTriangle className="h-12 w-12 text-amber-600" />;

  const title = result.decision === 'AUTO_LINK'
    ? 'You are all set!'
    : result.decision === 'MANUAL_REVIEW'
      ? 'We need a closer look'
      : result.decision === 'LOCKED'
        ? 'Too many attempts'
        : 'We could not verify your record';

  async function continueLimited() {
    if (userId) await createLimitedAccount(userId);
    navigate('/claimant/dashboard');
  }

  return (
    <div className="space-y-5 text-center">
      <div className="flex justify-center animate-in fade-in zoom-in duration-300">{icon}</div>
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{result.message}</p>
      </div>
      <div className="flex flex-col gap-2">
        {result.decision === 'AUTO_LINK' && (
          <Button asChild className="w-full">
            <Link to="/claimant/dashboard">Go to my dashboard</Link>
          </Button>
        )}
        {result.decision === 'MANUAL_REVIEW' && (
          <>
            <Button asChild className="w-full">
              <Link to="/claimant/dashboard">Submit for review</Link>
            </Button>
            <Button variant="outline" className="w-full" onClick={continueLimited}>
              Continue with limited access
            </Button>
          </>
        )}
        {(result.decision === 'REJECT' || result.decision === 'LOCKED') && (
          <Button variant="outline" className="w-full" onClick={continueLimited}>
            Continue with limited access
          </Button>
        )}
      </div>
    </div>
  );
}
