/**
 * BN-MORT-UI-RECOVERY-2D.1 §6 — Shared Mortality auth-state boundary.
 *
 * Renders ONE coordinated page-level auth-state message and defers to the
 * children only when the canonical auth runtime is AUTHENTICATED. Never
 * treats SESSION_TIMEOUT as a query/transport failure.
 */
import { ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2, LogIn, RefreshCw, ShieldAlert, ShieldX } from 'lucide-react';

interface Props {
  /** Rendered only in AUTHENTICATED. */
  children: ReactNode;
  /** Optional preserved page frame (breadcrumbs + title) shown around every state. */
  frame?: ReactNode;
}

export function BnMortalityAuthState({ children, frame }: Props) {
  const {
    authRuntimeStatus,
    canRunAuthenticatedQueries,
    retrySessionBootstrap,
    refreshSessionOnce,
    logout,
  } = useSupabaseAuth();

  const wrap = (node: ReactNode) => (
    <div className="p-6 space-y-4 max-w-4xl mx-auto">
      {frame}
      {node}
    </div>
  );

  switch (authRuntimeStatus) {
    case 'INITIALISING':
      return wrap(
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertTitle>Confirming your session…</AlertTitle>
          <AlertDescription>Please wait while we verify your access.</AlertDescription>
        </Alert>,
      );

    case 'REFRESHING':
      return wrap(
        <Alert>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <AlertTitle>Refreshing your session…</AlertTitle>
          <AlertDescription>This will only take a moment.</AlertDescription>
        </Alert>,
      );

    case 'SESSION_TIMEOUT':
      return wrap(
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Your session could not be confirmed.</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              We could not reach the authentication service. This is not a
              database or query failure.
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void retrySessionBootstrap()}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Retry session
              </Button>
              <Button size="sm" variant="outline" onClick={() => void logout()}>
                <LogIn className="mr-1.5 h-3.5 w-3.5" /> Sign in again
              </Button>
            </div>
          </AlertDescription>
        </Alert>,
      );

    case 'SESSION_EXPIRED':
      return wrap(
        <Alert variant="destructive">
          <ShieldX className="h-4 w-4" />
          <AlertTitle>Your session has expired.</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>Please sign in again to continue.</p>
            <Button size="sm" onClick={() => void logout()}>
              <LogIn className="mr-1.5 h-3.5 w-3.5" /> Sign in again
            </Button>
          </AlertDescription>
        </Alert>,
      );

    case 'REFRESH_FAILED':
      return wrap(
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>We could not refresh your session.</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              This is not a query or database error. Retry, or sign in again if
              the issue persists.
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void refreshSessionOnce()}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Retry
              </Button>
              <Button size="sm" variant="outline" onClick={() => void logout()}>
                <LogIn className="mr-1.5 h-3.5 w-3.5" /> Sign in again
              </Button>
            </div>
          </AlertDescription>
        </Alert>,
      );

    case 'UNAUTHENTICATED':
      // Route protection normally renders a login redirect above this point.
      // If we still land here, show a minimal sign-in prompt (no query calls).
      return wrap(
        <Alert>
          <LogIn className="h-4 w-4" />
          <AlertTitle>You are signed out.</AlertTitle>
          <AlertDescription>
            <Button size="sm" onClick={() => void logout()}>
              Go to sign in
            </Button>
          </AlertDescription>
        </Alert>,
      );

    case 'AUTHENTICATED':
      if (!canRunAuthenticatedQueries) {
        return wrap(
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertTitle>Preparing your workspace…</AlertTitle>
          </Alert>,
        );
      }
      return <>{children}</>;

    default:
      return wrap(
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertTitle>Confirming your session…</AlertTitle>
        </Alert>,
      );
  }
}
