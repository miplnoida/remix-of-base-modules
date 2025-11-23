
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  FileText, 
  Calendar, 
  TrendingDown,
  Users,
  Building2,
  DollarSign,
  Shield,
  ArrowLeft,
  Search,
  Filter,
  Download,
  Eye,
  Plus
} from 'lucide-react';

const ComplianceDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');

  const complianceMetrics = [
    { label: 'Total Employers', value: '15,432', status: 'info', icon: Building2, change: '+2.3%' },
    { label: 'Compliant Employers', value: '13,456', status: 'success', icon: CheckCircle, change: '+1.2%' },
    { label: 'Active Violations', value: '234', status: 'danger', icon: AlertTriangle, change: '-8.5%' },
    { label: 'Pending Audits', value: '89', status: 'warning', icon: Clock, change: '+15%' },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'XCD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const recentViolations = [
    { id: 'V-2024-001', employer: 'ABC Manufacturing Ltd', type: 'Late Payment', severity: 'High', daysOpen: 15, amount: 12500, status: 'Open', employerId: 'EMP-001' },
    { id: 'V-2024-002', employer: 'XYZ Services Corp', type: 'Under-reporting', severity: 'Medium', daysOpen: 8, amount: 5200, status: 'Under Review', employerId: 'EMP-002' },
    { id: 'V-2024-003', employer: 'Tech Solutions Inc', type: 'Missing Registration', severity: 'High', daysOpen: 22, amount: 18750, status: 'Open', employerId: 'EMP-003' },
    { id: 'V-2024-004', employer: 'Retail Chain Ltd', type: 'Incomplete Records', severity: 'Low', daysOpen: 5, amount: 2100, status: 'Resolved', employerId: 'EMP-004' },
    { id: 'V-2024-005', employer: 'Construction Corp', type: 'Late Payment', severity: 'Medium', daysOpen: 12, amount: 8900, status: 'Open', employerId: 'EMP-005' },
  ];

  const upcomingAudits = [
    { id: 'A-2024-001', company: 'Global Industries', date: '2024-01-15', type: 'Routine', auditor: 'John Smith', riskLevel: 'Medium', employerId: 'EMP-001', findings: 'Initial assessment pending' },
    { id: 'A-2024-002', company: 'Medical Center Ltd', date: '2024-01-16', type: 'Follow-up', auditor: 'Jane Doe', riskLevel: 'High', employerId: 'EMP-002', findings: 'Reviewing compliance records' },
    { id: 'A-2024-003', company: 'Education Services', date: '2024-01-18', type: 'Risk-based', auditor: 'Mike Johnson', riskLevel: 'Low', employerId: 'EMP-003', findings: 'Standard documentation check' },
    { id: 'A-2024-004', company: 'Transport Company', date: '2024-01-20', type: 'Investigation', auditor: 'Sarah Wilson', riskLevel: 'High', employerId: 'EMP-004', findings: 'Investigating discrepancies' },
  ];

  const sectorCompliance = [
    { sector: 'Manufacturing', total: 2840, compliant: 2556, rate: 90 },
    { sector: 'Services', total: 4120, compliant: 3708, rate: 90 },
    { sector: 'Construction', total: 1890, compliant: 1587, rate: 84 },
    { sector: 'Healthcare', total: 980, compliant: 882, rate: 90 },
    { sector: 'Education', total: 750, compliant: 638, rate: 85 },
    { sector: 'Technology', total: 1240, compliant: 1116, rate: 90 },
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
                onClick={() => navigate("/")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <nav className="flex items-center space-x-2 text-sm text-gray-500">
                <span>Compliance & Audit</span>
                <span>/</span>
                <span className="text-gray-900 font-medium">Dashboard</span>
              </nav>
            </div>
            <div className="flex items-center space-x-2">
              <Button onClick={() => navigate("/compliance/reports")} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
              <Button onClick={() => navigate("/compliance/violations/new")} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Violation
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Compliance Dashboard</h1>
          <p className="text-gray-600">Monitor compliance status and manage violations across all employers</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="violations">Violations</TabsTrigger>
            <TabsTrigger value="audits">Audits</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {complianceMetrics.map((metric, index) => (
                <Card key={index}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
                    <metric.icon className={`h-4 w-4 ${
                      metric.status === 'danger' ? 'text-red-500' :
                      metric.status === 'success' ? 'text-green-500' :
                      metric.status === 'warning' ? 'text-yellow-500' : 'text-blue-500'
                    }`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metric.value}</div>
                    <p className="text-xs text-muted-foreground">
                      <span className={metric.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}>
                        {metric.change}
                      </span>
                      {' '}from last month
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      Recent Violations
                    </span>
                    <Button size="sm" onClick={() => setActiveTab('violations')}>View All</Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentViolations.slice(0, 4).map((violation, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{violation.employer}</h4>
                          <Badge variant={
                            violation.severity === 'High' ? 'destructive' :
                            violation.severity === 'Medium' ? 'default' : 'secondary'
                          }>
                            {violation.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{violation.type}</p>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>{formatCurrency(violation.amount)}</span>
                          <span>{violation.daysOpen} days open</span>
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="mt-2 w-full"
                          onClick={() => navigate(`/compliance/violations/${violation.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-blue-500" />
                      Upcoming Audits
                    </span>
                    <Button size="sm" onClick={() => setActiveTab('audits')}>View All</Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {upcomingAudits.map((audit, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{audit.company}</h4>
                          <Badge variant={
                            audit.riskLevel === 'High' ? 'destructive' :
                            audit.riskLevel === 'Medium' ? 'default' : 'secondary'
                          }>
                            {audit.riskLevel} Risk
                          </Badge>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>{audit.type} Audit</span>
                          <span>{audit.date}</span>
                        </div>
                        <p className="text-xs text-gray-500">Auditor: {audit.auditor}</p>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="mt-2 w-full"
                          onClick={() => navigate(`/employers/${audit.employerId}/audits/${audit.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Audit
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="violations" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Violation Management</CardTitle>
                    <CardDescription>Track and manage all compliance violations</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search violations..."
                        className="pl-8 w-64"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Violation ID</TableHead>
                      <TableHead>Employer</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Days Open</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentViolations.map((violation) => (
                      <TableRow key={violation.id}>
                        <TableCell className="font-medium">{violation.id}</TableCell>
                        <TableCell>{violation.employer}</TableCell>
                        <TableCell>{violation.type}</TableCell>
                        <TableCell>
                          <Badge variant={
                            violation.severity === 'High' ? 'destructive' :
                            violation.severity === 'Medium' ? 'default' : 'secondary'
                          }>
                            {violation.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(violation.amount)}</TableCell>
                        <TableCell>
                          <Badge variant={
                            violation.status === 'Open' ? 'destructive' :
                            violation.status === 'Under Review' ? 'default' : 'secondary'
                          }>
                            {violation.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{violation.daysOpen}</TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/compliance/violations/${violation.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audits" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Audit Management</CardTitle>
                <CardDescription>Schedule and track compliance audits</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Audit ID</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Scheduled Date</TableHead>
                      <TableHead>Auditor</TableHead>
                      <TableHead>Risk Level</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingAudits.map((audit) => (
                      <TableRow key={audit.id}>
                        <TableCell className="font-medium">{audit.id}</TableCell>
                        <TableCell>{audit.company}</TableCell>
                        <TableCell>{audit.type}</TableCell>
                        <TableCell>{audit.date}</TableCell>
                        <TableCell>{audit.auditor}</TableCell>
                        <TableCell>
                          <Badge variant={
                            audit.riskLevel === 'High' ? 'destructive' :
                            audit.riskLevel === 'Medium' ? 'default' : 'secondary'
                          }>
                            {audit.riskLevel}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/employers/${audit.employerId}/audits/${audit.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sector Compliance Analysis</CardTitle>
                <CardDescription>Compliance rates by industry sector</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sector</TableHead>
                      <TableHead>Total Employers</TableHead>
                      <TableHead>Compliant</TableHead>
                      <TableHead>Compliance Rate</TableHead>
                      <TableHead>Performance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sectorCompliance.map((sector) => (
                      <TableRow key={sector.sector}>
                        <TableCell className="font-medium">{sector.sector}</TableCell>
                        <TableCell>{sector.total.toLocaleString()}</TableCell>
                        <TableCell>{sector.compliant.toLocaleString()}</TableCell>
                        <TableCell>{sector.rate}%</TableCell>
                        <TableCell>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                sector.rate >= 90 ? 'bg-green-500' :
                                sector.rate >= 85 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${sector.rate}%` }}
                            ></div>
                          </div>
                        </TableCell>
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

export default ComplianceDashboard;
