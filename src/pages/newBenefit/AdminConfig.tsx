import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Settings, Plus, Edit, Trash2, Save, Users, Shield, FileText, Calculator, Database } from 'lucide-react';

const AdminConfig = () => {
  const [editingRate, setEditingRate] = useState<string | null>(null);

  const configRates = [
    { id: '1', name: 'Sickness Benefit Rate', value: '75%', type: 'Percentage', category: 'Benefits' },
    { id: '2', name: 'Maximum Weekly Benefit', value: '$600.00', type: 'Currency', category: 'Benefits' },
    { id: '3', name: 'Minimum Contribution Weeks (Age Pension)', value: '500', type: 'Number', category: 'Eligibility' },
    { id: '4', name: 'Waiting Days (Sickness)', value: '3', type: 'Number', category: 'Benefits' },
    { id: '5', name: 'Maternity Benefit Period', value: '13', type: 'Number', category: 'Benefits' },
    { id: '6', name: 'Funeral Grant Amount', value: '$2,500.00', type: 'Currency', category: 'Benefits' },
    { id: '7', name: 'Age Pension Minimum Age', value: '62', type: 'Number', category: 'Eligibility' },
    { id: '8', name: 'Survivor Pension Rate (Spouse)', value: '60%', type: 'Percentage', category: 'Benefits' }
  ];

  const users = [
    { id: '1', username: 'claims_officer1', role: 'CLAIMS_OFFICER', name: 'Mary Officer', email: 'mary@ssb.gov.kn', active: true },
    { id: '2', username: 'supervisor1', role: 'SUPERVISOR', name: 'Robert Supervisor', email: 'robert@ssb.gov.kn', active: true },
    { id: '3', username: 'payments1', role: 'PAYMENTS_OFFICER', name: 'Linda Payments', email: 'linda@ssb.gov.kn', active: true },
    { id: '4', username: 'medical1', role: 'MEDICAL_COORDINATOR', name: 'Dr. James Medical', email: 'james@ssb.gov.kn', active: false }
  ];

  const auditPolicies = [
    { id: '1', policy: 'Claim Access Logging', description: 'Log all claim views and edits', enabled: true },
    { id: '2', policy: 'Document View Tracking', description: 'Track document downloads and views', enabled: true },
    { id: '3', policy: 'Payment Authorization', description: 'Log all payment authorizations', enabled: true },
    { id: '4', policy: 'Status Change Alerts', description: 'Alert on claim status changes', enabled: false },
    { id: '5', policy: 'PII Access Control', description: 'Enhanced logging for sensitive data access', enabled: true }
  ];

  const eligibilityRules = `# Sickness Benefit Eligibility Rules
eligibility:
  sickness:
    minimum_weeks: 13
    recent_weeks: 8
    waiting_days: 3
    max_duration: 26
    conditions:
      - medical_certificate_required: true
      - employer_notification: true
      - last_day_worked_required: true

# Age Pension Eligibility Rules  
  age_pension:
    minimum_age: 62
    minimum_weeks: 500
    conditions:
      - continuous_residence: true
      - retirement_confirmed: true

# Employment Injury Eligibility
  employment_injury:
    immediate_coverage: true
    no_waiting_period: true
    conditions:
      - incident_reported: true
      - employer_confirmation: true
      - work_related: true`;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin & Configuration</h1>
          <p className="text-muted-foreground">Manage system settings, rates, and rules</p>
        </div>
      </div>

      <Tabs defaultValue="rates" className="space-y-6">
        <TabsList>
          <TabsTrigger value="rates">Benefit Rates</TabsTrigger>
          <TabsTrigger value="rules">Rules Engine</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="audit">Audit Policies</TabsTrigger>
          <TabsTrigger value="system">System Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="rates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Configuration Rates & Schedules</CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Rate
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Configuration Rate</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Rate Name</Label>
                        <Input placeholder="Enter rate name" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Value</Label>
                          <Input placeholder="Enter value" />
                        </div>
                        <div>
                          <Label>Type</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percentage">Percentage</SelectItem>
                              <SelectItem value="currency">Currency</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="days">Days</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label>Category</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="benefits">Benefits</SelectItem>
                            <SelectItem value="eligibility">Eligibility</SelectItem>
                            <SelectItem value="system">System</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea placeholder="Rate description and usage" />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline">Cancel</Button>
                        <Button>Save Rate</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rate Name</TableHead>
                    <TableHead>Current Value</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configRates.map((rate) => (
                    <TableRow key={rate.id}>
                      <TableCell className="font-medium">{rate.name}</TableCell>
                      <TableCell>
                        {editingRate === rate.id ? (
                          <Input defaultValue={rate.value} className="w-32" />
                        ) : (
                          rate.value
                        )}
                      </TableCell>
                      <TableCell>{rate.type}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{rate.category}</Badge>
                      </TableCell>
                      <TableCell>2024-01-15</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {editingRate === rate.id ? (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => setEditingRate(null)}>
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setEditingRate(null)}>
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <Button variant="ghost" size="sm" onClick={() => setEditingRate(rate.id)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Eligibility & Calculation Rules Engine</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <Label>Eligibility Rules (YAML)</Label>
                  <Textarea 
                    className="min-h-[400px] font-mono text-sm"
                    value={eligibilityRules}
                  />
                </div>
                <div>
                  <Label>Calculation Rules (YAML)</Label>
                  <Textarea 
                    className="min-h-[400px] font-mono text-sm"
                    defaultValue="# Benefit Calculation Rules
calculation:
  sickness:
    rate: 0.75  # 75% of AWW
    maximum: 600.00
    minimum: 50.00
    cap_at_insurable_earnings: true
  
  maternity:
    rate: 1.0  # 100% of AWW
    weeks: 13
    maximum: 600.00
  
  age_pension:
    base_rate: 0.015  # 1.5% per year
    maximum_years: 40
    minimum_pension: 300.00"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline">Validate Rules</Button>
                <Button variant="outline">Test Rules</Button>
                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Deploy Rules
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>User & Role Management</CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add User
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New User</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Username</Label>
                          <Input placeholder="Enter username" />
                        </div>
                        <div>
                          <Label>Role</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CLAIMS_OFFICER">Claims Officer</SelectItem>
                              <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                              <SelectItem value="PAYMENTS_OFFICER">Payments Officer</SelectItem>
                              <SelectItem value="MEDICAL_COORDINATOR">Medical Coordinator</SelectItem>
                              <SelectItem value="EMPLOYER_LIAISON">Employer Liaison</SelectItem>
                              <SelectItem value="ADMIN">Admin</SelectItem>
                              <SelectItem value="AUDITOR">Auditor</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>First Name</Label>
                          <Input placeholder="Enter first name" />
                        </div>
                        <div>
                          <Label>Last Name</Label>
                          <Input placeholder="Enter last name" />
                        </div>
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input placeholder="Enter email address" />
                      </div>
                      <div>
                        <Label>Temporary Password</Label>
                        <Input type="password" placeholder="Enter temporary password" />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline">Cancel</Button>
                        <Button>Create User</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>
                        <Badge>{user.role.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.active ? 'default' : 'secondary'}>
                          {user.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Shield className="h-4 w-4" />
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

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Policy Management</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Policy</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditPolicies.map((policy) => (
                    <TableRow key={policy.id}>
                      <TableCell className="font-medium">{policy.policy}</TableCell>
                      <TableCell>{policy.description}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch checked={policy.enabled} />
                          <span className={policy.enabled ? 'text-green-600' : 'text-gray-400'}>
                            {policy.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>System Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>System Name</Label>
                  <Input value="Social Security Benefits System" />
                </div>
                <div>
                  <Label>Default Language</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="English" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Session Timeout (minutes)</Label>
                  <Input value="30" />
                </div>
                <div>
                  <Label>Max File Upload Size (MB)</Label>
                  <Input value="10" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Database Maintenance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <Database className="h-4 w-4 mr-2" />
                    Run Database Cleanup
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Database className="h-4 w-4 mr-2" />
                    Archive Old Records
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Database className="h-4 w-4 mr-2" />
                    Generate System Report
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Database className="h-4 w-4 mr-2" />
                    Backup Configuration
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminConfig;