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

export const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  
  const hasRedirected = useRef(false);
  const { login, isAuthenticated, profile, isLoading: authLoading } = useSupabaseAuth();
  const navigate = useNavigate();

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

  // Log login attempt to system logs
  const logLoginAttempt = async (success: boolean, userEmail: string, userId?: string, reason?: string) => {
    try {
      startNewCorrelation();
      
      // Log to system security logs
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

      // Also log to legacy audit_logs for backwards compatibility
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

    try {
      const result = await login(email, password);
      
      if (result.success) {
        // Get the user ID after successful login
        const { data: { user } } = await supabase.auth.getUser();
        await logLoginAttempt(true, email, user?.id);
        
        if (result.requiresPasswordChange) {
          navigate('/change-password', { state: { required: true }, replace: true });
        }
        // Other redirects handled by useEffect
      } else {
        await logLoginAttempt(false, email, undefined, result.error);
        
        // Check for lockout-related messages
        if (result.error?.includes('locked')) {
          setError(result.error);
        } else if (result.error?.includes('Invalid')) {
          // Get remaining attempts if available
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
      
      // Log the error to system error logs
      await logSystemError({
        error_type: 'LoginError',
        error_message: err?.message || 'Unknown login error',
        stack_trace: err?.stack,
        module: 'Authentication',
        api_name: 'login',
        severity: 'error',
      });
      
      setError('An unexpected error occurred');
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
    <div className="min-h-screen w-full bg-gradient-to-br from-emerald-200 via-emerald-100 to-emerald-50 flex items-center justify-center p-4 sm:p-6 md:p-8 m-0">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-4">
          <div className="mx-auto w-24 h-24 bg-white rounded-full flex items-center justify-center p-2 shadow-lg">
            <img 
              src="/lovable-uploads/990576b3-f8e5-48e9-a203-ee949d3d0ae0.png" 
              alt="SecureServe Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-emerald-800">SecureServe</h1>
            <p className="text-emerald-700">Social Security Management System</p>
          </div>
        </div>

        <Card className="shadow-2xl">
          <CardHeader>
            <CardTitle className="text-center">Sign In</CardTitle>
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
                className="w-full bg-emerald-600 hover:bg-emerald-700" 
                disabled={isLoading}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>

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

        <p className="text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} SecureServe. All Rights Reserved.
        </p>
      </div>
    </div>
  );
};
