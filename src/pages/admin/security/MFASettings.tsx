import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Shield, Key } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Role {
  id: string;
  role_name: string;
  description: string | null;
  is_active: boolean;
  mfa_required: boolean;
}

const MFASettings = () => {
  const queryClient = useQueryClient();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles-mfa'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('role_name');
      if (error) throw error;
      return data as Role[];
    },
  });

  const updateMFA = useMutation({
    mutationFn: async ({ roleId, mfaRequired }: { roleId: string; mfaRequired: boolean }) => {
      const { error } = await supabase
        .from('roles')
        .update({ mfa_required: mfaRequired })
        .eq('id', roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles-mfa'] });
      toast.success('MFA setting updated');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading MFA settings...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Multi-Factor Authentication</h1>
        <p className="text-muted-foreground mt-1">Configure MFA requirements per role</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            MFA Configuration by Role
          </CardTitle>
          <CardDescription>
            Enable or disable MFA requirements for each role. Users with roles marked as MFA required 
            must complete MFA enrollment before accessing the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {roles.map(role => (
              <div key={role.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{role.role_name}</p>
                    <p className="text-sm text-muted-foreground">{role.description || 'No description'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={role.is_active ? "default" : "secondary"}>
                    {role.is_active ? "Active" : "Inactive"}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">MFA Required</span>
                    <Switch
                      checked={role.mfa_required}
                      onCheckedChange={(checked) => updateMFA.mutate({ roleId: role.id, mfaRequired: checked })}
                      disabled={updateMFA.isPending}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>MFA Methods</CardTitle>
          <CardDescription>Supported multi-factor authentication methods</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium">Email OTP</h4>
              <p className="text-sm text-muted-foreground mt-1">
                One-time password sent to the user's registered email address
              </p>
              <Badge variant="default" className="mt-2">Available</Badge>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium">SMS OTP</h4>
              <p className="text-sm text-muted-foreground mt-1">
                One-time password sent via SMS to the user's phone
              </p>
              <Badge variant="secondary" className="mt-2">Coming Soon</Badge>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium">Authenticator App</h4>
              <p className="text-sm text-muted-foreground mt-1">
                TOTP via Google Authenticator or similar apps
              </p>
              <Badge variant="secondary" className="mt-2">Coming Soon</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MFASettings;