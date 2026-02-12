import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Edit, Shield, Lock, Unlock, User, Building2, Calendar, Mail, Phone, Briefcase } from "lucide-react";
import { useUserProfile, useUpdateUserProfile } from "@/hooks/useAdminData";

const UserView = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { data: user, isLoading } = useUserProfile(userId || '');
  const updateUser = useUpdateUserProfile();

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading user...</div>;
  }

  if (!user) {
    return <div className="flex items-center justify-center h-64">User not found</div>;
  }

  const handleToggleStatus = async () => {
    await updateUser.mutateAsync({ id: user.id, is_active: !user.is_active });
  };

  const getStatusBadge = () => {
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return <Badge variant="destructive">Locked</Badge>;
    }
    return user.is_active ? (
      <Badge variant="default">Active</Badge>
    ) : (
      <Badge variant="secondary">Inactive</Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/users')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{user.full_name || 'Unknown User'}</h1>
            <p className="text-muted-foreground mt-1">{user.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/admin/users/${userId}/roles`)}>
            <Shield className="h-4 w-4 mr-2" />
            Manage Roles
          </Button>
          <Button variant="outline" onClick={() => navigate(`/admin/users/${userId}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button 
            variant={user.is_active ? "destructive" : "default"}
            onClick={handleToggleStatus}
            disabled={updateUser.isPending}
          >
            {user.is_active ? <Lock className="h-4 w-4 mr-2" /> : <Unlock className="h-4 w-4 mr-2" />}
            {user.is_active ? "Disable" : "Enable"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Title</p>
                <p className="font-medium">{user.title || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Full Name</p>
                <p className="font-medium">{user.full_name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Middle Name</p>
                <p className="font-medium">{user.middle_name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gender</p>
                <p className="font-medium">{user.gender || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date of Birth</p>
                <p className="font-medium">{user.date_of_birth ? new Date(user.date_of_birth).toLocaleDateString() : '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Employee Code</p>
                <p className="font-medium">{user.employee_code || '-'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Email Address</p>
                <p className="font-medium">{user.email || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone Number</p>
                <p className="font-medium">{user.phone || '-'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organization
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Office Location</p>
                <p className="font-medium">{user.office?.description || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Department</p>
                <p className="font-medium">{user.department?.name || '-'}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                {getStatusBadge()}
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">MFA Enabled</span>
                <Badge variant={user.mfa_enabled ? "default" : "secondary"}>
                  {user.mfa_enabled ? "Yes" : "No"}
                </Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Force Password Change</span>
                <Badge variant={user.force_password_change ? "destructive" : "secondary"}>
                  {user.force_password_change ? "Yes" : "No"}
                </Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Failed Login Attempts</span>
                <span className="font-medium">{user.failed_login_attempts || 0}</span>
              </div>
              <Separator />
              <div>
                <span className="text-sm text-muted-foreground">Last Login</span>
                <p className="font-medium mt-1">
                  {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Assigned Roles
              </CardTitle>
              <CardDescription>Roles determine user permissions</CardDescription>
            </CardHeader>
            <CardContent>
              {user.roles && user.roles.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {user.roles.map((r, idx) => (
                    <Badge key={idx} variant="outline">{r.role}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No roles assigned</p>
              )}
              <Button 
                variant="link" 
                className="mt-4 p-0" 
                onClick={() => navigate(`/admin/users/${userId}/roles`)}
              >
                Manage Roles →
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UserView;
