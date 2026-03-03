import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { 
  Shield, 
  Users, 
  Activity, 
  Settings, 
  Key, 
  Lock,
  UserPlus,
  Edit,
  Trash2,
  Eye,
  AlertTriangle
} from "lucide-react";
import { notificationService } from '@/services/notificationService';
import { UserRole, AuditLog } from '@/types/notifications';
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from 'date-fns';

export default function Administration() {
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [rolesData, logsData] = await Promise.all([
        notificationService.getUserRoles(),
        notificationService.getAuditLogs()
      ]);
      setUserRoles(rolesData);
      setAuditLogs(logsData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load administration data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const securitySettings = [
    {
      title: "Two-Factor Authentication",
      description: "Require 2FA for all admin users",
      enabled: true,
      key: "require_2fa"
    },
    {
      title: "Session Timeout",
      description: "Auto-logout after 30 minutes of inactivity",
      enabled: true,
      key: "session_timeout"
    },
    {
      title: "API Rate Limiting",
      description: "Limit notification API requests per hour",
      enabled: true,
      key: "rate_limiting"
    },
    {
      title: "Email Validation",
      description: "Validate all email addresses before sending",
      enabled: true,
      key: "email_validation"
    },
    {
      title: "Audit Logging",
      description: "Log all administrative actions",
      enabled: true,
      key: "audit_logging"
    }
  ];

  const handleSecurityToggle = (key: string, enabled: boolean) => {
    toast({
      title: "Security Setting Updated",
      description: `${key.replace('_', ' ')} has been ${enabled ? 'enabled' : 'disabled'}`,
    });
  };

  const getPermissionBadge = (permission: string) => {
    const colors = {
      create: "bg-success/10 text-success border-success/30",
      read: "bg-info/10 text-info border-info/30",
      update: "bg-warning/15 text-warning border-warning/30",
      delete: "bg-destructive/10 text-destructive border-destructive/30",
      manage_users: "bg-accent text-accent-foreground border-accent"
    };
    
    return (
      <Badge 
        className={colors[permission as keyof typeof colors] || "bg-muted text-muted-foreground border-border"}
      >
        {permission.replace('_', ' ')}
      </Badge>
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Administration & Security
          </h1>
          <p className="text-muted-foreground">Manage roles, permissions, and security settings</p>
        </div>
      </div>

      <Tabs defaultValue="roles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            User Roles
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Security Settings
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Audit Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>User Roles & Permissions</CardTitle>
                  <CardDescription>Manage user access levels and permissions</CardDescription>
                </div>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Role
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userRoles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">{role.name}</TableCell>
                      <TableCell>{role.description}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {role.permissions.map((permission) => (
                            <span key={permission}>
                              {getPermissionBadge(permission)}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Security Settings
                </CardTitle>
                <CardDescription>Configure security policies and features</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {securitySettings.map((setting) => (
                  <div key={setting.key} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">{setting.title}</Label>
                      <p className="text-xs text-muted-foreground">{setting.description}</p>
                    </div>
                    <Switch
                      checked={setting.enabled}
                      onCheckedChange={(checked) => handleSecurityToggle(setting.key, checked)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  API Configuration
                </CardTitle>
                <CardDescription>Configure external service connections</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp-server">SMTP Server</Label>
                  <Input id="smtp-server" placeholder="smtp.example.com" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="smtp-port">SMTP Port</Label>
                  <Input id="smtp-port" placeholder="587" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="sms-gateway">SMS Gateway</Label>
                  <Input id="sms-gateway" placeholder="API endpoint URL" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="push-key">Push Notification Key</Label>
                  <Input id="push-key" type="password" placeholder="••••••••••••••••" />
                </div>
                
                <Button className="w-full mt-4">Save Configuration</Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Notification Limits & Quotas
              </CardTitle>
              <CardDescription>Set daily and monthly limits for different notification types</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Daily Email Limit</Label>
                  <Input placeholder="10,000" />
                </div>
                <div className="space-y-2">
                  <Label>Daily SMS Limit</Label>
                  <Input placeholder="5,000" />
                </div>
                <div className="space-y-2">
                  <Label>Monthly Email Limit</Label>
                  <Input placeholder="100,000" />
                </div>
                <div className="space-y-2">
                  <Label>Monthly SMS Limit</Label>
                  <Input placeholder="50,000" />
                </div>
              </div>
              <Button className="mt-4">Update Limits</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Audit Trail
              </CardTitle>
              <CardDescription>Track all administrative actions and changes</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge variant="outline">{log.action}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{log.performedBy}</TableCell>
                      <TableCell className="max-w-xs truncate">{log.details}</TableCell>
                      <TableCell>{log.ipAddress}</TableCell>
                      <TableCell>
                        {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}