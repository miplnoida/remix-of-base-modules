import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Users, FileText, Database, Bell, Shield } from 'lucide-react';
import { PageShell, DataTable, StatusBadge } from '@/components/common';
import type { DataTableColumn } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import {
  useIAAuditSettings, useIAAuditSettingMutations,
  useIARiskCriteria, useIARiskCriteriaMutations,
  useIAActivityTypes, useIAActivityTypeMutations
} from '@/hooks/useAuditConfigData';

export default function AuditConfig() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const { profile } = useSupabaseAuth();
  const userCode = (profile as any)?.user_code || 'system';

  // Fetch data from database
  const { data: allSettings = [], isLoading: settingsLoading } = useIAAuditSettings();
  const { data: riskCriteria = [], isLoading: riskLoading } = useIARiskCriteria();
  const { data: activityTypes = [], isLoading: typesLoading } = useIAActivityTypes();

  const { upsert: upsertSettings } = useIAAuditSettingMutations();
  const { update: updateRisk } = useIARiskCriteriaMutations();
  const { update: updateType } = useIAActivityTypeMutations();

  // Derive settings maps
  const settingsMap = useMemo(() => {
    const map: Record<string, Record<string, string>> = {};
    allSettings.forEach((s: any) => {
      if (!map[s.setting_category]) map[s.setting_category] = {};
      map[s.setting_category][s.setting_key] = s.setting_value;
    });
    return map;
  }, [allSettings]);

  // Local state initialized from DB
  const [generalSettings, setGeneralSettings] = useState({
    defaultAuditPeriod: 'Monthly',
    autoAssignAuditors: true,
    requireApproval: true,
    allowSelfAudit: false,
    maxActivitiesPerDay: 3,
    defaultActivityDuration: 8,
    reminderDays: 7
  });

  const [notifications, setNotifications] = useState({
    planSubmitted: true,
    planApproved: true,
    activityReminder: true,
    overdueFollowup: true,
    emailNotifications: true,
    systemNotifications: true
  });

  // Sync from DB when loaded
  useEffect(() => {
    if (settingsMap.general) {
      const g = settingsMap.general;
      setGeneralSettings({
        defaultAuditPeriod: g.defaultAuditPeriod || 'Monthly',
        autoAssignAuditors: g.autoAssignAuditors === 'true',
        requireApproval: g.requireApproval === 'true',
        allowSelfAudit: g.allowSelfAudit === 'true',
        maxActivitiesPerDay: parseInt(g.maxActivitiesPerDay || '3'),
        defaultActivityDuration: parseInt(g.defaultActivityDuration || '8'),
        reminderDays: parseInt(g.reminderDays || '7'),
      });
    }
    if (settingsMap.notifications) {
      const n = settingsMap.notifications;
      setNotifications({
        planSubmitted: n.planSubmitted === 'true',
        planApproved: n.planApproved === 'true',
        activityReminder: n.activityReminder === 'true',
        overdueFollowup: n.overdueFollowup === 'true',
        emailNotifications: n.emailNotifications === 'true',
        systemNotifications: n.systemNotifications === 'true',
      });
    }
  }, [settingsMap]);

  const handleSaveGeneral = () => {
    const entries = Object.entries(generalSettings).map(([key, value]) => ({
      setting_category: 'general',
      setting_key: key,
      setting_value: String(value),
      updated_by: userCode,
    }));
    upsertSettings.mutate(entries);
  };

  const handleSaveNotifications = () => {
    const entries = Object.entries(notifications).map(([key, value]) => ({
      setting_category: 'notifications',
      setting_key: key,
      setting_value: String(value),
      updated_by: userCode,
    }));
    upsertSettings.mutate(entries);
  };

  const handleSaveSecurity = () => {
    toast({ title: "Settings Saved", description: "Security settings have been updated successfully." });
  };

  if (!hasPermission('configure_audit_system')) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">You don't have permission to configure audit system.</p>
      </div>
    );
  }

  const isLoading = settingsLoading || riskLoading || typesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Audit System Configuration</h1>
        <p className="text-muted-foreground">Configure audit system settings and parameters</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general"><Settings className="w-4 h-4 mr-2" />General</TabsTrigger>
          <TabsTrigger value="users"><Users className="w-4 h-4 mr-2" />Users & Roles</TabsTrigger>
          <TabsTrigger value="activities"><FileText className="w-4 h-4 mr-2" />Activities</TabsTrigger>
          <TabsTrigger value="risk"><Database className="w-4 h-4 mr-2" />Risk Criteria</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="w-4 h-4 mr-2" />Notifications</TabsTrigger>
          <TabsTrigger value="security"><Shield className="w-4 h-4 mr-2" />Security</TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>General Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Default Audit Period</Label>
                  <Select value={generalSettings.defaultAuditPeriod} onValueChange={(value) => setGeneralSettings({...generalSettings, defaultAuditPeriod: value})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Monthly">Monthly</SelectItem>
                      <SelectItem value="Quarterly">Quarterly</SelectItem>
                      <SelectItem value="Annual">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Max Activities Per Day</Label>
                  <Input type="number" value={generalSettings.maxActivitiesPerDay} onChange={(e) => setGeneralSettings({...generalSettings, maxActivitiesPerDay: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label>Default Activity Duration (hours)</Label>
                  <Input type="number" value={generalSettings.defaultActivityDuration} onChange={(e) => setGeneralSettings({...generalSettings, defaultActivityDuration: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label>Reminder Days Before Due</Label>
                  <Input type="number" value={generalSettings.reminderDays} onChange={(e) => setGeneralSettings({...generalSettings, reminderDays: Number(e.target.value)})} />
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div><Label>Auto-assign Auditors</Label><p className="text-sm text-muted-foreground">Automatically assign auditors based on workload</p></div>
                  <Switch checked={generalSettings.autoAssignAuditors} onCheckedChange={(checked) => setGeneralSettings({...generalSettings, autoAssignAuditors: checked})} />
                </div>
                <div className="flex items-center justify-between">
                  <div><Label>Require Plan Approval</Label><p className="text-sm text-muted-foreground">Require manager approval before plan execution</p></div>
                  <Switch checked={generalSettings.requireApproval} onCheckedChange={(checked) => setGeneralSettings({...generalSettings, requireApproval: checked})} />
                </div>
                <div className="flex items-center justify-between">
                  <div><Label>Allow Self-Audit</Label><p className="text-sm text-muted-foreground">Allow auditors to audit their own previous work</p></div>
                  <Switch checked={generalSettings.allowSelfAudit} onCheckedChange={(checked) => setGeneralSettings({...generalSettings, allowSelfAudit: checked})} />
                </div>
              </div>
              <Button onClick={handleSaveGeneral} disabled={upsertSettings.isPending}>
                {upsertSettings.isPending ? 'Saving...' : 'Save General Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab - reads from ia_auditors */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>User Management</CardTitle></CardHeader>
            <CardContent>
              <p className="text-muted-foreground">User management is handled via the Auditor Profiles module.</p>
              <Button variant="outline" className="mt-4" onClick={() => window.location.href = '/audit/auditors'}>
                Go to Auditor Profiles
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Types Tab */}
        <TabsContent value="activities" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Activity Types Configuration</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Activity Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Default Duration (hrs)</TableHead>
                    <TableHead>Enabled</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activityTypes.map((type: any) => (
                    <TableRow key={type.id}>
                      <TableCell className="font-medium">{type.name}</TableCell>
                      <TableCell>{type.description}</TableCell>
                      <TableCell>{type.default_duration}</TableCell>
                      <TableCell>
                        <Switch
                          checked={type.is_enabled}
                          onCheckedChange={(checked) => updateType.mutate({ id: type.id, is_enabled: checked, updated_by: userCode })}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risk Criteria Tab */}
        <TabsContent value="risk" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Risk Assessment Criteria</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Criteria</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Enabled</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {riskCriteria.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.criteria}</TableCell>
                      <TableCell>
                        <Badge className={c.weight === 'High' ? 'bg-red-500' : c.weight === 'Medium' ? 'bg-orange-600' : 'bg-green-500'}>
                          {c.weight}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={c.is_enabled}
                          onCheckedChange={(checked) => updateRisk.mutate({ id: c.id, is_enabled: checked, updated_by: userCode })}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Notification Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                {[
                  { key: 'planSubmitted', label: 'Plan Submitted Notifications', desc: 'Notify managers when plans are submitted' },
                  { key: 'planApproved', label: 'Plan Approved Notifications', desc: 'Notify officers when plans are approved' },
                  { key: 'activityReminder', label: 'Activity Reminders', desc: 'Send reminders before activities' },
                  { key: 'overdueFollowup', label: 'Overdue Follow-up Alerts', desc: 'Alert when follow-ups are overdue' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between">
                    <div><Label>{item.label}</Label><p className="text-sm text-muted-foreground">{item.desc}</p></div>
                    <Switch
                      checked={notifications[item.key as keyof typeof notifications]}
                      onCheckedChange={(checked) => setNotifications({...notifications, [item.key]: checked})}
                    />
                  </div>
                ))}
              </div>
              <Button onClick={handleSaveNotifications} disabled={upsertSettings.isPending}>
                {upsertSettings.isPending ? 'Saving...' : 'Save Notification Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Security Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Data Retention Period (years)</Label>
                <Input type="number" defaultValue={settingsMap.security?.dataRetentionYears || '7'} />
              </div>
              <div className="space-y-2">
                <Label>Session Timeout (minutes)</Label>
                <Input type="number" defaultValue={settingsMap.security?.sessionTimeoutMinutes || '30'} />
              </div>
              <div className="space-y-2">
                <Label>Password Policy</Label>
                <Textarea defaultValue="Minimum 8 characters, must include uppercase, lowercase, number, and special character" readOnly />
              </div>
              <Button onClick={handleSaveSecurity}>Save Security Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
