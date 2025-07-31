import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Users, Settings, History, Plus, Search, MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';

export default function SecuritySettings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('roles');
  const [isAssignRoleOpen, setIsAssignRoleOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [searchUsers, setSearchUsers] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('All Roles');

  // Mock data for users
  const users = [
    {
      id: '1',
      name: 'John Smith',
      email: 'admin@secureserve.gov',
      role: 'System Administrator',
      status: 'active',
      lastLogin: '2024-06-19 09:30',
      initials: 'JS'
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      email: 'hr@secureserve.gov',
      role: 'HR Manager',
      status: 'active',
      lastLogin: '2024-06-19 08:15',
      initials: 'SJ'
    },
    {
      id: '3',
      name: 'Michael Brown',
      email: 'compliance@secureserve.gov',
      role: 'Compliance Officer',
      status: 'active',
      lastLogin: '2024-06-18 16:45',
      initials: 'MB'
    },
    {
      id: '4',
      name: 'Emily Davis',
      email: 'benefits@secureserve.gov',
      role: 'Benefits Manager',
      status: 'active',
      lastLogin: '2024-06-19 07:20',
      initials: 'ED'
    },
    {
      id: '5',
      name: 'Robert Wilson',
      email: 'legal@secureserve.gov',
      role: 'Legal Officer',
      status: 'inactive',
      lastLogin: '2024-06-15 14:30',
      initials: 'RW'
    }
  ];

  // Mock data for roles
  const roles = [
    { name: 'System Administrator', count: 2, permissions: 95, color: 'bg-red-100 text-red-800' },
    { name: 'HR Manager', count: 5, permissions: 75, color: 'bg-blue-100 text-blue-800' },
    { name: 'Compliance Officer', count: 3, permissions: 60, color: 'bg-green-100 text-green-800' },
    { name: 'Benefits Manager', count: 4, permissions: 55, color: 'bg-purple-100 text-purple-800' },
    { name: 'Legal Officer', count: 2, permissions: 40, color: 'bg-orange-100 text-orange-800' }
  ];

  // Mock data for modules
  const modules = [
    {
      name: 'Dashboard',
      description: 'Main system dashboard and overviews',
      enabled: true,
      mfaRequired: false,
      publicAccess: false,
      securityLevel: 'Medium',
      auditLogging: 'Standard security protocols'
    },
    {
      name: 'Employer Management',
      description: 'Employer registration, approval, and directory',
      enabled: true,
      mfaRequired: false,
      publicAccess: false,
      securityLevel: 'Medium',
      auditLogging: 'Standard security protocols'
    },
    {
      name: 'Contribution Tracking',
      description: 'Contribution entry and tracking system',
      enabled: true,
      mfaRequired: true,
      publicAccess: false,
      securityLevel: 'Medium',
      auditLogging: 'Standard security protocols'
    },
    {
      name: 'Benefits Management',
      description: 'Benefits administration and processing',
      enabled: true,
      mfaRequired: false,
      publicAccess: false,
      securityLevel: 'Low',
      auditLogging: 'Basic security measures'
    },
    {
      name: 'Compliance & Audit',
      description: 'Compliance monitoring and audit trails',
      enabled: true,
      mfaRequired: true,
      publicAccess: false,
      securityLevel: 'Medium',
      auditLogging: 'Standard security protocols'
    },
    {
      name: 'Reports & Analytics',
      description: 'System reports and data analytics',
      enabled: true,
      mfaRequired: true,
      publicAccess: false,
      securityLevel: 'Medium',
      auditLogging: 'Standard security protocols'
    }
  ];

  // Mock data for audit log
  const auditLogs = [
    {
      id: '1',
      action: 'Permission updated for HR Manager role',
      user: 'System Administrator',
      timestamp: '2 hours ago',
      type: 'Permission Change'
    },
    {
      id: '2',
      action: 'Permission updated for HR Manager role',
      user: 'System Administrator',
      timestamp: '2 hours ago',
      type: 'Permission Change'
    },
    {
      id: '3',
      action: 'Permission updated for HR Manager role',
      user: 'System Administrator',
      timestamp: '2 hours ago',
      type: 'Permission Change'
    },
    {
      id: '4',
      action: 'Permission updated for HR Manager role',
      user: 'System Administrator',
      timestamp: '2 hours ago',
      type: 'Permission Change'
    },
    {
      id: '5',
      action: 'Permission updated for HR Manager role',
      user: 'System Administrator',
      timestamp: '2 hours ago',
      type: 'Permission Change'
    }
  ];

  const handleAssignRole = () => {
    // Handle role assignment logic here
    setIsAssignRoleOpen(false);
    setUserEmail('');
    setSelectedRole('');
  };

  const getRoleColor = (role: string) => {
    const roleColors: { [key: string]: string } = {
      'System Administrator': 'bg-red-100 text-red-800',
      'HR Manager': 'bg-blue-100 text-blue-800',
      'Compliance Officer': 'bg-green-100 text-green-800',
      'Benefits Manager': 'bg-purple-100 text-purple-800',
      'Legal Officer': 'bg-orange-100 text-orange-800'
    };
    return roleColors[role] || 'bg-gray-100 text-gray-800';
  };

  const getSecurityLevelColor = (level: string) => {
    switch (level) {
      case 'High': return 'text-red-600';
      case 'Medium': return 'text-yellow-600';
      case 'Low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <h1 className="text-2xl font-semibold">Security Settings</h1>
              </div>
              <p className="text-muted-foreground">Manage roles, permissions, and access controls</p>
            </div>
          </div>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Role
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
            <TabsTrigger value="assignment">User Assignment</TabsTrigger>
            <TabsTrigger value="modules">Module Settings</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
          </TabsList>

          {/* Roles & Permissions Tab */}
          <TabsContent value="roles" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* System Roles */}
              <Card>
                <CardHeader>
                  <CardTitle>System Roles</CardTitle>
                  <CardDescription>Manage roles and their permission levels</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {roles.map((role) => (
                    <div key={role.name} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{role.name}</h4>
                          <Badge variant="secondary">{role.count} users</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{role.permissions}% permissions</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Permission Matrix */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Permission Matrix</CardTitle>
                      <CardDescription>Configure granular permissions for the selected role</CardDescription>
                    </div>
                    <Badge className={getRoleColor('Legal Officer')}>Legal Officer</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span className="font-medium">Employer Management</span>
                      </div>
                      <ChevronDown className="h-4 w-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                      <p className="text-sm text-muted-foreground px-3">Manage employer registration and contributions</p>
                    </CollapsibleContent>
                  </Collapsible>

                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span className="font-medium">Insured Persons</span>
                      </div>
                      <ChevronDown className="h-4 w-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                      <p className="text-sm text-muted-foreground px-3">Manage insured person registration and data</p>
                    </CollapsibleContent>
                  </Collapsible>

                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        <span className="font-medium">Benefits</span>
                      </div>
                      <ChevronDown className="h-4 w-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                      <p className="text-sm text-muted-foreground px-3">Manage benefits claims and processing</p>
                    </CollapsibleContent>
                  </Collapsible>

                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        <span className="font-medium">Reports & Analytics</span>
                      </div>
                      <ChevronDown className="h-4 w-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                      <p className="text-sm text-muted-foreground px-3">Generate reports and analytics</p>
                    </CollapsibleContent>
                  </Collapsible>

                  <div className="pt-4">
                    <Button className="w-full bg-green-600 hover:bg-green-700">
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* User Assignment Tab */}
          <TabsContent value="assignment" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>User Role Assignment</CardTitle>
                    <CardDescription>Assign roles to users and manage their access permissions</CardDescription>
                  </div>
                  <Dialog open={isAssignRoleOpen} onOpenChange={setIsAssignRoleOpen}>
                    <DialogTrigger asChild>
                      <Button className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Assign Role
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Assign Role to User</DialogTitle>
                        <DialogDescription>
                          Select a user and assign them a specific role with defined permissions.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="user-email">User Email</Label>
                          <Input
                            id="user-email"
                            placeholder="Enter user email address"
                            value={userEmail}
                            onChange={(e) => setUserEmail(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="role-select">Role</Label>
                          <Select value={selectedRole} onValueChange={setSelectedRole}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                              {roles.map((role) => (
                                <SelectItem key={role.name} value={role.name}>
                                  {role.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAssignRoleOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleAssignRole}>
                          Assign Role
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users by name or email..."
                      value={searchUsers}
                      onChange={(e) => setSearchUsers(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={selectedRoleFilter} onValueChange={setSelectedRoleFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All Roles">All Roles</SelectItem>
                      {roles.map((role) => (
                        <SelectItem key={role.name} value={role.name}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">System Users ({users.length})</h3>
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {user.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{user.name}</h4>
                            <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                              {user.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          <p className="text-xs text-muted-foreground">Last login: {user.lastLogin}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={getRoleColor(user.role)}>
                          {user.role}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Role Distribution */}
                <div className="mt-8">
                  <h3 className="text-lg font-medium mb-4">Role Distribution</h3>
                  <p className="text-sm text-muted-foreground mb-6">Overview of user distribution across different roles</p>
                  <div className="grid grid-cols-5 gap-4">
                    {roles.map((role) => (
                      <div key={role.name} className="text-center p-4 border rounded-lg">
                        <div className="text-3xl font-bold">{role.count}</div>
                        <div className="text-sm font-medium mt-1">{role.name}</div>
                        <div className={`text-xs mt-1 ${getSecurityLevelColor('Medium')}`}>
                          {role.permissions}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Module Settings Tab */}
          <TabsContent value="modules" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Module Security Configuration</CardTitle>
                    <CardDescription>Configure security settings and access controls for each system module</CardDescription>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Shield className="h-4 w-4" />
                    Changes to module security settings will affect all users. Ensure proper testing before applying changes to production.
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {modules.map((module, index) => (
                  <div key={module.name} className="border rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Shield className="h-5 w-5 text-primary" />
                        <div>
                          <h3 className="font-medium">{module.name}</h3>
                          <p className="text-sm text-muted-foreground">{module.description}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Restore
                      </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-8">
                      {/* General */}
                      <div>
                        <h4 className="font-medium mb-3">General</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label htmlFor={`module-enabled-${index}`} className="text-sm">
                              Module Enabled
                            </Label>
                            <Switch
                              id={`module-enabled-${index}`}
                              checked={module.enabled}
                            />
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Enable or disable this module system-wide
                          </div>

                          <div className="flex items-center justify-between">
                            <Label htmlFor={`mfa-required-${index}`} className="text-sm">
                              Require Multi-Factor Authentication
                            </Label>
                            <Switch
                              id={`mfa-required-${index}`}
                              checked={module.mfaRequired}
                            />
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Require MFA for accessing this module
                          </div>

                          <div className="flex items-center justify-between">
                            <Label htmlFor={`public-access-${index}`} className="text-sm">
                              Public Access
                            </Label>
                            <Switch
                              id={`public-access-${index}`}
                              checked={module.publicAccess}
                            />
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Allow public access to certain features
                          </div>
                        </div>
                      </div>

                      {/* Permissions */}
                      <div>
                        <h4 className="font-medium mb-3">Permissions</h4>
                        <div className="space-y-3">
                          <div>
                            <Label className="text-sm">Security Level</Label>
                            <div className="mt-1">
                              <Badge variant={module.securityLevel === 'High' ? 'destructive' : module.securityLevel === 'Medium' ? 'default' : 'secondary'}>
                                {module.securityLevel}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {module.securityLevel === 'High' ? 'Enhanced security requirements' : 
                               module.securityLevel === 'Medium' ? 'Standard security protocols' : 
                               'Basic security measures'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Audit & Logging */}
                      <div>
                        <h4 className="font-medium mb-3">Audit & Logging</h4>
                        <div className="space-y-3">
                          <div>
                            <Label className="text-sm">Audit Level</Label>
                            <div className="mt-1">
                              <Badge variant="outline" className={getSecurityLevelColor(module.securityLevel)}>
                                {module.securityLevel}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {module.auditLogging}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="flex justify-between pt-6">
                  <Button variant="outline">
                    Reset to Defaults
                  </Button>
                  <Button className="bg-green-600 hover:bg-green-700">
                    Save All Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Log Tab */}
          <TabsContent value="audit" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Audit Log</CardTitle>
                <CardDescription>Track permission changes and security events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-4 border-l-4 border-l-blue-500 bg-blue-50/50 rounded">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <div>
                          <p className="font-medium">{log.action}</p>
                          <p className="text-sm text-muted-foreground">
                            Modified by {log.user} • {log.timestamp}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {log.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}