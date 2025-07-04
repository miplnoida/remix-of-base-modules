
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Settings, Mail, Shield, Database, Bell } from 'lucide-react';

const SystemSettings = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    system: {
      siteName: 'SecureServe Compliance System',
      siteUrl: 'https://compliance.secureserve.gov',
      maintenanceMode: false,
      debugMode: false,
      sessionTimeout: '30'
    },
    email: {
      smtpHost: 'smtp.gov.ss',
      smtpPort: '587',
      smtpUsername: 'noreply@gov.ss',
      smtpPassword: '',
      fromEmail: 'noreply@gov.ss',
      fromName: 'SecureServe System'
    },
    security: {
      passwordMinLength: '8',
      passwordComplexity: true,
      twoFactorAuth: false,
      loginAttempts: '5',
      lockoutDuration: '30'
    },
    notifications: {
      emailNotifications: true,
      smsNotifications: false,
      complianceAlerts: true,
      deadlineReminders: true,
      systemUpdates: true
    },
    backup: {
      autoBackup: true,
      backupFrequency: 'daily',
      retentionPeriod: '30'
    }
  });

  const handleSubmit = (section: string) => {
    console.log(`Saving ${section} settings:`, settings[section as keyof typeof settings]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/profile")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Profile
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <nav className="flex items-center space-x-2 text-sm text-gray-500">
                <span>User Profile & Permissions</span>
                <span>/</span>
                <span className="text-gray-900 font-medium">System Settings</span>
              </nav>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-600">System configuration and settings (Admin only)</p>
        </div>

        <Tabs defaultValue="system" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="system">System</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="backup">Backup</TabsTrigger>
          </TabsList>

          <TabsContent value="system" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-blue-500" />
                  General System Settings
                </CardTitle>
                <CardDescription>Basic system configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="siteName">Site Name</Label>
                    <Input
                      id="siteName"
                      value={settings.system.siteName}
                      onChange={(e) => setSettings({
                        ...settings,
                        system: { ...settings.system, siteName: e.target.value }
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="siteUrl">Site URL</Label>
                    <Input
                      id="siteUrl"
                      value={settings.system.siteUrl}
                      onChange={(e) => setSettings({
                        ...settings,
                        system: { ...settings.system, siteUrl: e.target.value }
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      value={settings.system.sessionTimeout}
                      onChange={(e) => setSettings({
                        ...settings,
                        system: { ...settings.system, sessionTimeout: e.target.value }
                      })}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="maintenanceMode">Maintenance Mode</Label>
                      <p className="text-sm text-gray-500">Enable to put the system in maintenance mode</p>
                    </div>
                    <Switch
                      id="maintenanceMode"
                      checked={settings.system.maintenanceMode}
                      onCheckedChange={(checked) => setSettings({
                        ...settings,
                        system: { ...settings.system, maintenanceMode: checked }
                      })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="debugMode">Debug Mode</Label>
                      <p className="text-sm text-gray-500">Enable detailed error logging</p>
                    </div>
                    <Switch
                      id="debugMode"
                      checked={settings.system.debugMode}
                      onCheckedChange={(checked) => setSettings({
                        ...settings,
                        system: { ...settings.system, debugMode: checked }
                      })}
                    />
                  </div>
                </div>
                <Button onClick={() => handleSubmit('system')} className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Save System Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-green-500" />
                  Email Configuration
                </CardTitle>
                <CardDescription>Configure SMTP settings for email notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="smtpHost">SMTP Host</Label>
                    <Input
                      id="smtpHost"
                      value={settings.email.smtpHost}
                      onChange={(e) => setSettings({
                        ...settings,
                        email: { ...settings.email, smtpHost: e.target.value }
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="smtpPort">SMTP Port</Label>
                    <Input
                      id="smtpPort"
                      value={settings.email.smtpPort}
                      onChange={(e) => setSettings({
                        ...settings,
                        email: { ...settings.email, smtpPort: e.target.value }
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="smtpUsername">SMTP Username</Label>
                    <Input
                      id="smtpUsername"
                      value={settings.email.smtpUsername}
                      onChange={(e) => setSettings({
                        ...settings,
                        email: { ...settings.email, smtpUsername: e.target.value }
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="smtpPassword">SMTP Password</Label>
                    <Input
                      id="smtpPassword"
                      type="password"
                      value={settings.email.smtpPassword}
                      onChange={(e) => setSettings({
                        ...settings,
                        email: { ...settings.email, smtpPassword: e.target.value }
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="fromEmail">From Email</Label>
                    <Input
                      id="fromEmail"
                      type="email"
                      value={settings.email.fromEmail}
                      onChange={(e) => setSettings({
                        ...settings,
                        email: { ...settings.email, fromEmail: e.target.value }
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="fromName">From Name</Label>
                    <Input
                      id="fromName"
                      value={settings.email.fromName}
                      onChange={(e) => setSettings({
                        ...settings,
                        email: { ...settings.email, fromName: e.target.value }
                      })}
                    />
                  </div>
                </div>
                <Button onClick={() => handleSubmit('email')} className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Save Email Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-red-500" />
                  Security Settings
                </CardTitle>
                <CardDescription>Configure security and authentication settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="passwordMinLength">Minimum Password Length</Label>
                    <Input
                      id="passwordMinLength"
                      type="number"
                      value={settings.security.passwordMinLength}
                      onChange={(e) => setSettings({
                        ...settings,
                        security: { ...settings.security, passwordMinLength: e.target.value }
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="loginAttempts">Max Login Attempts</Label>
                    <Input
                      id="loginAttempts"
                      type="number"
                      value={settings.security.loginAttempts}
                      onChange={(e) => setSettings({
                        ...settings,
                        security: { ...settings.security, loginAttempts: e.target.value }
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lockoutDuration">Lockout Duration (minutes)</Label>
                    <Input
                      id="lockoutDuration"
                      type="number"
                      value={settings.security.lockoutDuration}
                      onChange={(e) => setSettings({
                        ...settings,
                        security: { ...settings.security, lockoutDuration: e.target.value }
                      })}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="passwordComplexity">Password Complexity</Label>
                      <p className="text-sm text-gray-500">Require special characters, numbers, and mixed case</p>
                    </div>
                    <Switch
                      id="passwordComplexity"
                      checked={settings.security.passwordComplexity}
                      onCheckedChange={(checked) => setSettings({
                        ...settings,
                        security: { ...settings.security, passwordComplexity: checked }
                      })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="twoFactorAuth">Two-Factor Authentication</Label>
                      <p className="text-sm text-gray-500">Require 2FA for all users</p>
                    </div>
                    <Switch
                      id="twoFactorAuth"
                      checked={settings.security.twoFactorAuth}
                      onCheckedChange={(checked) => setSettings({
                        ...settings,
                        security: { ...settings.security, twoFactorAuth: checked }
                      })}
                    />
                  </div>
                </div>
                <Button onClick={() => handleSubmit('security')} className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Save Security Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-purple-500" />
                  Notification Settings
                </CardTitle>
                <CardDescription>Configure system notifications and alerts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="emailNotifications">Email Notifications</Label>
                      <p className="text-sm text-gray-500">Send notifications via email</p>
                    </div>
                    <Switch
                      id="emailNotifications"
                      checked={settings.notifications.emailNotifications}
                      onCheckedChange={(checked) => setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, emailNotifications: checked }
                      })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="complianceAlerts">Compliance Alerts</Label>
                      <p className="text-sm text-gray-500">Alerts for compliance violations</p>
                    </div>
                    <Switch
                      id="complianceAlerts"
                      checked={settings.notifications.complianceAlerts}
                      onCheckedChange={(checked) => setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, complianceAlerts: checked }
                      })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="deadlineReminders">Deadline Reminders</Label>
                      <p className="text-sm text-gray-500">Reminders for upcoming deadlines</p>
                    </div>
                    <Switch
                      id="deadlineReminders"
                      checked={settings.notifications.deadlineReminders}
                      onCheckedChange={(checked) => setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, deadlineReminders: checked }
                      })}
                    />
                  </div>
                </div>
                <Button onClick={() => handleSubmit('notifications')} className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Save Notification Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="backup" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-orange-500" />
                  Backup Settings
                </CardTitle>
                <CardDescription>Configure automatic backup settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="autoBackup">Automatic Backup</Label>
                    <p className="text-sm text-gray-500">Enable automatic database backups</p>
                  </div>
                  <Switch
                    id="autoBackup"
                    checked={settings.backup.autoBackup}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      backup: { ...settings.backup, autoBackup: checked }
                    })}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="backupFrequency">Backup Frequency</Label>
                    <Input
                      id="backupFrequency"
                      value={settings.backup.backupFrequency}
                      onChange={(e) => setSettings({
                        ...settings,
                        backup: { ...settings.backup, backupFrequency: e.target.value }
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="retentionPeriod">Retention Period (days)</Label>
                    <Input
                      id="retentionPeriod"
                      type="number"
                      value={settings.backup.retentionPeriod}
                      onChange={(e) => setSettings({
                        ...settings,
                        backup: { ...settings.backup, retentionPeriod: e.target.value }
                      })}
                    />
                  </div>
                </div>
                <Button onClick={() => handleSubmit('backup')} className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Save Backup Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SystemSettings;
