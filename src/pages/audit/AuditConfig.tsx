import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Settings, Users, FileText, Database, Bell, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function AuditConfig() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  
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

  const [riskCriteria, setRiskCriteria] = useState([
    { id: 1, criteria: 'Large employer (>100 employees)', weight: 'High', enabled: true },
    { id: 2, criteria: 'Financial institution', weight: 'High', enabled: true },
    { id: 3, criteria: 'Previous non-compliance', weight: 'Medium', enabled: true },
    { id: 4, criteria: 'New registration', weight: 'Medium', enabled: true },
    { id: 5, criteria: 'Seasonal variations', weight: 'Low', enabled: true }
  ]);

  const [activityTypes, setActivityTypes] = useState([
    { id: 1, name: 'Compliance Check', description: 'Basic compliance verification', enabled: true, duration: 4 },
    { id: 2, name: 'Records Review', description: 'Document and record examination', enabled: true, duration: 6 },
    { id: 3, name: 'Site Visit', description: 'On-site audit and inspection', enabled: true, duration: 8 },
    { id: 4, name: 'Contribution Verification', description: 'Verify contribution calculations', enabled: true, duration: 6 },
    { id: 5, name: 'Payroll Sampling', description: 'Sample payroll records audit', enabled: true, duration: 4 }
  ]);

  const handleSaveSettings = (section: string) => {
    toast({
      title: "Settings Saved",
      description: `${section} settings have been updated successfully.`
    });
  };

  if (!hasPermission('configure_audit_system')) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">You don't have permission to configure audit system.</p>
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
          <TabsTrigger value="general">
            <Settings className="w-4 h-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="w-4 h-4 mr-2" />
            Users & Roles
          </TabsTrigger>
          <TabsTrigger value="activities">
            <FileText className="w-4 h-4 mr-2" />
            Activities
          </TabsTrigger>
          <TabsTrigger value="risk">
            <Database className="w-4 h-4 mr-2" />
            Risk Criteria
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Default Audit Period</Label>
                  <Select 
                    value={generalSettings.defaultAuditPeriod} 
                    onValueChange={(value) => setGeneralSettings({...generalSettings, defaultAuditPeriod: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Monthly">Monthly</SelectItem>
                      <SelectItem value="Quarterly">Quarterly</SelectItem>
                      <SelectItem value="Annual">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Max Activities Per Day</Label>
                  <Input
                    type="number"
                    value={generalSettings.maxActivitiesPerDay}
                    onChange={(e) => setGeneralSettings({...generalSettings, maxActivitiesPerDay: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Default Activity Duration (hours)</Label>
                  <Input
                    type="number"
                    value={generalSettings.defaultActivityDuration}
                    onChange={(e) => setGeneralSettings({...generalSettings, defaultActivityDuration: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reminder Days Before Due</Label>
                  <Input
                    type="number"
                    value={generalSettings.reminderDays}
                    onChange={(e) => setGeneralSettings({...generalSettings, reminderDays: Number(e.target.value)})}
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-assign Auditors</Label>
                    <p className="text-sm text-muted-foreground">Automatically assign auditors based on workload</p>
                  </div>
                  <Switch
                    checked={generalSettings.autoAssignAuditors}
                    onCheckedChange={(checked) => setGeneralSettings({...generalSettings, autoAssignAuditors: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Plan Approval</Label>
                    <p className="text-sm text-muted-foreground">Require manager approval before plan execution</p>
                  </div>
                  <Switch
                    checked={generalSettings.requireApproval}
                    onCheckedChange={(checked) => setGeneralSettings({...generalSettings, requireApproval: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Allow Self-Audit</Label>
                    <p className="text-sm text-muted-foreground">Allow auditors to audit their own previous work</p>
                  </div>
                  <Switch
                    checked={generalSettings.allowSelfAudit}
                    onCheckedChange={(checked) => setGeneralSettings({...generalSettings, allowSelfAudit: checked})}
                  />
                </div>
              </div>
              
              <Button onClick={() => handleSaveSettings('General')}>
                Save General Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Maria Rodriguez</TableCell>
                    <TableCell>audit.officer1@secureserve.gov</TableCell>
                    <TableCell><Badge>Audit Officer</Badge></TableCell>
                    <TableCell><Badge className="bg-green-500">Active</Badge></TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">Edit</Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>John Doe</TableCell>
                    <TableCell>auditor.jdoe@secureserve.gov</TableCell>
                    <TableCell><Badge>Auditor</Badge></TableCell>
                    <TableCell><Badge className="bg-green-500">Active</Badge></TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">Edit</Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Alice Smith</TableCell>
                    <TableCell>auditor.asmith@secureserve.gov</TableCell>
                    <TableCell><Badge>Auditor</Badge></TableCell>
                    <TableCell><Badge className="bg-green-500">Active</Badge></TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">Edit</Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>David Thompson</TableCell>
                    <TableCell>audit.manager1@secureserve.gov</TableCell>
                    <TableCell><Badge>Audit Manager</Badge></TableCell>
                    <TableCell><Badge className="bg-green-500">Active</Badge></TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">Edit</Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Activity Types Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Activity Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Default Duration (hrs)</TableHead>
                    <TableHead>Enabled</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activityTypes.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell className="font-medium">{type.name}</TableCell>
                      <TableCell>{type.description}</TableCell>
                      <TableCell>{type.duration}</TableCell>
                      <TableCell>
                        <Switch
                          checked={type.enabled}
                          onCheckedChange={(checked) => {
                            setActivityTypes(prev => prev.map(t => 
                              t.id === type.id ? {...t, enabled: checked} : t
                            ));
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">Edit</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button onClick={() => handleSaveSettings('Activity Types')} className="mt-4">
                Save Activity Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Risk Assessment Criteria</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Criteria</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Enabled</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {riskCriteria.map((criteria) => (
                    <TableRow key={criteria.id}>
                      <TableCell>{criteria.criteria}</TableCell>
                      <TableCell>
                        <Badge className={
                          criteria.weight === 'High' ? 'bg-red-500' :
                          criteria.weight === 'Medium' ? 'bg-orange-600' : 'bg-green-500'
                        }>
                          {criteria.weight}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={criteria.enabled}
                          onCheckedChange={(checked) => {
                            setRiskCriteria(prev => prev.map(c => 
                              c.id === criteria.id ? {...c, enabled: checked} : c
                            ));
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">Edit</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button onClick={() => handleSaveSettings('Risk Criteria')} className="mt-4">
                Save Risk Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Plan Submitted Notifications</Label>
                    <p className="text-sm text-muted-foreground">Notify managers when plans are submitted</p>
                  </div>
                  <Switch
                    checked={notifications.planSubmitted}
                    onCheckedChange={(checked) => setNotifications({...notifications, planSubmitted: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Plan Approved Notifications</Label>
                    <p className="text-sm text-muted-foreground">Notify officers when plans are approved</p>
                  </div>
                  <Switch
                    checked={notifications.planApproved}
                    onCheckedChange={(checked) => setNotifications({...notifications, planApproved: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Activity Reminders</Label>
                    <p className="text-sm text-muted-foreground">Send reminders before activities</p>
                  </div>
                  <Switch
                    checked={notifications.activityReminder}
                    onCheckedChange={(checked) => setNotifications({...notifications, activityReminder: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Overdue Follow-up Alerts</Label>
                    <p className="text-sm text-muted-foreground">Alert when follow-ups are overdue</p>
                  </div>
                  <Switch
                    checked={notifications.overdueFollowup}
                    onCheckedChange={(checked) => setNotifications({...notifications, overdueFollowup: checked})}
                  />
                </div>
              </div>
              
              <Button onClick={() => handleSaveSettings('Notifications')}>
                Save Notification Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Data Retention Period (years)</Label>
                <Input type="number" defaultValue="7" />
              </div>
              <div className="space-y-2">
                <Label>Session Timeout (minutes)</Label>
                <Input type="number" defaultValue="30" />
              </div>
              <div className="space-y-2">
                <Label>Password Policy</Label>
                <Textarea 
                  defaultValue="Minimum 8 characters, must include uppercase, lowercase, number, and special character"
                  readOnly
                />
              </div>
              
              <Button onClick={() => handleSaveSettings('Security')}>
                Save Security Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}