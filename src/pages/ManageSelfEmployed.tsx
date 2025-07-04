
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Filter, Plus, Eye, Edit, Trash2 } from 'lucide-react';

const ManageSelfEmployed = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const selfEmployedData = [
    { id: 'SE001', name: 'John Smith', business: 'Freelance Consultant', village: 'Central Village', status: 'Active', registeredDate: '2024-01-15', inspector: 'Jane Doe' },
    { id: 'SE002', name: 'Mary Johnson', business: 'Local Bakery', village: 'North Village', status: 'Active', registeredDate: '2024-01-10', inspector: 'Mike Wilson' },
    { id: 'SE003', name: 'Robert Brown', business: 'Taxi Service', village: 'South Village', status: 'Inactive', registeredDate: '2024-01-08', inspector: 'Sarah Davis' },
    { id: 'SE004', name: 'Lisa Wilson', business: 'Hair Salon', village: 'East Village', status: 'Active', registeredDate: '2024-01-05', inspector: 'John Smith' },
    { id: 'SE005', name: 'David Miller', business: 'Carpentry', village: 'West Village', status: 'Pending', registeredDate: '2024-01-20', inspector: 'Jane Doe' },
  ];

  const filteredData = selfEmployedData.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.business.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.village.toLowerCase().includes(searchTerm.toLowerCase())
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
                onClick={() => navigate("/")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <nav className="flex items-center space-x-2 text-sm text-gray-500">
                <span>Self-Employed Management</span>
                <span>/</span>
                <span className="text-gray-900 font-medium">Manage Self-Employed</span>
              </nav>
            </div>
            <div className="flex items-center space-x-2">
              <Button onClick={() => navigate("/self-employed/add")} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add New Self-Employed
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Manage Self-Employed</h1>
          <p className="text-gray-600">Search, filter, and manage self-employed individuals in the system</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Search & Filter</CardTitle>
            <CardDescription>Use the filters below to find specific self-employed individuals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, business, or village..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filter by Village
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filter by Status
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filter by Inspector
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Self-Employed Listings</CardTitle>
            <CardDescription>
              Showing {filteredData.length} of {selfEmployedData.length} self-employed individuals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Village</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registered Date</TableHead>
                  <TableHead>Inspector</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((person) => (
                  <TableRow key={person.id}>
                    <TableCell className="font-medium">{person.id}</TableCell>
                    <TableCell>{person.name}</TableCell>
                    <TableCell>{person.business}</TableCell>
                    <TableCell>{person.village}</TableCell>
                    <TableCell>
                      <Badge variant={
                        person.status === 'Active' ? 'default' :
                        person.status === 'Pending' ? 'secondary' : 'destructive'
                      }>
                        {person.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{person.registeredDate}</TableCell>
                    <TableCell>{person.inspector}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" title="View Details">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Edit">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Cease/Delete">
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
      </div>
    </div>
  );
};

export default ManageSelfEmployed;
