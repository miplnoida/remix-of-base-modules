import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Shield, Users, Settings, Plus, Edit, Trash2, Eye, Download, UserPlus, Copy } from 'lucide-react';
import RolePermissionMatrix from '@/components/security/RolePermissionMatrix';
import UserRoleAssignment from '@/components/security/UserRoleAssignment';
import ModulePermissions from '@/components/security/ModulePermissions';

const SecuritySettings = () => {
  const [selectedRole, setSelectedRole] = useState('system-admin');
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
  const [isCloneRoleOpen, setIsCloneRoleOpen] = useState(false);
  const [roleToClone, setRoleToClone] = useState<string>('');

  const roles = [
    {
      id: 'system-admin',
      name: 'System Administrator',
      description: 'Full system access and administration',
      users: 2,
      color: 'bg-red-100 text-red-800',
      permissions: 95
    },
    {
      id: 'hr-manager',
      name: 'HR Manager',
      description: 'Human resources management access',
      users: 5,
      color: 'bg-blue-100 text-blue-800',
      permissions: 75
    },
    {
      id: 'compliance-officer',
      name: 'Compliance Officer',
      description: 'Compliance monitoring and audit access',
      users: 3,
      color: 'bg-green-100 text-green-800',
      permissions: 60
    },
    {
      id: 'benefits-manager',
      name: 'Benefits Manager',
      description: 'Benefits administration access',
      users: 4,
      color: 'bg-purple-100 text-purple-800',
      permissions: 55
    },
    {
      id: 'legal-officer',
      name: 'Legal Officer',
      description: 'Legal compliance and documentation access',
      users: 2,
      color: 'bg-orange-100 text-orange-800',
      permissions: 40
    }
  ];

  const modules = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      icon: Shield,
      description: 'Main system dashboard and overview'
    },
    {
      id: 'employer-management',
      name: 'Employer Management',
      icon: Users,
      description: 'Employer registration, approval, and directory'
    },
    {
      id: 'contribution-tracking',
      name: 'Contribution Tracking',
      icon: Settings,
      description: 'Contribution entry and tracking system'
    },
    {
      id: 'benefits-management',
      name: 'Benefits Management',
      icon: UserPlus,
      description: 'Benefits administration and processing'
    },
    {
      id: 'compliance-audit',
      name: 'Compliance & Audit',
      icon: Eye,
      description: 'Compliance monitoring and audit trails'
    },
    {
      id: 'reports-analytics',
      name: 'Reports & Analytics',
      icon: Download,
      description: 'System reports and data analytics'
    }
  ];

  const handleCloneRole = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (role) {
      setRoleToClone(roleId);
      setIsCloneRoleOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Shield className="h-6 w-6 text-blue-600" />
                Security Settings
              </h1>
              <p className="text-gray-600 mt-1">Manage roles, permissions, and access controls</p>
            </div>
            <div className="flex gap-3">
              <Dialog open={isCreateRoleOpen} onOpenChange={setIsCreateRoleOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Role
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Role</DialogTitle>
                    <DialogDescription>
                      Define a new role with specific permissions and access levels.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="role-name">Role Name</Label>
                      <Input id="role-name" placeholder="Enter role name" />
                    </div>
                    <div>
                      <Label htmlFor="role-description">Description</Label>
                      <Input id="role-description" placeholder="Describe the role's purpose" />
                    </div>
                    <div>
                      <Label htmlFor="role-level">Access Level</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select access level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full">Full Access</SelectItem>
                          <SelectItem value="limited">Limited Access</SelectItem>
                          <SelectItem value="read-only">Read Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsCreateRoleOpen(false)}>
                      Cancel
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      Create Role
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Clone Role Dialog */}
              <Dialog open={isCloneRoleOpen} onOpenChange={setIsCloneRoleOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Clone Role</DialogTitle>
                    <DialogDescription>
                      Create a new role based on {roles.find(r => r.id === roleToClone)?.name} with all its permissions.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="clone-role-name">New Role Name</Label>
                      <Input 
                        id="clone-role-name" 
                        placeholder="Enter new role name" 
                        defaultValue={`${roles.find(r => r.id === roleToClone)?.name} - Copy`}
                      />
                    </div>
                    <div>
                      <Label htmlFor="clone-role-description">Description</Label>
                      <Input 
                        id="clone-role-description" 
                        placeholder="Describe the role's purpose"
                        defaultValue={roles.find(r => r.id === roleToClone)?.description}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsCloneRoleOpen(false)}>
                      Cancel
                    </Button>
                    <Button className="bg-green-600 hover:bg-green-700">
                      Clone Role
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="roles" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
            <TabsTrigger value="users">User Assignment</TabsTrigger>
            <TabsTrigger value="modules">Module Settings</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
          </TabsList>

          <TabsContent value="roles" className="space-y-6">
            <div className="grid grid-cols-12 gap-6">
              {/* Roles List */}
              <div className="col-span-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">System Roles</CardTitle>
                    <CardDescription>
                      Manage roles and their permission levels
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {roles.map((role) => (
                      <div
                        key={role.id}
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                          selectedRole === role.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedRole(role.id)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium text-gray-900">{role.name}</h3>
                          <Badge className={role.color}>{role.users} users</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{role.description}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">
                            {role.permissions}% permissions
                          </span>
                          <div className="flex gap-1">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCloneRole(role.id);
                              }}
                              title="Clone role"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Permission Matrix */}
              <div className="col-span-8">
                <RolePermissionMatrix 
                  selectedRole={selectedRole}
                  roles={roles}
                  modules={modules}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <UserRoleAssignment roles={roles} />
          </TabsContent>

          <TabsContent value="modules" className="space-y-6">
            <ModulePermissions modules={modules} />
          </TabsContent>

          <TabsContent value="audit" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Audit Log</CardTitle>
                <CardDescription>
                  Track permission changes and security events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((item) => (
                    <div key={item} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                        <div>
                          <p className="font-medium">Permission updated for HR Manager role</p>
                          <p className="text-sm text-gray-600">
                            Modified by System Administrator • 2 hours ago
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">Permission Change</Badge>
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
};

export default SecuritySettings;
