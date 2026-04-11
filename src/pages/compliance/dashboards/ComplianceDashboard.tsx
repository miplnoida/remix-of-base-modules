
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  fetchComplianceMetrics,
  fetchRecentViolations,
  fetchUpcomingInspections,
  fetchSectorCompliance,
} from '@/services/dashboardDataService';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Calendar, 
  Building2,
  ArrowLeft,
  Search,
  Filter,
  Download,
  Eye,
  Plus,
  Loader2
} from 'lucide-react';

const ComplianceDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['compliance_page_metrics'],
    queryFn: fetchComplianceMetrics,
  });

  const { data: violations = [], isLoading: violationsLoading } = useQuery({
    queryKey: ['compliance_page_violations'],
    queryFn: fetchRecentViolations,
  });

  const { data: inspections = [], isLoading: inspectionsLoading } = useQuery({
    queryKey: ['compliance_page_inspections'],
    queryFn: fetchUpcomingInspections,
  });

  const { data: sectorData = [], isLoading: sectorLoading } = useQuery({
    queryKey: ['compliance_page_sector'],
    queryFn: fetchSectorCompliance,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'XCD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const complianceMetrics = [
    { label: 'Total Employers', value: (metrics?.total_employers ?? 0).toLocaleString(), status: 'info', icon: Building2 },
    { label: 'Compliant Employers', value: (metrics?.compliant_employers ?? 0).toLocaleString(), status: 'success', icon: CheckCircle },
    { label: 'Active Violations', value: (metrics?.active_violations ?? 0).toLocaleString(), status: 'danger', icon: AlertTriangle },
    { label: 'Pending Audits', value: (metrics?.pending_audits ?? 0).toLocaleString(), status: 'warning', icon: Clock },
  ];

  const filteredViolations = violations.filter(v =>
    !searchTerm || 
    (v.employer_name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.violation_number ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.summary ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (metricsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <div className="h-6 w-px bg-border" />
              <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>Compliance & Audit</span>
                <span>/</span>
                <span className="text-foreground font-medium">Dashboard</span>
              </nav>
            </div>
            <div className="flex items-center space-x-2">
              <Button onClick={() => navigate("/compliance/reports")} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
              <Button onClick={() => navigate("/compliance/violations/manual-entry")} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Violation
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Compliance Dashboard</h1>
          <p className="text-muted-foreground">Monitor compliance status and manage violations across all employers</p>
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
                      metric.status === 'danger' ? 'text-destructive' :
                      metric.status === 'success' ? 'text-secondary' :
                      metric.status === 'warning' ? 'text-accent-foreground' : 'text-primary'
                    }`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metric.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" />Recent Violations</span>
                    <Button size="sm" onClick={() => setActiveTab('violations')}>View All</Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {violationsLoading ? (
                    <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                  ) : violations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No active violations</div>
                  ) : (
                    <div className="space-y-4">
                      {violations.slice(0, 4).map((v) => {
                        const daysOpen = Math.floor((Date.now() - new Date(v.created_at).getTime()) / 86400000);
                        return (
                          <div key={v.id} className="border rounded-lg p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">{v.employer_name ?? 'Unknown'}</h4>
                              <Badge variant={v.severity === 'HIGH' || v.severity === 'CRITICAL' ? 'destructive' : v.severity === 'MEDIUM' ? 'default' : 'secondary'}>
                                {v.severity}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{v.summary ?? v.violation_number}</p>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>{v.total_amount ? formatCurrency(Number(v.total_amount)) : 'N/A'}</span>
                              <span>{daysOpen} days open</span>
                            </div>
                            <Button size="sm" variant="ghost" className="mt-2 w-full" onClick={() => navigate(`/compliance/violations/${v.id}`)}>
                              <Eye className="h-4 w-4 mr-2" />View Details
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" />Upcoming Audits</span>
                    <Button size="sm" onClick={() => setActiveTab('audits')}>View All</Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {inspectionsLoading ? (
                    <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                  ) : inspections.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No upcoming audits</div>
                  ) : (
                    <div className="space-y-4">
                      {inspections.slice(0, 4).map((insp, index) => (
                        <div key={insp.id || index} className="border rounded-lg p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{insp.employer_name ?? 'Unknown'}</h4>
                            <Badge variant="outline">{insp.inspection_type}</Badge>
                          </div>
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>{insp.scheduled_date}</span>
                            <span>Inspector: {insp.inspector_name ?? 'TBD'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
                      <Input placeholder="Search violations..." className="pl-8 w-64" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-2" />Filter</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {violationsLoading ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : filteredViolations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No violations found</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Violation #</TableHead>
                        <TableHead>Employer</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Days Open</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredViolations.map((v) => {
                        const daysOpen = Math.floor((Date.now() - new Date(v.created_at).getTime()) / 86400000);
                        return (
                          <TableRow key={v.id}>
                            <TableCell className="font-medium">{v.violation_number}</TableCell>
                            <TableCell>{v.employer_name ?? 'Unknown'}</TableCell>
                            <TableCell>
                              <Badge variant={v.severity === 'HIGH' || v.severity === 'CRITICAL' ? 'destructive' : v.severity === 'MEDIUM' ? 'default' : 'secondary'}>
                                {v.severity}
                              </Badge>
                            </TableCell>
                            <TableCell>{v.total_amount ? formatCurrency(Number(v.total_amount)) : 'N/A'}</TableCell>
                            <TableCell><Badge variant="outline">{v.status}</Badge></TableCell>
                            <TableCell>{daysOpen}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => navigate(`/compliance/violations/${v.id}`)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
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
                {inspectionsLoading ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : inspections.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No scheduled audits</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Inspection #</TableHead>
                        <TableHead>Employer</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Scheduled Date</TableHead>
                        <TableHead>Inspector</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inspections.map((insp) => (
                        <TableRow key={insp.id}>
                          <TableCell className="font-medium">{insp.inspection_number}</TableCell>
                          <TableCell>{insp.employer_name ?? 'Unknown'}</TableCell>
                          <TableCell>{insp.inspection_type}</TableCell>
                          <TableCell>{insp.scheduled_date}</TableCell>
                          <TableCell>{insp.inspector_name ?? 'TBD'}</TableCell>
                          <TableCell><Badge variant="outline">{insp.status}</Badge></TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
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
                {sectorLoading ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : sectorData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No sector data available</div>
                ) : (
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
                      {sectorData.map((sector) => (
                        <TableRow key={sector.sector}>
                          <TableCell className="font-medium">{sector.sector}</TableCell>
                          <TableCell>{Number(sector.total).toLocaleString()}</TableCell>
                          <TableCell>{Number(sector.compliant).toLocaleString()}</TableCell>
                          <TableCell>{sector.rate}%</TableCell>
                          <TableCell>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  Number(sector.rate) >= 90 ? 'bg-secondary' :
                                  Number(sector.rate) >= 85 ? 'bg-accent' : 'bg-destructive'
                                }`}
                                style={{ width: `${sector.rate}%` }}
                              ></div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ComplianceDashboard;
