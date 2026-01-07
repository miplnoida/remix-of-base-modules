import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, ArrowLeft, RefreshCw } from 'lucide-react';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const MFAVerify = () => {
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();
  const { user, profile, logout } = useSupabaseAuth();

  // Redirect if not logged in or MFA not enabled
  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    } else if (profile && !profile.mfa_enabled) {
      navigate('/', { replace: true });
    }
  }, [user, profile, navigate]);

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleInputChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits
    
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // Only take last character
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (newOtp.every(digit => digit) && index === 5) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];
    pastedData.split('').forEach((char, i) => {
      if (i < 6) newOtp[i] = char;
    });
    setOtp(newOtp);
    
    if (pastedData.length === 6) {
      handleVerify(pastedData);
    }
  };

  const handleVerify = async (code: string) => {
    setIsLoading(true);
    setError('');

    try {
      // In production, this would verify TOTP using Supabase MFA or a custom implementation
      // For now, we simulate verification with a demo code
      const demoCode = '123456';
      
      if (code === demoCode) {
        // Log successful MFA verification
        await supabase.from('audit_logs').insert({
          action_type: 'MFA_VERIFIED',
          module_name: 'Authentication',
          entity_type: 'user',
          user_id: user?.id,
          user_email: user?.email,
        });
        
        toast.success('MFA verification successful');
        navigate('/', { replace: true });
      } else {
        // Log failed MFA attempt
        await supabase.from('audit_logs').insert({
          action_type: 'MFA_FAILURE',
          module_name: 'Authentication',
          entity_type: 'user',
          user_id: user?.id,
          user_email: user?.email,
          metadata: { reason: 'Invalid OTP' },
        });
        
        setError('Invalid verification code. Please try again.');
        setOtp(Array(6).fill(''));
        inputRefs.current[0]?.focus();
      }
    } catch (err) {
      console.error('MFA verification error:', err);
      setError('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    
    try {
      // In production, this would trigger sending a new OTP via SMS/email
      toast.success('A new verification code has been sent');
      setResendCooldown(60);
      setOtp(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    } catch (err) {
      toast.error('Failed to resend code. Please try again.');
    }
  };

  const handleCancel = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-primary/20 via-primary/10 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription>
            Enter the 6-digit verification code from your authenticator app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* OTP Input */}
          <div 
            className="flex justify-center gap-2"
            onPaste={handlePaste}
          >
            {otp.map((digit, index) => (
              <Input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-14 text-center text-2xl font-bold"
                disabled={isLoading}
              />
            ))}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="text-center text-sm text-muted-foreground">
            <p>Demo code: <span className="font-mono font-bold">123456</span></p>
          </div>

          <Button 
            className="w-full" 
            onClick={() => handleVerify(otp.join(''))}
            disabled={isLoading || otp.some(d => !d)}
          >
            {isLoading ? 'Verifying...' : 'Verify'}
          </Button>

          <div className="flex items-center justify-between text-sm">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResendCode}
              disabled={resendCooldown > 0}
              className="text-muted-foreground"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="text-muted-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MFAVerify;
