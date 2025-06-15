
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
  ArrowLeft, 
  Download, 
  FileText, 
  BarChart3, 
  Calendar, 
  Filter,
  TrendingUp,
  PieChart,
  Users,
  Building2,
  AlertTriangle
} from 'lucide-react';

const ComplianceReports = () => {
  const navigate = useNavigate();
  const [selectedReport, setSelectedReport] = useState('');

  const standardReports = [
    {
      id: 'compliance-summary',
      name: 'Compliance Summary Report',
      description: 'Overall compliance status across all employers',
      icon: BarChart3,
      lastGenerated: '2024-01-10',
      frequency: 'Monthly'
    },
    {
      id: 'violation-trends',
      name: 'Violation Trends Analysis',
      description: 'Trending patterns in compliance violations',
      icon: TrendingUp,
      lastGenerated: '2024-01-08',
      frequency: 'Weekly'
    },
    {
      id: 'sector-analysis',
      name: 'Sector Compliance Analysis',
      description: 'Compliance performance by industry sector',
      icon: PieChart,
      lastGenerated: '2024-01-05',
      frequency: 'Quarterly'
    },
    {
      id: 'audit-schedule',
      name: 'Audit Schedule Report',
      description: 'Upcoming and completed audits overview',
      icon: Calendar,
      lastGenerated: '2024-01-09',
      frequency: 'Weekly'
    },
    {
      id: 'penalty-collection',
      name: 'Penalty Collection Report',
      description: 'Status of penalty payments and collections',
      icon: FileText,
      lastGenerated: '2024-01-07',
      frequency: 'Monthly'
    }
  ];

  const reportData = {
    violationTrends: [
      { month: 'Aug 2023', violations: 189, resolved: 156, pending: 33 },
      { month: 'Sep 2023', violations: 205, resolved: 178, pending: 27 },
      { month: 'Oct 2023', violations: 223, resolved: 201, pending: 22 },
      { month: 'Nov 2023', violations: 198, resolved: 183, pending: 15 },
      { month: 'Dec 2023', violations: 234, resolved: 219, pending: 15 },
      { month: 'Jan 2024', violations: 167, resolved: 152, pending: 15 },
    ],
    sectorCompliance: [
      { sector: 'Manufacturing', employers: 2840, compliant: 2556, rate: 90, violations: 45 },
      { sector: 'Services', employers: 4120, compliant: 3708, rate: 90, violations: 67 },
      { sector: 'Construction', employers: 1890, compliant: 1587, rate: 84, violations: 89 },
      { sector: 'Healthcare', employers: 980, compliant: 882, rate: 90, violations: 12 },
      { sector: 'Education', employers: 750, compliant: 638, rate: 85, violations: 18 },
      { sector: 'Technology', employers: 1240, compliant: 1116, rate: 90, violations: 23 },
    ],
    auditPerformance: [
      { auditor: 'John Smith', completed: 45, pending: 8, averageTime: '3.2 days', efficiency: 92 },
      { auditor: 'Jane Doe', completed: 38, pending: 5, averageTime: '2.8 days', efficiency: 95 },
      { auditor: 'Mike Johnson', completed: 42, pending: 12, averageTime: '4.1 days', efficiency: 88 },
      { auditor: 'Sarah Wilson', completed: 35, pending: 6, averageTime: '3.5 days', efficiency: 91 },
    ]
  };

  const generateReport = (reportType: string) => {
    console.log(`Generating ${reportType} report...`);
    // In a real application, this would trigger report generation
  };

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
                <span className="text-gray-900 font-medium">Reports & Analytics</span>
              </nav>
            </div>
            <Button onClick={() => generateReport('custom')} size="sm">
              <Download className="h-4 w-4 mr-2" />
              Generate Custom Report
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Compliance Reports & Analytics</h1>
          <p className="text-gray-600">Generate comprehensive reports and analyze compliance trends</p>
        </div>

        <Tabs defaultValue="standard" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="standard">Standard Reports</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="custom">Custom Reports</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="standard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {standardReports.map((report) => (
                <Card key={report.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <report.icon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{report.name}</CardTitle>
                        <CardDescription>{report.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Last Generated:</span>
                        <span>{report.lastGenerated}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Frequency:</span>
                        <span>{report.frequency}</span>
                      </div>
                      <div className="flex space-x-2 mt-4">
                        <Button size="sm" className="flex-1" onClick={() => generateReport(report.id)}>
                          <Download className="h-4 w-4 mr-2" />
                          Generate
                        </Button>
                        <Button variant="outline" size="sm">
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Violation Trends (Last 6 Months)</CardTitle>
                  <CardDescription>Monthly violation and resolution statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead>New Violations</TableHead>
                        <TableHead>Resolved</TableHead>
                        <TableHead>Pending</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.violationTrends.map((trend, index) => (
                        <TableRow key={index}>
                          <TableCell>{trend.month}</TableCell>
                          <TableCell>{trend.violations}</TableCell>
                          <TableCell className="text-green-600">{trend.resolved}</TableCell>
                          <TableCell className="text-orange-600">{trend.pending}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sector Compliance Performance</CardTitle>
                  <CardDescription>Compliance rates by industry sector</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sector</TableHead>
                        <TableHead>Employers</TableHead>
                        <TableHead>Compliance Rate</TableHead>
                        <TableHead>Violations</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.sectorCompliance.map((sector, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{sector.sector}</TableCell>
                          <TableCell>{sector.employers.toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <span className={`font-medium ${
                                sector.rate >= 90 ? 'text-green-600' :
                                sector.rate >= 85 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {sector.rate}%
                              </span>
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${
                                    sector.rate >= 90 ? 'bg-green-500' :
                                    sector.rate >= 85 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${sector.rate}%` }}
                                ></div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={sector.violations > 50 ? 'destructive' : 'secondary'}>
                              {sector.violations}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Auditor Performance Metrics</CardTitle>
                <CardDescription>Individual auditor performance and efficiency</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Auditor</TableHead>
                      <TableHead>Completed Audits</TableHead>
                      <TableHead>Pending Audits</TableHead>
                      <TableHead>Average Time</TableHead>
                      <TableHead>Efficiency Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.auditPerformance.map((auditor, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{auditor.auditor}</TableCell>
                        <TableCell>{auditor.completed}</TableCell>
                        <TableCell>{auditor.pending}</TableCell>
                        <TableCell>{auditor.averageTime}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span className={`font-medium ${
                              auditor.efficiency >= 95 ? 'text-green-600' :
                              auditor.efficiency >= 90 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {auditor.efficiency}%
                            </span>
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  auditor.efficiency >= 95 ? 'bg-green-500' :
                                  auditor.efficiency >= 90 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${auditor.efficiency}%` }}
                              ></div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="custom" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Custom Report Builder</CardTitle>
                <CardDescription>Create tailored reports with specific filters and parameters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Report Type</Label>
                    <Input placeholder="Select report type..." />
                  </div>
                  <div>
                    <Label>Output Format</Label>
                    <Input placeholder="PDF / Excel / CSV" />
                  </div>
                </div>

                <div>
                  <Label>Date Range</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <Input type="date" placeholder="From date" />
                    <Input type="date" placeholder="To date" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Industry Filter</Label>
                    <Input placeholder="Select industries..." />
                  </div>
                  <div>
                    <Label>Company Size</Label>
                    <Input placeholder="Small / Medium / Large" />
                  </div>
                </div>

                <div>
                  <Label>Geographic Filter</Label>
                  <Input placeholder="Select regions or locations..." />
                </div>

                <div>
                  <Label>Data Fields</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="violations" defaultChecked />
                      <label htmlFor="violations" className="text-sm">Violations</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="audits" defaultChecked />
                      <label htmlFor="audits" className="text-sm">Audits</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="penalties" />
                      <label htmlFor="penalties" className="text-sm">Penalties</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="contributions" />
                      <label htmlFor="contributions" className="text-sm">Contributions</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="compliance" defaultChecked />
                      <label htmlFor="compliance" className="text-sm">Compliance Status</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="trends" />
                      <label htmlFor="trends" className="text-sm">Trend Analysis</label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline">Save Template</Button>
                  <Button>Generate Report</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scheduled" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Scheduled Reports</CardTitle>
                    <CardDescription>Automated report generation and distribution</CardDescription>
                  </div>
                  <Button>
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule New Report
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Report Name</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Next Run</TableHead>
                      <TableHead>Recipients</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Monthly Compliance Summary</TableCell>
                      <TableCell>Monthly</TableCell>
                      <TableCell>2024-02-01</TableCell>
                      <TableCell>director@company.com, admin@company.com</TableCell>
                      <TableCell>
                        <Badge variant="default">Active</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="sm">Edit</Button>
                          <Button variant="ghost" size="sm">Run Now</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Weekly Violation Report</TableCell>
                      <TableCell>Weekly</TableCell>
                      <TableCell>2024-01-22</TableCell>
                      <TableCell>compliance@company.com</TableCell>
                      <TableCell>
                        <Badge variant="default">Active</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="sm">Edit</Button>
                          <Button variant="ghost" size="sm">Run Now</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Quarterly Sector Analysis</TableCell>
                      <TableCell>Quarterly</TableCell>
                      <TableCell>2024-04-01</TableCell>
                      <TableCell>executives@company.com</TableCell>
                      <TableCell>
                        <Badge variant="secondary">Paused</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="sm">Edit</Button>
                          <Button variant="ghost" size="sm">Enable</Button>
                        </div>
                      </TableCell>
                    </TableRow>
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

export default ComplianceReports;
