
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AuditManagementForm } from '@/components/compliance/AuditManagementForm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Calendar, Users, AlertTriangle } from 'lucide-react';

const AuditManagement = () => {
  const navigate = useNavigate();

  const auditSchedule = [
    { id: 'A-2024-001', employer: 'ABC Manufacturing', type: 'Routine', date: '2024-02-15', status: 'Scheduled', auditor: 'John Smith' },
    { id: 'A-2024-002', employer: 'XYZ Services', type: 'Risk-based', date: '2024-02-20', status: 'In Progress', auditor: 'Jane Doe' },
    { id: 'A-2024-003', employer: 'Tech Solutions', type: 'Follow-up', date: '2024-02-25', status: 'Completed', auditor: 'Mike Johnson' }
  ];

  const auditMetrics = [
    { label: 'Scheduled Audits', value: '12', icon: Calendar },
    { label: 'In Progress', value: '5', icon: FileText },
    { label: 'Completed This Month', value: '23', icon: Users },
    { label: 'High Risk Cases', value: '3', icon: AlertTriangle }
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
                onClick={() => navigate("/compliance/dashboard")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Compliance
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <nav className="flex items-center space-x-2 text-sm text-gray-500">
                <span>Compliance & Audit</span>
                <span>/</span>
                <span className="text-gray-900 font-medium">Audit Management</span>
              </nav>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Audit Management</h1>
          <p className="text-gray-600">Schedule, conduct, and track compliance audits</p>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {auditMetrics.map((metric, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
                <metric.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="schedule" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="schedule">Audit Schedule</TabsTrigger>
            <TabsTrigger value="create">Create Audit</TabsTrigger>
            <TabsTrigger value="reports">Audit Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Audit Schedule</CardTitle>
                <CardDescription>View and manage all scheduled audits</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[120px]">Audit ID</TableHead>
                        <TableHead className="min-w-[180px]">Employer</TableHead>
                        <TableHead className="min-w-[120px]">Type</TableHead>
                        <TableHead className="min-w-[120px]">Date</TableHead>
                        <TableHead className="min-w-[120px]">Status</TableHead>
                        <TableHead className="min-w-[150px]">Auditor</TableHead>
                        <TableHead className="min-w-[100px] sticky right-0 bg-background">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditSchedule.map((audit) => (
                        <TableRow key={audit.id}>
                          <TableCell className="font-medium">{audit.id}</TableCell>
                          <TableCell>{audit.employer}</TableCell>
                          <TableCell>{audit.type}</TableCell>
                          <TableCell>{audit.date}</TableCell>
                          <TableCell>
                            <Badge variant={
                              audit.status === 'Completed' ? 'default' :
                              audit.status === 'In Progress' ? 'secondary' : 'outline'
                            }>
                              {audit.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{audit.auditor}</TableCell>
                          <TableCell className="sticky right-0 bg-background">
                            <div className="flex gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => navigate(`/compliance/audits/${audit.id}`)}
                              >
                                View
                              </Button>
                              <Button variant="ghost" size="sm">Edit</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create">
            <AuditManagementForm />
          </TabsContent>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Audit Reports</CardTitle>
                <CardDescription>Generate and view audit reports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-medium">Available Reports</h3>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-start">
                        Audit Summary Report
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        Compliance Trends Report
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        Auditor Performance Report
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        Risk Assessment Report
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-medium">Report Filters</h3>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input type="date" className="border rounded px-3 py-2" placeholder="From" />
                        <input type="date" className="border rounded px-3 py-2" placeholder="To" />
                      </div>
                      <select className="w-full border rounded px-3 py-2">
                        <option>All Audit Types</option>
                        <option>Routine</option>
                        <option>Risk-based</option>
                        <option>Investigation</option>
                      </select>
                      <Button className="w-full">Generate Report</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AuditManagement;
