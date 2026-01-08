import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Key, Save, AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";

const ChangePassword = () => {
  const navigate = useNavigate();
  const { user, profile } = useSupabaseAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password validation
  const passwordChecks = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
    match: newPassword === confirmPassword && newPassword.length > 0,
  };

  const allValid = Object.values(passwordChecks).every(Boolean) && currentPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!allValid) {
      setError("Please meet all password requirements");
      return;
    }

    setIsSubmitting(true);

    try {
      // First verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword,
      });

      if (signInError) {
        setError("Current password is incorrect");
        setIsSubmitting(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      // Update profile to clear force_password_change flag
      if (user) {
        await supabase
          .from('profiles')
          .update({ 
            force_password_change: false,
            last_password_change: new Date().toISOString(),
          })
          .eq('id', user.id);
      }

      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      
      // Navigate back after success
      if (!profile?.force_password_change) {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || "Failed to change password");
    } finally {
      setIsSubmitting(false);
    }
  };

  const CheckItem = ({ valid, text }: { valid: boolean; text: string }) => (
    <div className={`flex items-center gap-2 text-sm ${valid ? 'text-green-600' : 'text-muted-foreground'}`}>
      {valid ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
      {text}
    </div>
  );

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Change Password</h1>
        <p className="text-muted-foreground mt-1">Update your account password</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Password Update
          </CardTitle>
          <CardDescription>
            Choose a strong password that you don't use elsewhere
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Password Requirements */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p className="text-sm font-medium mb-2">Password Requirements:</p>
              <div className="grid grid-cols-2 gap-2">
                <CheckItem valid={passwordChecks.length} text="At least 8 characters" />
                <CheckItem valid={passwordChecks.uppercase} text="One uppercase letter" />
                <CheckItem valid={passwordChecks.lowercase} text="One lowercase letter" />
                <CheckItem valid={passwordChecks.number} text="One number" />
                <CheckItem valid={passwordChecks.special} text="One special character" />
                <CheckItem valid={passwordChecks.match} text="Passwords match" />
              </div>
            </div>

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !allValid}>
                <Save className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChangePassword;
