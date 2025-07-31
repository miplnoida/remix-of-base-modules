
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, UserPlus, Edit, Trash2, Mail } from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string;
  users: number;
  color: string;
  permissions: number;
}

interface UserRoleAssignmentProps {
  roles: Role[];
}

const UserRoleAssignment: React.FC<UserRoleAssignmentProps> = ({ roles }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [isAssignRoleOpen, setIsAssignRoleOpen] = useState(false);

  const users = [
    {
      id: 'user001',
      name: 'John Smith',
      email: 'admin@secureserve.gov',
      role: 'system-admin',
      status: 'active',
      lastLogin: '2024-06-19 09:30',
      initials: 'JS'
    },
    {
      id: 'user002',
      name: 'Sarah Johnson',
      email: 'hr@secureserve.gov',
      role: 'hr-manager',
      status: 'active',
      lastLogin: '2024-06-19 08:15',
      initials: 'SJ'
    },
    {
      id: 'user003',
      name: 'Michael Brown',
      email: 'compliance@secureserve.gov',
      role: 'compliance-officer',
      status: 'active',
      lastLogin: '2024-06-18 16:45',
      initials: 'MB'
    },
    {
      id: 'user004',
      name: 'Emily Davis',
      email: 'benefits@secureserve.gov',
      role: 'benefits-manager',
      status: 'active',
      lastLogin: '2024-06-19 07:20',
      initials: 'ED'
    },
    {
      id: 'user005',
      name: 'Robert Wilson',
      email: 'legal@secureserve.gov',
      role: 'legal-officer',
      status: 'inactive',
      lastLogin: '2024-06-15 14:30',
      initials: 'RW'
    }
  ];

  const getRoleData = (roleId: string) => {
    return roles.find(role => role.id === roleId);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* User Management Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>User Role Assignment</CardTitle>
              <CardDescription>
                Assign roles to users and manage their access permissions
              </CardDescription>
            </div>
            <Dialog open={isAssignRoleOpen} onOpenChange={setIsAssignRoleOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <UserPlus className="h-4 w-4 mr-2" />
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
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium">User Email</label>
                    <Input placeholder="Enter user email address" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Role</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map(role => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAssignRoleOpen(false)}>
                    Cancel
                  </Button>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    Assign Role
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map(role => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">System Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.map((user) => {
              const roleData = getRoleData(user.role);
              return (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarFallback className="bg-blue-100 text-blue-700">
                        {user.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{user.name}</h3>
                        <Badge 
                          variant={user.status === 'active' ? 'default' : 'secondary'}
                          className={user.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                        >
                          {user.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="h-3 w-3" />
                        {user.email}
                      </div>
                      <p className="text-xs text-gray-500">Last login: {user.lastLogin}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {roleData && (
                      <Badge className={roleData.color}>
                        {roleData.name}
                      </Badge>
                    )}
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Role Distribution Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Role Distribution</CardTitle>
          <CardDescription>
            Overview of user distribution across different roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {roles.map((role) => (
              <div key={role.id} className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{role.users}</div>
                <div className="text-sm text-gray-600">{role.name}</div>
                <Badge className={`${role.color} mt-2`} variant="secondary">
                  {((role.users / users.length) * 100).toFixed(0)}%
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserRoleAssignment;
