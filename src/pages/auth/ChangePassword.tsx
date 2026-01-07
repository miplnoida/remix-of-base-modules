import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Lock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const passwordRequirements: PasswordRequirement[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'One number', test: (p) => /[0-9]/.test(p) },
  { label: 'One special character', test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

export const ChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refreshProfile } = useSupabaseAuth();

  const isRequired = location.state?.required === true;

  const allRequirementsMet = passwordRequirements.every(req => req.test(newPassword));
  const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!allRequirementsMet) {
      setError('Password does not meet all requirements');
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // First verify current password by attempting to sign in
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser?.email) {
        throw new Error('User not authenticated');
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: currentPassword,
      });

      if (signInError) {
        setError('Current password is incorrect');
        setIsLoading(false);
        return;
      }

      // Update password
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      // Update profile to reset force_password_change flag
      await supabase
        .from('profiles')
        .update({ force_password_change: false })
        .eq('id', currentUser.id);

      await refreshProfile();
      toast.success('Password changed successfully');
      navigate('/');
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-primary/20 via-primary/10 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            {isRequired 
              ? 'You must change your password before continuing' 
              : 'Update your account password'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isRequired && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Your administrator requires you to change your password.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="pl-10 pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="pl-10 pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Password requirements */}
            <div className="space-y-2 p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium text-muted-foreground">Password Requirements:</p>
              <ul className="space-y-1">
                {passwordRequirements.map((req, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    {req.test(newPassword) ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={req.test(newPassword) ? 'text-green-600' : 'text-muted-foreground'}>
                      {req.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="pl-10 pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {confirmPassword && !passwordsMatch && (
                <p className="text-sm text-destructive">Passwords do not match</p>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              {!isRequired && (
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => navigate(-1)}
                >
                  Cancel
                </Button>
              )}
              <Button 
                type="submit" 
                className={isRequired ? 'w-full' : 'flex-1'}
                disabled={isLoading || !allRequirementsMet || !passwordsMatch}
              >
                {isLoading ? 'Updating...' : 'Change Password'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
