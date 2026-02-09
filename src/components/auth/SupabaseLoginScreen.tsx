import React, { useState, useEffect } from 'react';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Lock, Mail, AlertTriangle } from 'lucide-react';
import { useTurnstile } from '@/hooks/useTurnstile';
import { verifyTurnstileToken } from '@/services/turnstileService';

export const SupabaseLoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated, isLoading: authLoading } = useSupabaseAuth();
  const navigate = useNavigate();
  const { token, error: turnstileError, execute: executeTurnstile, reset: resetTurnstile, containerRef } = useTurnstile();

  // Pending submission state — waits for turnstile token
  const [pendingSubmit, setPendingSubmit] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  // When turnstile token arrives and we have a pending submit, proceed
  useEffect(() => {
    if (pendingSubmit && token) {
      setPendingSubmit(false);
      void processLogin(token);
    }
    if (pendingSubmit && turnstileError) {
      setPendingSubmit(false);
      // Turnstile failed but still allow login — log as unverified
      void processLogin(null);
    }
  }, [token, turnstileError, pendingSubmit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    console.log('[Login] handleSubmit called, window.turnstile available:', !!window.turnstile);

    // If turnstile is not available (blocked by iframe, ad-blocker, etc.), skip verification
    if (!window.turnstile) {
      console.log('[Login] Turnstile not available, proceeding without verification');
      void processLogin(null);
      return;
    }

    setPendingSubmit(true);
    executeTurnstile();
  };

  const processLogin = async (verificationToken: string | null) => {
    try {
      console.log('[Login] processLogin called, token:', verificationToken ? 'present' : 'null');
      if (verificationToken) {
        // Step 1: Verify human via edge function
        const verification = await verifyTurnstileToken(verificationToken, email);
        console.log('[Login] Turnstile verification result:', verification);
        if (!verification.success) {
          setError(verification.error || 'Human verification failed.');
          resetTurnstile();
          setIsLoading(false);
          return;
        }
      } else {
        // Log unverified login attempt (Turnstile unavailable)
        console.log('[Login] Logging unverified attempt via edge function');
        try {
          const logResult = await verifyTurnstileToken('turnstile-unavailable', email);
          console.log('[Login] Unverified attempt logged:', logResult);
        } catch (logErr) {
          console.error('[Login] Failed to log unverified attempt:', logErr);
        }
      }

      // Step 2: Proceed with login
      const result = await login(email, password);

      if (result.success) {
        if (result.requiresPasswordChange) {
          navigate('/change-password', { state: { required: true } });
        } else {
          navigate('/', { replace: true });
        }
      } else {
        setError(result.error || 'Invalid credentials');
        resetTurnstile();
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during login.');
      resetTurnstile();
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-primary/20 via-primary/10 to-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-primary/20 via-primary/10 to-background flex items-center justify-center">
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-primary/20 via-primary/10 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-4">
          <div className="mx-auto w-24 h-24 bg-card rounded-full flex items-center justify-center p-2 shadow-lg">
            <Lock className="w-12 h-12 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">SecureServe</h1>
            <p className="text-muted-foreground">Enterprise User Management</p>
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
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
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

              <Button type="submit" className="w-full" disabled={isLoading}>
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
      </div>
    </div>
  );
};
