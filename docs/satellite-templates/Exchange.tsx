// Drop-in /auth/exchange page for satellite apps. COPY VERBATIM.
// Path on satellite: src/pages/auth/Exchange.tsx
//
// Why this file matters:
//   - It must call supabase.auth.setSession with the tokens returned by
//     auth-redeem-exchange-code. Otherwise the satellite's SupabaseAuthContext
//     never sees a user and ProtectedRoute keeps bouncing to /login.
//   - It MUST do a hard window.location.replace after setSession (not a
//     React Router navigate) so every provider re-bootstraps with the new
//     session from localStorage. A soft navigate keeps the previous
//     unauthenticated context in memory.
//   - The useRef guard prevents React 18 StrictMode from consuming the
//     single-use code twice in dev.

import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export default function Exchange() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const code = params.get('code');
    const fallback = params.get('redirect_path') || '/';

    if (!code) {
      navigate('/login', { replace: true });
      return;
    }

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke(
          'auth-redeem-exchange-code',
          { body: { code } },
        );

        if (error || !data?.access_token) {
          console.error('[sso-exchange] redeem failed', { error, data });
          navigate('/login?sso_error=redeem', { replace: true });
          return;
        }

        const { error: setErr } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        if (setErr) {
          console.error('[sso-exchange] setSession failed', setErr);
          navigate('/login?sso_error=setsession', { replace: true });
          return;
        }

        // Hard reload so providers re-read the new session.
        window.location.replace(data.redirect_path || fallback);
      } catch (e) {
        console.error('[sso-exchange] fatal', e);
        navigate('/login?sso_error=fatal', { replace: true });
      }
    })();
  }, [params, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center p-8 text-sm text-muted-foreground">
      Signing you in…
    </div>
  );
}
