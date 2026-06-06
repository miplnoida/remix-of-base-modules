/**
 * RequirePersonaFlag — UI gate for persona-driven pages.
 *
 * If the resolved PortalPersonaContext does not have the requested flag
 * enabled, renders a friendly "not available" card and (best-effort) audits
 * the denial. Use to wrap contribution / employment / payment pages.
 */
import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useClaimantPersona } from '@/hooks/external/useClaimantPersona';
import { supabase } from '@/integrations/supabase/client';
import type { PersonaFlags } from '@/services/external/portalPersonaService';

type FlagKey = keyof PersonaFlags;

const DENY_EVENT: Record<FlagKey, string> = {
  canViewContributions: 'CONTRIB_VIEW_DENIED',
  canViewEmploymentHistory: 'EMPLOYMENT_VIEW_DENIED',
  canViewPayments: 'PAYMENTS_VIEW_DENIED',
  canApplyForSelf: 'APPLY_SELF_DENIED',
  canApplyForOthers: 'APPLY_OTHERS_DENIED',
  canManageDependants: 'DEPENDANTS_MANAGE_DENIED',
};

interface Props {
  flag: FlagKey;
  title?: string;
  reason?: string;
  children: React.ReactNode;
}

export function RequirePersonaFlag({ flag, title, reason, children }: Props) {
  const { isLoading, isAuthReady, persona, userId } = useClaimantPersona();
  const allowed = !!persona?.flags?.[flag];

  useEffect(() => {
    if (!isLoading && isAuthReady && persona && !allowed && userId) {
      (supabase as any).from('external_persona_audit').insert({
        user_id: userId,
        event_type: DENY_EVENT[flag],
        payload: { flag, reason: reason ?? 'no matching persona link' },
      }).then(() => {}, () => {});
    }
  }, [allowed, flag, isAuthReady, isLoading, persona, reason, userId]);

  if (isLoading || !isAuthReady) return <Skeleton className="h-32 w-full" />;
  if (allowed) return <>{children}</>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title ?? 'Not available for your account'}</CardTitle>
        <CardDescription>
          {reason ?? 'This section is only visible to verified insured persons. Link your SSN to unlock it.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild size="sm">
          <Link to="/claimant/link-ssn">Link my SSN</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
