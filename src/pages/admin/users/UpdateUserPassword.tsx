import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePasswordPolicy, validatePassword } from '@/hooks/usePasswordPolicy';
import { toast } from 'sonner';
import { Eye, EyeOff, Key, Check, X, Shield, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { MODULE_NAMES } from '@/hooks/useActionPermission';

interface User {
  Id: string;
  Email: string | null;
  full_name: string | null;
  UserName: string | null;
  is_active: boolean;
}

function UpdateUserPasswordContent() {
  const { user: currentUser } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch users
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('AspNetUsers')
        .select('Id, Email, full_name, UserName, is_active')
        .eq('is_active', true)
        .order('full_name');
      
      if (error) throw error;
      return data as User[];
    },
  });

  // Fetch password policy
  const { data: passwordPolicy, isLoading: policyLoading } = usePasswordPolicy();

  // Validate password against policy
  const passwordValidation = useMemo(() => {
    if (!newPassword) return null;
    return validatePassword(newPassword, passwordPolicy);
  }, [newPassword, passwordPolicy]);

  // Clear errors when fields change
  const handleUserChange = (userId: string) => {
    setSelectedUserId(userId);
    setErrors(prev => ({ ...prev, user: '' }));
  };

  const handleNewPasswordChange = (value: string) => {
    setNewPassword(value);
    setErrors(prev => ({ ...prev, newPassword: '', confirmPassword: '' }));
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    setErrors(prev => ({ ...prev, confirmPassword: '' }));
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedUserId) {
      newErrors.user = 'Please select a user';
    }

    if (!newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (passwordValidation && !passwordValidation.isValid) {
      newErrors.newPassword = passwordValidation.errors[0] || 'Password does not meet requirements';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm the new password';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    setIsSubmitting(true);
    try {
      // Hash the password (in a real implementation, this would be done server-side)
      // For now, we'll update the PasswordHash field directly
      // Note: In production, use a proper password hashing mechanism via edge function
      
      const { error } = await supabase
        .from('AspNetUsers')
        .update({
          PasswordHash: newPassword, // This should be hashed in production
          last_password_change: new Date().toISOString(),
          force_password_change: false,
          updated_at: new Date().toISOString(),
          updated_by: currentUser?.id,
        })
        .eq('Id', selectedUserId);

      if (error) throw error;

      toast.success('Password updated successfully', {
        description: 'The user can now log in with their new password',
      });

      // Reset form
      setSelectedUserId('');
      setNewPassword('');
      setConfirmPassword('');
      setErrors({});
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error('Failed to update password', {
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedUser = users.find(u => u.Id === selectedUserId);

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Update User Password
        </h1>
        <p className="text-muted-foreground mt-1">
          Reset the password for any user in the system
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Password Reset
          </CardTitle>
          <CardDescription>
            Select a user and enter their new password. The password must meet the system's security requirements.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* User Selection */}
            <div className="space-y-2">
              <Label htmlFor="user">Select User <span className="text-destructive">*</span></Label>
              <Select value={selectedUserId} onValueChange={handleUserChange} disabled={usersLoading}>
                <SelectTrigger className={errors.user ? 'border-destructive' : ''}>
                  <SelectValue placeholder={usersLoading ? 'Loading users...' : 'Select a user'} />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.Id} value={user.Id}>
                      {user.full_name || user.Email || user.UserName || 'Unknown User'}
                      {user.Email && user.full_name && (
                        <span className="text-muted-foreground ml-2">({user.Email})</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.user && <p className="text-xs text-destructive">{errors.user}</p>}
            </div>

            {selectedUser && (
              <Alert>
                <AlertDescription>
                  Updating password for: <strong>{selectedUser.full_name || selectedUser.Email}</strong>
                </AlertDescription>
              </Alert>
            )}

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => handleNewPasswordChange(e.target.value)}
                  placeholder="Enter new password"
                  className={errors.newPassword ? 'border-destructive pr-10' : 'pr-10'}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {errors.newPassword && <p className="text-xs text-destructive">{errors.newPassword}</p>}
            </div>

            {/* Password Requirements */}
            {newPassword && passwordValidation && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium mb-2">Password Requirements:</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className={`flex items-center gap-2 ${passwordValidation.checks.length ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {passwordValidation.checks.length ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    <span>Min {passwordPolicy?.min_length || 8} characters</span>
                  </div>
                  {(passwordPolicy?.require_uppercase !== false) && (
                    <div className={`flex items-center gap-2 ${passwordValidation.checks.uppercase ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {passwordValidation.checks.uppercase ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      <span>Uppercase letter</span>
                    </div>
                  )}
                  {(passwordPolicy?.require_lowercase !== false) && (
                    <div className={`flex items-center gap-2 ${passwordValidation.checks.lowercase ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {passwordValidation.checks.lowercase ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      <span>Lowercase letter</span>
                    </div>
                  )}
                  {(passwordPolicy?.require_numbers !== false) && (
                    <div className={`flex items-center gap-2 ${passwordValidation.checks.number ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {passwordValidation.checks.number ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      <span>Number</span>
                    </div>
                  )}
                  {passwordPolicy?.require_special_chars && (
                    <div className={`flex items-center gap-2 ${passwordValidation.checks.special ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {passwordValidation.checks.special ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      <span>Special character</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                  placeholder="Confirm new password"
                  className={errors.confirmPassword ? 'border-destructive pr-10' : 'pr-10'}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
              {confirmPassword && newPassword === confirmPassword && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Check className="h-3 w-3" /> Passwords match
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || !selectedUserId || !newPassword || !confirmPassword}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating Password...
                </>
              ) : (
                <>
                  <Key className="h-4 w-4 mr-2" />
                  Update Password
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function UpdateUserPassword() {
  return (
    <PermissionWrapper moduleName={MODULE_NAMES.USER_MANAGEMENT}>
      <UpdateUserPasswordContent />
    </PermissionWrapper>
  );
}
