
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Plus, Edit, Trash2, Shield, Users, Key } from 'lucide-react';

const ManageRoles = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const roles = [
    { id: 1, name: 'Super Admin', description: 'Full system access', users: 2, permissions: 25, status: 'Active' },
    { id: 2, name: 'Compliance Manager', description: 'Manage compliance operations', users: 5, permissions: 18, status: 'Active' },
    { id: 3, name: 'Compliance Officer', description: 'Handle compliance tasks', users: 12, permissions: 12, status: 'Active' },
    { id: 4, name: 'Registration Officer', description: 'Process registrations', users: 8, permissions: 10, status: 'Active' },
    { id: 5, name: 'Auditor', description: 'Conduct audits and inspections', users: 6, permissions: 8, status: 'Active' },
    { id: 6, name: 'Viewer', description: 'Read-only access', users: 15, permissions: 3, status: 'Active' }
  ];

  const users = [
    { id: 1, name: 'John Smith', email: 'john.smith@gov.ss', role: 'Super Admin', status: 'Active', lastLogin: '2024-01-25' },
    { id: 2, name: 'Jane Doe', email: 'jane.doe@gov.ss', role: 'Compliance Manager', status: 'Active', lastLogin: '2024-01-25' },
    { id: 3, name: 'Mike Johnson', email: 'mike.johnson@gov.ss', role: 'Compliance Officer', status: 'Active', lastLogin: '2024-01-24' },
    { id: 4, name: 'Sarah Wilson', email: 'sarah.wilson@gov.ss', role: 'Registration Officer', status: 'Active', lastLogin: '2024-01-24' },
    { id: 5, name: 'David Brown', email: 'david.brown@gov.ss', role: 'Auditor', status: 'Inactive', lastLogin: '2024-01-20' }
  ];

  const permissions = [
    { id: 1, name: 'manage_employers', description: 'Create, edit, and delete employers', category: 'Employers' },
    { id: 2, name: 'view_financial_data', description: 'Access financial reports and data', category: 'Financial' },
    { id: 3, name: 'manage_compliance', description: 'Handle compliance operations', category: 'Compliance' },
    { id: 4, name: 'conduct_inspections', description: 'Perform on-site inspections', category: 'Inspections' },
    { id: 5, name: 'generate_reports', description: 'Create and export reports', category: 'Reports' },
    { id: 6, name: 'manage_users', description: 'Create and manage user accounts', category: 'Users' },
    { id: 7, name: 'system_admin', description: 'System administration access', category: 'System' },
    { id: 8, name: 'view_guidelines', description: 'Access guidelines and documentation', category: 'Documentation' }
  ];

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                <span className="text-gray-900 font-medium">Manage Roles</span>
              </nav>
            </div>
            <div className="flex items-center space-x-2">
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Role
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Manage Roles & Permissions</h1>
          <p className="text-gray-600">Manage user roles and permissions for the system (Admin only)</p>
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search roles, users, or permissions..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Tabs defaultValue="roles" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
          </TabsList>

          <TabsContent value="roles" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-500" />
                  System Roles
                </CardTitle>
                <CardDescription>Manage user roles and their permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Users</TableHead>
                      <TableHead>Permissions</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRoles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell className="font-medium">{role.name}</TableCell>
                        <TableCell>{role.description}</TableCell>
                        <TableCell>{role.users}</TableCell>
                        <TableCell>{role.permissions}</TableCell>
                        <TableCell>
                          <Badge variant="default">{role.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" title="Edit Role">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" title="Delete Role">
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

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-500" />
                  System Users
                </CardTitle>
                <CardDescription>Manage user accounts and role assignments</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.role}</TableCell>
                        <TableCell>
                          <Badge variant={user.status === 'Active' ? 'default' : 'secondary'}>
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{user.lastLogin}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" title="Edit User">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" title="Delete User">
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

          <TabsContent value="permissions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5 text-purple-500" />
                  System Permissions
                </CardTitle>
                <CardDescription>Available permissions in the system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {permissions.map((permission) => (
                    <div key={permission.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{permission.name}</h4>
                        <Badge variant="outline">{permission.category}</Badge>
                      </div>
                      <p className="text-sm text-gray-600">{permission.description}</p>
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

export default ManageRoles;
