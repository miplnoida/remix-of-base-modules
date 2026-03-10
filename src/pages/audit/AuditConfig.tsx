import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Bell, Shield, Flag, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { useToast } from '@/hooks/use-toast';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { PageShell } from '@/components/common';
import {
  useIAAuditSettings, useIAAuditSettingMutations,
  useIARiskCriteria, useIARiskCriteriaMutations,
  useIAActivityTypes, useIAActivityTypeMutations
} from '@/hooks/useAuditConfigData';

export default function AuditConfig() {
  
  const { toast } = useToast();
  const { profile } = useSupabaseAuth();
  const userCode = (profile as any)?.user_code || 'system';

  const { data: allSettings = [], isLoading: settingsLoading } = useIAAuditSettings();
  const { data: riskCriteria = [], isLoading: riskLoading } = useIARiskCriteria();
  const { data: activityTypes = [], isLoading: typesLoading } = useIAActivityTypes();
  const { upsert: upsertSettings } = useIAAuditSettingMutations();
  const { update: updateRisk } = useIARiskCriteriaMutations();
  const { update: updateType } = useIAActivityTypeMutations();

  const settingsMap = useMemo(() => {
    const map: Record<string, Record<string, string>> = {};
    allSettings.forEach((s: any) => {
      if (!map[s.setting_category]) map[s.setting_category] = {};
      map[s.setting_category][s.setting_key] = s.setting_value;
    });
    return map;
  }, [allSettings]);

  // Notifications & SLA
  const [slaSettings, setSlaSettings] = useState({ defaultResponseDays: '14', reminderDaysBefore: '3', autoNotifyOnPlanApproval: false });
  // Feature Flags
  const [featureFlags, setFeatureFlags] = useState({ enableReportBuilder: true });
  // Reference Settings
  const [refSettings, setRefSettings] = useState({ defaultFiscalYear: '2026', locations: 'St Kitts, Nevis' });

  useEffect(() => {
    if (settingsMap.sla) {
      const s = settingsMap.sla;
      setSlaSettings({
        defaultResponseDays: s.defaultResponseDays || '14',
        reminderDaysBefore: s.reminderDaysBefore || '3',
        autoNotifyOnPlanApproval: s.autoNotifyOnPlanApproval === 'true',
      });
    }
    if (settingsMap.features) {
      const f = settingsMap.features;
      setFeatureFlags({
        enableReportBuilder: f.enableReportBuilder !== 'false',
      });
    }
    if (settingsMap.reference) {
      const r = settingsMap.reference;
      setRefSettings({
        defaultFiscalYear: r.defaultFiscalYear || '2026',
        locations: r.locations || 'St Kitts, Nevis',
      });
    }
  }, [settingsMap]);

  const saveCategory = (category: string, data: Record<string, any>) => {
    const entries = Object.entries(data).map(([key, value]) => ({
      setting_category: category, setting_key: key, setting_value: String(value), updated_by: userCode,
    }));
    upsertSettings.mutate(entries);
  };

  const isLoading = settingsLoading || riskLoading || typesLoading;

  return (
    <PageShell
      title="System Configuration"
      subtitle="Configure Internal Audit system settings"
      breadcrumbs={[{ label: 'Internal Audit' }, { label: 'System Configuration' }]}
      isLoading={isLoading}
    >
      <Tabs defaultValue="sla" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sla"><Bell className="w-4 h-4 mr-2" />Notifications & SLA</TabsTrigger>
          <TabsTrigger value="features"><Flag className="w-4 h-4 mr-2" />Feature Flags</TabsTrigger>
          <TabsTrigger value="reference"><MapPin className="w-4 h-4 mr-2" />Reference Settings</TabsTrigger>
          <TabsTrigger value="risk"><Shield className="w-4 h-4 mr-2" />Risk Criteria</TabsTrigger>
          <TabsTrigger value="activities"><Settings className="w-4 h-4 mr-2" />Activity Types</TabsTrigger>
        </TabsList>

        {/* Notifications & SLA */}
        <TabsContent value="sla">
          <Card>
            <CardHeader><CardTitle>Notifications & SLA Settings</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Default Response Days</Label>
                  <Input type="number" value={slaSettings.defaultResponseDays} onChange={(e) => setSlaSettings({ ...slaSettings, defaultResponseDays: e.target.value })} />
                  <p className="text-xs text-muted-foreground">Number of days management has to respond to findings</p>
                </div>
                <div className="space-y-2">
                  <Label>Reminder Days Before Due</Label>
                  <Input type="number" value={slaSettings.reminderDaysBefore} onChange={(e) => setSlaSettings({ ...slaSettings, reminderDaysBefore: e.target.value })} />
                  <p className="text-xs text-muted-foreground">Days before due date to send reminder</p>
                </div>
              </div>
              <div className="flex items-center justify-between border rounded-lg p-4">
                <div><Label>Auto-notify on Plan Approval</Label><p className="text-sm text-muted-foreground">Send notifications when plans are approved</p></div>
                <Switch checked={slaSettings.autoNotifyOnPlanApproval} onCheckedChange={(checked) => setSlaSettings({ ...slaSettings, autoNotifyOnPlanApproval: checked })} />
              </div>
              <Button onClick={() => saveCategory('sla', slaSettings)} disabled={upsertSettings.isPending}>
                {upsertSettings.isPending ? 'Saving...' : 'Save SLA Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feature Flags */}
        <TabsContent value="features">
          <Card>
            <CardHeader><CardTitle>Feature Flags</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between border rounded-lg p-4">
                <div><Label>Enable Report Builder</Label><p className="text-sm text-muted-foreground">Enable the report builder module</p></div>
                <Switch checked={featureFlags.enableReportBuilder} onCheckedChange={(checked) => setFeatureFlags({ ...featureFlags, enableReportBuilder: checked })} />
              </div>
              <Button onClick={() => saveCategory('features', featureFlags)} disabled={upsertSettings.isPending}>
                {upsertSettings.isPending ? 'Saving...' : 'Save Feature Flags'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reference Settings */}
        <TabsContent value="reference">
          <Card>
            <CardHeader><CardTitle>Reference Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Default Fiscal Year</Label>
                  <Input value={refSettings.defaultFiscalYear} onChange={(e) => setRefSettings({ ...refSettings, defaultFiscalYear: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Locations</Label>
                  <Input value={refSettings.locations} onChange={(e) => setRefSettings({ ...refSettings, locations: e.target.value })} />
                  <p className="text-xs text-muted-foreground">Comma-separated list</p>
                </div>
              </div>
              <Button onClick={() => saveCategory('reference', refSettings)} disabled={upsertSettings.isPending}>
                {upsertSettings.isPending ? 'Saving...' : 'Save Reference Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risk Criteria */}
        <TabsContent value="risk">
          <Card>
            <CardHeader><CardTitle>Risk Assessment Criteria</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Criteria</TableHead><TableHead>Weight</TableHead><TableHead>Enabled</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {riskCriteria.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.criteria}</TableCell>
                      <TableCell><Badge className={c.weight === 'High' ? 'bg-destructive' : c.weight === 'Medium' ? 'bg-orange-600' : 'bg-green-500'}>{c.weight}</Badge></TableCell>
                      <TableCell><Switch checked={c.is_enabled} onCheckedChange={(checked) => updateRisk.mutate({ id: c.id, is_enabled: checked, updated_by: userCode })} /></TableCell>
                    </TableRow>
                  ))}
                  {riskCriteria.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No risk criteria configured</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Types */}
        <TabsContent value="activities">
          <Card>
            <CardHeader><CardTitle>Activity Types Configuration</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Activity Type</TableHead><TableHead>Description</TableHead><TableHead>Duration (hrs)</TableHead><TableHead>Enabled</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {activityTypes.map((type: any) => (
                    <TableRow key={type.id}>
                      <TableCell className="font-medium">{type.name}</TableCell>
                      <TableCell>{type.description}</TableCell>
                      <TableCell>{type.default_duration}</TableCell>
                      <TableCell><Switch checked={type.is_enabled} onCheckedChange={(checked) => updateType.mutate({ id: type.id, is_enabled: checked, updated_by: userCode })} /></TableCell>
                    </TableRow>
                  ))}
                  {activityTypes.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No activity types configured</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
