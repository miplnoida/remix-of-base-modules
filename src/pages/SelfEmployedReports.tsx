
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileText, Search } from 'lucide-react';

const SelfEmployedReports = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const registeredSelfEmployed = [
    { id: 'SE001', name: 'John Smith', business: 'Freelance Consultant', village: 'Central Village', status: 'Active', registeredDate: '2024-01-15' },
    { id: 'SE002', name: 'Mary Johnson', business: 'Local Bakery', village: 'North Village', status: 'Active', registeredDate: '2024-01-10' },
    { id: 'SE004', name: 'Lisa Wilson', business: 'Hair Salon', village: 'East Village', status: 'Active', registeredDate: '2024-01-05' },
  ];

  const inactiveSelfEmployed = [
    { id: 'SE003', name: 'Robert Brown', business: 'Taxi Service', village: 'South Village', status: 'Inactive', ceasedDate: '2024-01-20', reason: 'Business Closure' },
    { id: 'SE006', name: 'Mike Davis', business: 'Photography', village: 'West Village', status: 'Ceased', ceasedDate: '2024-01-18', reason: 'Relocated' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/self-employed/manage")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Self-Employed
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <nav className="flex items-center space-x-2 text-sm text-gray-500">
                <span>Self-Employed Management</span>
                <span>/</span>
                <span className="text-gray-900 font-medium">Reports</span>
              </nav>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export PDF
              </Button>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Export Excel
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Self-Employed Reports</h1>
          <p className="text-gray-600">Generate and view reports for registered and ceased self-employed individuals</p>
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search self-employed..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Tabs defaultValue="registered" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="registered">Registered Self-Employed</TabsTrigger>
            <TabsTrigger value="inactive">Ceased/Inactive Self-Employed</TabsTrigger>
          </TabsList>

          <TabsContent value="registered" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Registered Self-Employed Report</CardTitle>
                <CardDescription>List of all active self-employed individuals</CardDescription>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registeredSelfEmployed.map((person) => (
                      <TableRow key={person.id}>
                        <TableCell className="font-medium">{person.id}</TableCell>
                        <TableCell>{person.name}</TableCell>
                        <TableCell>{person.business}</TableCell>
                        <TableCell>{person.village}</TableCell>
                        <TableCell>
                          <Badge variant="default">{person.status}</Badge>
                        </TableCell>
                        <TableCell>{person.registeredDate}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inactive" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Ceased/Inactive Self-Employed</CardTitle>
                <CardDescription>List of self-employed individuals who have ceased operations</CardDescription>
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
                      <TableHead>Ceased Date</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inactiveSelfEmployed.map((person) => (
                      <TableRow key={person.id}>
                        <TableCell className="font-medium">{person.id}</TableCell>
                        <TableCell>{person.name}</TableCell>
                        <TableCell>{person.business}</TableCell>
                        <TableCell>{person.village}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{person.status}</Badge>
                        </TableCell>
                        <TableCell>{person.ceasedDate}</TableCell>
                        <TableCell>{person.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SelfEmployedReports;
