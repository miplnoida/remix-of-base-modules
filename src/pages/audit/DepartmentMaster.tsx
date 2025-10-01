import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Edit, Eye, Building2 } from 'lucide-react';
import { departments } from '@/data/auditData';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

export default function DepartmentMaster() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.head.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRiskBadge = (risk?: string) => {
    if (!risk) return null;
    const colors = {
      'High': 'bg-red-500',
      'Medium': 'bg-orange-600',
      'Low': 'bg-green-500'
    };
    return <Badge className={colors[risk as keyof typeof colors] || 'bg-gray-500'}>{risk}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Department Master</h1>
          <p className="text-muted-foreground">
            Manage SSB department information for audit planning |
            <Link to="/" className="text-blue-600 hover:underline ml-1">← Back to Dashboard</Link>
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Department
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Department</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Department Name</Label>
                <Input placeholder="e.g., Benefits Department" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Department Head</Label>
                  <Input placeholder="Full name" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" placeholder="head@ssb.kn" />
                </div>
              </div>
              <div>
                <Label>Location</Label>
                <Input placeholder="e.g., Main Building - Floor 2" />
              </div>
              <div>
                <Label>Risk Rating</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select risk rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline">Cancel</Button>
                <Button onClick={() => toast({ 
                  title: "Department Added", 
                  description: "New department has been added to the master list" 
                })}>
                  Save Department
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Departments</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departments.length}</div>
            <p className="text-xs text-muted-foreground">SSB departments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk</CardTitle>
            <Building2 className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {departments.filter(d => d.riskRating === 'High').length}
            </div>
            <p className="text-xs text-muted-foreground">Priority audits</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Medium Risk</CardTitle>
            <Building2 className="h-4 w-4 text-orange-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {departments.filter(d => d.riskRating === 'Medium').length}
            </div>
            <p className="text-xs text-muted-foreground">Regular audits</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Risk</CardTitle>
            <Building2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {departments.filter(d => d.riskRating === 'Low').length}
            </div>
            <p className="text-xs text-muted-foreground">Periodic audits</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by department name or head..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Departments Table */}
      <Card>
        <CardHeader>
          <CardTitle>SSB Departments ({filteredDepartments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department Name</TableHead>
                <TableHead>Department Head</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Risk Rating</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDepartments.map((dept) => (
                <TableRow key={dept.id}>
                  <TableCell className="font-medium">{dept.name}</TableCell>
                  <TableCell>{dept.head}</TableCell>
                  <TableCell>{dept.email}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{dept.location}</TableCell>
                  <TableCell>{getRiskBadge(dept.riskRating)}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Department Risk Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Department Risk Assessment Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground mb-4">
              Risk ratings guide audit frequency and resource allocation
            </div>
            {departments.map((dept) => (
              <div key={dept.id} className="flex items-center justify-between py-2 border-b">
                <div className="flex-1">
                  <div className="font-medium">{dept.name}</div>
                  <div className="text-sm text-muted-foreground">{dept.head}</div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">{dept.location}</span>
                  {getRiskBadge(dept.riskRating)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
