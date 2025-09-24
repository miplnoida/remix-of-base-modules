import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileText, BarChart3, Calendar, Filter, TrendingUp, PieChart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const LegalReports = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState({
    from: '2024-01-01',
    to: '2024-12-31'
  });
  const [filters, setFilters] = useState({
    caseType: '',
    status: '',
    officer: '',
    priority: ''
  });

  const predefinedReports = [
    {
      id: 'RPT-001',
      name: 'Legal Case Aging Report',
      description: 'Cases categorized by age and SLA status',
      category: 'Case Management',
      lastGenerated: '2024-01-25',
      icon: BarChart3,
      color: 'text-blue-500'
    },
    {
      id: 'RPT-002',
      name: 'Win/Loss Analysis',
      description: 'Legal outcomes and success rates by case type',
      category: 'Performance',
      lastGenerated: '2024-01-20',
      icon: TrendingUp,
      color: 'text-green-500'
    },
    {
      id: 'RPT-003',
      name: 'Recovery Rate Report',
      description: 'Penalty collection and enforcement effectiveness',
      category: 'Financial',
      lastGenerated: '2024-01-22',
      icon: PieChart,
      color: 'text-purple-500'
    },
    {
      id: 'RPT-004',
      name: 'Court Calendar Report',
      description: 'Upcoming hearings and court schedules',
      category: 'Scheduling',
      lastGenerated: '2024-01-24',
      icon: Calendar,
      color: 'text-orange-500'
    },
    {
      id: 'RPT-005',
      name: 'Officer Workload Report',
      description: 'Case distribution and officer performance',
      category: 'HR Analytics',
      lastGenerated: '2024-01-23',
      icon: BarChart3,
      color: 'text-red-500'
    },
    {
      id: 'RPT-006',
      name: 'Compliance Trend Analysis',
      description: 'Compliance violations and enforcement trends',
      category: 'Compliance',
      lastGenerated: '2024-01-21',
      icon: TrendingUp,
      color: 'text-indigo-500'
    }
  ];

  const reportHistory = [
    {
      id: 'HIST-001',
      reportName: 'Legal Case Aging Report',
      generatedBy: 'Sarah Johnson',
      dateGenerated: '2024-01-25',
      parameters: 'All cases, Q4 2023 - Q1 2024',
      fileSize: '2.4 MB',
      status: 'Completed'
    },
    {
      id: 'HIST-002',
      reportName: 'Recovery Rate Report',
      generatedBy: 'Michael Chen',
      dateGenerated: '2024-01-22',
      parameters: 'Financial enforcement, 2024 YTD',
      fileSize: '1.8 MB',
      status: 'Completed'
    },
    {
      id: 'HIST-003',
      reportName: 'Win/Loss Analysis',
      generatedBy: 'Lisa Wang',
      dateGenerated: '2024-01-20',
      parameters: 'All case types, 2023 Annual',
      fileSize: '3.2 MB',
      status: 'Completed'
    }
  ];

  const analyticsData = {
    totalCases: 156,
    resolvedCases: 89,
    winRate: 78,
    averageResolutionTime: 45,
    totalRecovered: 567000,
    pendingHearings: 23,
    overdueActions: 12,
    complianceRate: 82
  };

  const handleGenerateReport = (reportId: string) => {
    toast({
      title: "Report Generation Started",
      description: "Your report is being generated and will be available for download shortly.",
    });
  };

  const handleDownloadReport = (reportId: string) => {
    toast({
      title: "Download Started",
      description: "Report download has started.",
    });
  };

  const handleCustomReportGenerate = () => {
    if (!dateRange.from || !dateRange.to) {
      toast({
        title: "Validation Error",
        description: "Please select a valid date range.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Custom Report Generated",
      description: "Your custom report has been generated successfully.",
    });
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
                onClick={() => navigate('/legal')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Legal Module
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <nav className="flex items-center space-x-2 text-sm text-gray-500">
                <span>Legal Module</span>
                <span>/</span>
                <span className="text-gray-900 font-medium">Reports & Analytics</span>
              </nav>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Report
              </Button>
              <Button size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export All
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Legal Reports & Analytics</h1>
          <p className="text-gray-600">Generate comprehensive reports and analyze legal performance metrics</p>
        </div>

        <Tabs defaultValue="predefined" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="predefined">Predefined Reports</TabsTrigger>
            <TabsTrigger value="custom">Custom Reports</TabsTrigger>
            <TabsTrigger value="analytics">Analytics Dashboard</TabsTrigger>
            <TabsTrigger value="history">Report History</TabsTrigger>
          </TabsList>

          <TabsContent value="predefined" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Available Reports</CardTitle>
                <CardDescription>Pre-configured reports for common legal analysis needs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {predefinedReports.map((report) => (
                    <Card key={report.id} className="border">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <report.icon className={`h-6 w-6 ${report.color}`} />
                            <div>
                              <h3 className="font-medium">{report.name}</h3>
                              <Badge variant="outline" className="mt-1">{report.category}</Badge>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">{report.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            Last generated: {report.lastGenerated}
                          </span>
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDownloadReport(report.id)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => handleGenerateReport(report.id)}
                            >
                              Generate
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="custom" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Custom Report Builder</CardTitle>
                <CardDescription>Create custom reports with specific filters and parameters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dateFrom">From Date</Label>
                    <Input
                      id="dateFrom"
                      type="date"
                      value={dateRange.from}
                      onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateTo">To Date</Label>
                    <Input
                      id="dateTo"
                      type="date"
                      value={dateRange.to}
                      onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Case Type</Label>
                    <Select value={filters.caseType} onValueChange={(value) => setFilters(prev => ({ ...prev, caseType: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Types</SelectItem>
                        <SelectItem value="Non-Compliance">Non-Compliance</SelectItem>
                        <SelectItem value="Benefit Dispute">Benefit Dispute</SelectItem>
                        <SelectItem value="Appeal">Appeal</SelectItem>
                        <SelectItem value="Fraud Investigation">Fraud Investigation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Status</SelectItem>
                        <SelectItem value="Filed">Filed</SelectItem>
                        <SelectItem value="Under Review">Under Review</SelectItem>
                        <SelectItem value="In Legal Action">In Legal Action</SelectItem>
                        <SelectItem value="Resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Assigned Officer</Label>
                    <Select value={filters.officer} onValueChange={(value) => setFilters(prev => ({ ...prev, officer: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Officers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Officers</SelectItem>
                        <SelectItem value="Sarah Johnson">Sarah Johnson</SelectItem>
                        <SelectItem value="Michael Chen">Michael Chen</SelectItem>
                        <SelectItem value="Lisa Wang">Lisa Wang</SelectItem>
                        <SelectItem value="David Rodriguez">David Rodriguez</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={filters.priority} onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Priorities" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Priorities</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Report Options */}
                <div className="space-y-2">
                  <Label>Report Sections</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {[
                      'Case Summary',
                      'Status Breakdown',
                      'Financial Analysis',
                      'Officer Performance',
                      'Timeline Analysis',
                      'Evidence Summary',
                      'Hearing Schedule',
                      'Compliance Metrics'
                    ].map((section) => (
                      <label key={section} className="flex items-center space-x-2">
                        <input type="checkbox" className="rounded" defaultChecked />
                        <span className="text-sm">{section}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex space-x-2">
                    <Button onClick={handleCustomReportGenerate}>
                      <FileText className="h-4 w-4 mr-2" />
                      Generate Custom Report
                    </Button>
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Save Template
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-blue-600">{analyticsData.totalCases}</div>
                  <p className="text-sm text-gray-600">Total Cases</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-green-600">{analyticsData.winRate}%</div>
                  <p className="text-sm text-gray-600">Win Rate</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-purple-600">${analyticsData.totalRecovered.toLocaleString()}</div>
                  <p className="text-sm text-gray-600">Total Recovered</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-orange-600">{analyticsData.averageResolutionTime}</div>
                  <p className="text-sm text-gray-600">Avg. Resolution Days</p>
                </CardContent>
              </Card>
            </div>

            {/* Performance Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Case Resolution Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
                    <p className="text-gray-500">Chart: Monthly case resolution trends</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Collection Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
                    <p className="text-gray-500">Chart: Penalty collection rates</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Case Type Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
                    <p className="text-gray-500">Chart: Case types breakdown</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Officer Workload</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
                    <p className="text-gray-500">Chart: Cases per officer</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Report Generation History</CardTitle>
                <CardDescription>Track all previously generated reports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportHistory.map((report) => (
                    <div key={report.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{report.reportName}</h4>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{report.status}</Badge>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Generated by:</span> {report.generatedBy}
                        </div>
                        <div>
                          <span className="font-medium">Date:</span> {report.dateGenerated}
                        </div>
                        <div>
                          <span className="font-medium">Size:</span> {report.fileSize}
                        </div>
                        <div>
                          <span className="font-medium">Parameters:</span> {report.parameters}
                        </div>
                      </div>
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

export default LegalReports;