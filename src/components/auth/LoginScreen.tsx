import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Lock, Mail, AlertTriangle, Shield, ClipboardCheck, BarChart3, ShieldCheck } from 'lucide-react';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  logSecurity, 
  logError as logSystemError, 
  startNewCorrelation 
} from '@/services/systemLoggerService';
import { getDeviceInfo } from '@/services/correlationIdService';
import { useTurnstile } from '@/hooks/useTurnstile';
import { verifyTurnstileToken, updateLoginOutcome } from '@/services/turnstileService';
import { isLovableEditorPreview } from '@/lib/runtimeEnvironment';

const features = [
  { icon: Shield, label: 'Risk-Based Planning' },
  { icon: ClipboardCheck, label: 'IIA Standards' },
  { icon: ShieldCheck, label: 'Secure & Compliant' },
  { icon: BarChart3, label: 'Real-time Analytics' },
];

// Maximum time (ms) the login button can stay in loading state
const LOGIN_SAFETY_TIMEOUT_MS = 10_000;
// Time to wait for Turnstile before proceeding without it
const TURNSTILE_WAIT_MS = 3_500;

export const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  
  const hasRedirected = useRef(false);
  const loginCalledRef = useRef(false);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const turnstileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { login, isAuthenticated, profile, isLoading: authLoading } = useSupabaseAuth();
  const navigate = useNavigate();
  const { token: turnstileToken, error: turnstileError, isAvailable: turnstileAvailable, execute: executeTurnstile, reset: resetTurnstile, containerRef } = useTurnstile();
  const isEditorPreview = isLovableEditorPreview();

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
      if (turnstileTimerRef.current) clearTimeout(turnstileTimerRef.current);
    };
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (authLoading || hasRedirected.current || !isAuthenticated) return;

    hasRedirected.current = true;

    if (profile?.force_password_change) {
      navigate('/change-password', { state: { required: true }, replace: true });
    } else if (profile?.mfa_enabled) {
      navigate('/mfa-verify', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, profile, authLoading, navigate]);

  const shouldShowRedirectingState = !authLoading && isAuthenticated;

  // Safety timeout: clears loading state after LOGIN_SAFETY_TIMEOUT_MS.
  // This is a LAST-RESORT guard. The login() function itself has an 8s
  // timeout on signInWithPassword, so this should rarely fire.
  // When it does fire, it only clears the spinner — it does NOT
  // overwrite a valid isAuthenticated state. If the user already
  // authenticated, the redirect effect above will still navigate them.
  useEffect(() => {
    if (isLoading) {
      safetyTimerRef.current = setTimeout(() => {
        // Only show error if auth hasn't succeeded in the meantime
        setIsLoading(false);
        loginCalledRef.current = false;
        // Don't set error if already authenticated — the redirect effect handles it
        if (!isAuthenticated) {
          setError('Sign-in is taking too long. Please try again.');
          resetTurnstile();
        }
      }, LOGIN_SAFETY_TIMEOUT_MS);
    } else {
      if (safetyTimerRef.current) {
        clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = null;
      }
    }
    return () => {
      if (safetyTimerRef.current) {
        clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = null;
      }
    };
  }, [isLoading, resetTurnstile, isAuthenticated]);

  // If isAuthenticated becomes true while still in loading state, clear loading
  useEffect(() => {
    if (isAuthenticated && isLoading) {
      setIsLoading(false);
    }
  }, [isAuthenticated, isLoading]);

  // Watch for Turnstile token/error and proceed if login hasn't been called yet
  useEffect(() => {
    if (!loginCalledRef.current) return;
    // Already called — this is a duplicate trigger guard handled by the ref
    // Token arrived — proceed
    if (turnstileToken) {
      if (turnstileTimerRef.current) {
        clearTimeout(turnstileTimerRef.current);
        turnstileTimerRef.current = null;
      }
      void performLogin(turnstileToken);
    }
    // Error arrived — proceed without token
    if (turnstileError) {
      if (turnstileTimerRef.current) {
        clearTimeout(turnstileTimerRef.current);
        turnstileTimerRef.current = null;
      }
      void performLogin(null);
    }
  }, [turnstileToken, turnstileError]);

  // Log login attempt to system logs
  const logLoginAttempt = (success: boolean, userEmail: string, userId?: string, reason?: string) => {
    startNewCorrelation();

    void logSecurity({
      event_type: success ? 'login' : 'failed_login',
      user_name: userEmail,
      success,
      module: 'Authentication',
      api_name: 'login',
      severity: success ? 'info' : 'warning',
      payload_json: {
        reason,
        device: getDeviceInfo(),
        timestamp: new Date().toISOString()
      },
    }, userId);

    void supabase.from('audit_logs').insert({
      action_type: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILURE',
      module_name: 'Authentication',
      entity_type: 'user',
      user_email: userEmail,
      user_id: userId,
      metadata: reason ? { reason } : null,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setAttemptsRemaining(null);
    loginCalledRef.current = false;

    // In dev preview, skip Turnstile entirely to avoid proxy issues
    if (isEditorPreview || !turnstileAvailable) {
      loginCalledRef.current = true;
      void performLogin(null);
      return;
    }

    // Execute Turnstile and set a fallback timeout
    loginCalledRef.current = true;
    executeTurnstile();

    // If Turnstile doesn't respond within TURNSTILE_WAIT_MS, proceed without it
    turnstileTimerRef.current = setTimeout(() => {
      // Only proceed if performLogin hasn't been called by the token/error effect
      if (loginCalledRef.current) {
        console.warn('[Login] Turnstile timed out, proceeding without verification');
        void performLogin(null);
      }
    }, TURNSTILE_WAIT_MS);
  };

  const performLogin = useCallback(async (verificationToken: string | null) => {
    // Prevent double-invocation
    if (!loginCalledRef.current) return;
    loginCalledRef.current = false;

    try {
      let turnstileEventPromise: Promise<string | null> | null = null;

      if (!isEditorPreview) {
        const tokenToSend = verificationToken || 'turnstile-unavailable';
        turnstileEventPromise = verifyTurnstileToken(tokenToSend, email)
          .then((verification) => {
            if (!verification.skipped && verificationToken && !verification.success) {
              console.warn('[Login] Turnstile verification failed:', verification.error);
            }
            return verification.eventId || null;
          })
          .catch((verifyErr) => {
            console.error('[Login] Turnstile verification error:', verifyErr);
            return null;
          });
      }

      const result = await login(email, password);

      if (result.success) {
        void supabase.auth.getUser().then(({ data: { user } }) => {
          if (turnstileEventPromise) {
            void turnstileEventPromise.then((eventId) => {
              if (eventId) {
                return updateLoginOutcome(eventId, true, undefined, user?.id);
              }
            });
          }

          logLoginAttempt(true, email, user?.id);
        });
        
        if (result.requiresPasswordChange) {
          navigate('/change-password', { state: { required: true }, replace: true });
        }
      } else {
        const failureReason = result.error?.includes('locked') ? 'ACCOUNT_LOCKED' 
          : result.error?.includes('Invalid') ? 'INVALID_CREDENTIALS'
          : result.error?.includes('deactivated') ? 'ACCOUNT_DEACTIVATED'
          : 'LOGIN_FAILED';

        if (turnstileEventPromise) {
          void turnstileEventPromise.then((eventId) => {
            if (eventId) {
              return updateLoginOutcome(eventId, false, failureReason);
            }
          });
        }

        logLoginAttempt(false, email, undefined, failureReason);
        resetTurnstile();
        
        if (result.error?.includes('locked')) {
          setError(result.error);
        } else if (result.error?.includes('Invalid')) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('failed_login_attempts')
            .eq('email', email)
            .single();
          
          if (profileData) {
            const remaining = 5 - (profileData.failed_login_attempts || 0);
            if (remaining <= 3 && remaining > 0) {
              setAttemptsRemaining(remaining);
            }
          }
          setError('Invalid email or password');
        } else {
          setError(result.error || 'Login failed');
        }
      }
    } catch (err: any) {
      console.error('Login error:', err);

      void logSystemError({
        error_type: 'LoginError',
        error_message: err?.message || 'Unknown login error',
        stack_trace: err?.stack,
        module: 'Authentication',
        api_name: 'login',
        severity: 'error',
      });
      
      setError('An unexpected error occurred');
      resetTurnstile();
    } finally {
      setIsLoading(false);
    }
  }, [email, password, login, navigate, resetTurnstile, isEditorPreview]);

  if (shouldShowRedirectingState) {
    return (
      <div className="min-h-screen w-full bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row m-0">
      {/* Left Branding Panel */}
      <div className="hidden lg:flex lg:w-[55%] bg-secondary text-secondary-foreground flex-col justify-between p-10 xl:p-14 relative overflow-hidden">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/20 pointer-events-none" />

        {/* Top: Logo + App Name */}
        <div className="relative z-10 flex items-center gap-3">
          <img
            src="/images/ssb-logo.png"
            alt="SSB Logo"
            className="w-10 h-10 object-contain"
          />
          <div>
            <p className="font-semibold text-white text-[15px] leading-tight">
              Social Security Board
            </p>
            <p className="text-white/60 text-xs">Enterprise Management System</p>
          </div>
        </div>

        {/* Middle: Hero Text */}
        <div className="relative z-10 space-y-5 max-w-lg">
          <h1 className="text-[32px] xl:text-[38px] font-bold text-white leading-tight tracking-tight">
            Enterprise Social Security Management for Government & Beyond
          </h1>
          <p className="text-white/70 text-[15px] leading-relaxed">
            Streamline your social security lifecycle from registration to benefits with a
            comprehensive, standards-compliant platform trusted by government institutions.
          </p>

          {/* Feature Pills */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 pt-2">
            {features.map((f) => (
              <div key={f.label} className="flex items-center gap-2.5">
                <f.icon className="h-4.5 w-4.5 text-accent shrink-0" />
                <span className="text-white/90 text-sm font-medium">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: Copyright */}
        <p className="relative z-10 text-white/40 text-xs">
          © {new Date().getFullYear()} St. Christopher & Nevis Social Security Board. All rights reserved.
        </p>
      </div>

      {/* Right Login Panel */}
      <div className="flex-1 flex items-center justify-center bg-background p-6 sm:p-10">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile-only logo */}
          <div className="lg:hidden flex justify-center">
            <img
              src="/images/ssb-logo.png"
              alt="SSB Logo"
              className="w-20 h-20 object-contain"
            />
          </div>

          {/* Heading */}
          <div className="text-center space-y-1.5">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">Welcome back</h2>
            <p className="text-muted-foreground text-sm">Sign in to access your dashboard</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-10"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  required
                  autoComplete="current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {attemptsRemaining !== null && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Warning: {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} remaining before account lockout.
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full h-11 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold"
              disabled={isLoading}
            >
              {isLoading ? 'Signing In...' : 'Sign in'}
            </Button>

            {/* Invisible Turnstile widget container */}
            <div ref={containerRef} />

            <div className="text-center">
              <Link
                to="/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                Forgot your password?
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
