import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Lock, Mail, AlertTriangle } from 'lucide-react';
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

export const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  
  const hasRedirected = useRef(false);
  const { login, isAuthenticated, profile, isLoading: authLoading } = useSupabaseAuth();
  const navigate = useNavigate();
  const { token: turnstileToken, error: turnstileError, isAvailable: turnstileAvailable, execute: executeTurnstile, reset: resetTurnstile, containerRef } = useTurnstile();

  // Redirect if already authenticated
  useEffect(() => {
    // Skip if still loading auth state or already redirected
    if (authLoading || hasRedirected.current) return;
    
    if (isAuthenticated && profile) {
      hasRedirected.current = true;
      if (profile.force_password_change) {
        navigate('/change-password', { state: { required: true }, replace: true });
      } else if (profile.mfa_enabled) {
        navigate('/mfa-verify', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [isAuthenticated, profile, authLoading, navigate]);

  // When turnstile token arrives and we have a pending submit, proceed
  useEffect(() => {
    if (pendingSubmit && turnstileToken) {
      setPendingSubmit(false);
      void performLogin(turnstileToken);
    }
    if (pendingSubmit && turnstileError) {
      setPendingSubmit(false);
      void performLogin(null); // Proceed without verification
    }
  }, [turnstileToken, turnstileError, pendingSubmit]);

  // Log login attempt to system logs
  const logLoginAttempt = async (success: boolean, userEmail: string, userId?: string, reason?: string) => {
    try {
      startNewCorrelation();
      
      await logSecurity({
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

      await supabase.from('audit_logs').insert({
        action_type: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILURE',
        module_name: 'Authentication',
        entity_type: 'user',
        user_email: userEmail,
        user_id: userId,
        metadata: reason ? { reason } : null,
      });
    } catch (err) {
      console.error('Failed to log login event:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setAttemptsRemaining(null);

    // If turnstile is not fully available, skip verification entirely
    if (!turnstileAvailable) {
      void performLogin(null);
      return;
    }

    setPendingSubmit(true);
    executeTurnstile();
  };

  const performLogin = async (verificationToken: string | null) => {
    let securityEventId: string | null = null;

    try {
      // Step 1: Log the attempt via edge function (verify or skip)
      const tokenToSend = verificationToken || 'turnstile-unavailable';
      try {
        const verification = await verifyTurnstileToken(tokenToSend, email);
        securityEventId = verification.eventId || null;

        // If Cloudflare is disabled via config, proceed (already logged server-side)
        if (verification.skipped) {
          // Allowed to proceed — verification was skipped by config or environment
        } else if (verificationToken && !verification.success) {
          // Real token used and verification failed — block login
          setError(verification.error || 'Human verification failed.');
          if (securityEventId) {
            await updateLoginOutcome(securityEventId, false, 'CAPTCHA_FAILED');
          }
          resetTurnstile();
          setIsLoading(false);
          return;
        }
      } catch (verifyErr) {
        console.error('[Login] Turnstile verification error:', verifyErr);
        // Non-blocking — continue with login
      }

      // Step 2: Proceed with credential check
      const result = await login(email, password);
      
      if (result.success) {
        const { data: { user } } = await supabase.auth.getUser();
        
        // Update security event with success
        if (securityEventId) {
          await updateLoginOutcome(securityEventId, true, undefined, user?.id);
        }
        
        await logLoginAttempt(true, email, user?.id);
        
        if (result.requiresPasswordChange) {
          navigate('/change-password', { state: { required: true }, replace: true });
        }
      } else {
        // Update security event with failure reason
        const failureReason = result.error?.includes('locked') ? 'ACCOUNT_LOCKED' 
          : result.error?.includes('Invalid') ? 'INVALID_CREDENTIALS'
          : result.error?.includes('deactivated') ? 'ACCOUNT_DEACTIVATED'
          : 'LOGIN_FAILED';

        if (securityEventId) {
          await updateLoginOutcome(securityEventId, false, failureReason);
        }

        await logLoginAttempt(false, email, undefined, failureReason);
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
      
      // Update security event with error
      if (securityEventId) {
        await updateLoginOutcome(securityEventId, false, 'SYSTEM_ERROR');
      }

      await logSystemError({
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
  };

  // Show loading while auth state is being determined
  if (authLoading) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-primary/20 via-primary/10 to-background flex items-center justify-center p-4">
        <div className="text-center">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && !hasRedirected.current) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-primary/20 via-primary/10 to-background flex items-center justify-center p-4">
        <div className="text-center">
          <p>Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[hsl(153_73%_21%)] via-[hsl(153_73%_28%)] to-[hsl(144_65%_34%)] flex items-center justify-center p-4 sm:p-6 md:p-8 m-0 relative overflow-hidden">
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
      
      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="text-center space-y-4">
          <div className="mx-auto w-28 h-28 rounded-full flex items-center justify-center p-2 bg-card/95 ring-1 ring-border/60 shadow-lg overflow-hidden">
            <img 
              src="/images/ssb-logo.png" 
              alt="St. Christopher & Nevis Social Security Board" 
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">St. Christopher & Nevis</h1>
            <p className="text-white/80 text-sm font-medium">Social Security Board</p>
          </div>
        </div>

        <Card className="shadow-2xl border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-center text-foreground">Sign In</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="pl-10"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
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
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
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
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
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

          </CardContent>
        </Card>

        <p className="text-center text-sm text-white/60">
          © {new Date().getFullYear()} St. Christopher & Nevis Social Security Board
        </p>
      </div>
    </div>
  );
};
