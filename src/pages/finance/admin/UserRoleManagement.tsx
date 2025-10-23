import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Users, Plus, Edit, Shield, Clock } from 'lucide-react';

const UserRoleManagement = () => {
  const [users, setUsers] = useState([
    { id: 1, name: 'Jane Doe', email: 'jane@ssb.gov', role: 'Cashier', modules: ['Payment Entry', 'Receipt'], status: 'active', lastLogin: '2025-10-23 10:45' },
    { id: 2, name: 'John Smith', email: 'john@ssb.gov', role: 'Supervisor', modules: ['All Cashier', 'Approvals'], status: 'active', lastLogin: '2025-10-23 09:30' },
    { id: 3, name: 'Mary Johnson', email: 'mary@ssb.gov', role: 'Admin', modules: ['Full System'], status: 'active', lastLogin: '2025-10-22 16:20' },
    { id: 4, name: 'Bob Wilson', email: 'bob@ssb.gov', role: 'Inspector', modules: ['Field Work', 'Reports'], status: 'active', lastLogin: '2025-10-23 08:15' },
  ]);

  const roles = ['Cashier', 'Supervisor', 'Admin', 'Inspector', 'Auditor', 'Finance Clerk'];

  const modules = {
    'Cashier': ['Open Batch', 'Payment Entry', 'Receipt Generation', 'Close Batch'],
    'Supervisor': ['All Cashier', 'Batch Approval', 'Reprint/Cancel', 'Reports'],
    'Admin': ['User Management', 'System Config', 'All Modules'],
    'Inspector': ['Field Activities', 'Scouting', 'Inspection Reports'],
    'Auditor': ['Audit Log', 'Compliance Review', 'Analytics'],
    'Finance Clerk': ['Invoice Creation', 'GL Mapping', 'SAGE Export'],
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
            User Role Management
          </h1>
          <p className="text-muted-foreground mt-1">Manage user access and permissions</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-primary/80">
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input placeholder="Enter full name" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" placeholder="user@ssb.gov" />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role} value={role}>{role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Office</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select office" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basseterre">Basseterre</SelectItem>
                      <SelectItem value="charlestown">Charlestown</SelectItem>
                      <SelectItem value="sandy">Sandy Point</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Module Access</Label>
                <div className="grid grid-cols-2 gap-2 p-4 border border-border rounded-lg">
                  {['Payment Entry', 'Receipt Generation', 'Invoice Creation', 'GL Mapping', 'Reports', 'Admin Config'].map((module) => (
                    <div key={module} className="flex items-center gap-2">
                      <Switch />
                      <span className="text-sm">{module}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button className="w-full" onClick={() => {
                toast.success('User created successfully');
              }}>
                Create User
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Users', value: users.length, icon: Users, color: 'text-blue-600' },
          { label: 'Active Today', value: users.filter(u => u.status === 'active').length, icon: Users, color: 'text-green-600' },
          { label: 'Cashiers', value: users.filter(u => u.role === 'Cashier').length, icon: Shield, color: 'text-purple-600' },
          { label: 'Admins', value: users.filter(u => u.role === 'Admin').length, icon: Shield, color: 'text-orange-600' },
        ].map((stat, index) => (
          <Card key={index} className="border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <h3 className="text-3xl font-bold mt-2">{stat.value}</h3>
                </div>
                <stat.icon className={`h-10 w-10 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Users Table */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>User Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Module Access</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <p className="font-semibold">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.modules.map((module, idx) => (
                        <span key={idx} className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                          {module}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      user.status === 'active' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
                    }`}>
                      {user.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {user.lastLogin}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => toast.info(`Editing ${user.name}`)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Role Permissions Matrix */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Role Permissions Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {roles.map((role) => (
              <div key={role} className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg">{role}</h3>
                  <Button size="sm" variant="outline" onClick={() => toast.info(`Configuring ${role} role`)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Configure
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {modules[role].map((module, idx) => (
                    <Badge key={idx} variant="secondary">{module}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserRoleManagement;
