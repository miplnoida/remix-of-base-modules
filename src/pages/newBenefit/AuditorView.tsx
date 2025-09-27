import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

import { Separator } from '@/components/ui/separator';
import { Search, Filter, Download, Eye, FileText, DollarSign, Shield, AlertTriangle, TrendingUp, Users } from 'lucide-react';

const AuditorView = () => {
  const [selectedDateRange, setSelectedDateRange] = useState('last-30-days');
  const [searchTerm, setSearchTerm] = useState('');

  const auditLogs = [
    { id: '1', timestamp: '2024-01-15 14:30:25', user: 'claims_officer1', action: 'Claim Status Updated', resource: 'SB-2024-001', details: 'Status changed to Approved', riskLevel: 'Low' },
    { id: '2', timestamp: '2024-01-15 14:25:12', user: 'payments1', action: 'Payment Authorized', resource: 'PAY-2024-0045', details: '$1,800.00 payment authorized', riskLevel: 'Medium' },
    { id: '3', timestamp: '2024-01-15 14:20:05', user: 'supervisor1', action: 'Document Access', resource: 'DOC-Medical-001', details: 'Medical certificate viewed', riskLevel: 'Low' },
    { id: '4', timestamp: '2024-01-15 14:15:33', user: 'admin1', action: 'Rate Configuration', resource: 'RATE-MAX-WEEKLY', details: 'Maximum weekly benefit updated', riskLevel: 'High' },
    { id: '5', timestamp: '2024-01-15 14:10:18', user: 'medical1', action: 'Medical Decision', resource: 'MB-2024-001', details: 'Medical board decision recorded', riskLevel: 'Medium' }
  ];

  const paymentAudit = [
    { id: '1', paymentRef: 'PAY-2024-0045', claimRef: 'SB-2024-001', amount: '$1,800.00', beneficiary: 'John Contributor', authorizedBy: 'payments1', date: '2024-01-15', status: 'Processed' },
    { id: '2', paymentRef: 'PAY-2024-0044', claimRef: 'MB-2024-002', amount: '$2,400.00', beneficiary: 'Jane Smith', authorizedBy: 'supervisor1', date: '2024-01-14', status: 'Processed' },
    { id: '3', paymentRef: 'PAY-2024-0043', claimRef: 'FG-2024-001', amount: '$2,500.00', beneficiary: 'Robert Brown', authorizedBy: 'payments1', date: '2024-01-13', status: 'Processed' },
    { id: '4', paymentRef: 'PAY-2024-0042', claimRef: 'AP-2024-001', amount: '$450.00', beneficiary: 'Mary Johnson', authorizedBy: 'supervisor1', date: '2024-01-12', status: 'Pending' }
  ];

  const claimsSummary = [
    { benefitType: 'Sickness', submitted: 45, approved: 38, denied: 5, pending: 2, totalPaid: '$68,400.00' },
    { benefitType: 'Maternity', submitted: 12, approved: 11, denied: 0, pending: 1, totalPaid: '$35,100.00' },
    { benefitType: 'Employment Injury', submitted: 8, approved: 6, denied: 1, pending: 1, totalPaid: '$24,600.00' },
    { benefitType: 'Funeral Grant', submitted: 15, approved: 15, denied: 0, pending: 0, totalPaid: '$37,500.00' },
    { benefitType: 'Age Pension', submitted: 23, approved: 20, denied: 2, pending: 1, totalPaid: '$156,000.00' }
  ];

  const systemMetrics = [
    { metric: 'Total Active Users', value: '8', change: '+0%', trend: 'stable' },
    { metric: 'Claims Processed Today', value: '12', change: '+20%', trend: 'up' },
    { metric: 'Average Processing Time', value: '5.2 days', change: '-8%', trend: 'down' },
    { metric: 'System Uptime', value: '99.8%', change: '+0.1%', trend: 'up' },
    { metric: 'Failed Login Attempts', value: '3', change: '-40%', trend: 'down' },
    { metric: 'Data Breach Incidents', value: '0', change: '0%', trend: 'stable' }
  ];

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'High': return 'destructive';
      case 'Medium': return 'default';
      case 'Low': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Auditor Dashboard</h1>
          <p className="text-muted-foreground">Complete read-only system oversight and audit trails</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <FileText className="h-4 w-4 mr-2" />
                Generate Audit Report
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Audit Report</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Report Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full System Audit</SelectItem>
                      <SelectItem value="payments">Payments Audit</SelectItem>
                      <SelectItem value="claims">Claims Processing Audit</SelectItem>
                      <SelectItem value="security">Security Audit</SelectItem>
                      <SelectItem value="user-activity">User Activity Report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date</Label>
                    <Input type="date" />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input type="date" />
                  </div>
                </div>
                <div>
                  <Label>Include Sections</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked />
                      System Activity
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked />
                      Payment Transactions
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked />
                      Claim Decisions
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" />
                      User Management
                    </label>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline">Cancel</Button>
                  <Button>Generate Report</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {systemMetrics.map((metric, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{metric.metric}</p>
                  <p className="text-2xl font-bold">{metric.value}</p>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className={`h-4 w-4 ${metric.trend === 'up' ? 'text-green-500' : metric.trend === 'down' ? 'text-red-500' : 'text-gray-400'}`} />
                  <span className={`text-sm ${metric.change.startsWith('+') ? 'text-green-600' : metric.change.startsWith('-') ? 'text-red-600' : 'text-gray-600'}`}>
                    {metric.change}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="audit-logs" className="space-y-6">
        <TabsList>
          <TabsTrigger value="audit-logs">Audit Logs</TabsTrigger>
          <TabsTrigger value="payments">Payment Audit</TabsTrigger>
          <TabsTrigger value="claims">Claims Summary</TabsTrigger>
          <TabsTrigger value="security">Security Analysis</TabsTrigger>
          <TabsTrigger value="reports">Audit Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="audit-logs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>System Audit Logs</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search audit logs..."
                      className="pl-8 w-[300px]"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={selectedDateRange} onValueChange={setSelectedDateRange}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="last-7-days">Last 7 Days</SelectItem>
                      <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                      <SelectItem value="last-90-days">Last 90 Days</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">{log.timestamp}</TableCell>
                      <TableCell>{log.user}</TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell className="font-mono">{log.resource}</TableCell>
                      <TableCell>{log.details}</TableCell>
                      <TableCell>
                        <Badge variant={getRiskLevelColor(log.riskLevel)}>
                          {log.riskLevel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
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

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Transaction Audit</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment Ref</TableHead>
                    <TableHead>Claim Ref</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Beneficiary</TableHead>
                    <TableHead>Authorized By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentAudit.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono">{payment.paymentRef}</TableCell>
                      <TableCell className="font-mono">{payment.claimRef}</TableCell>
                      <TableCell className="font-semibold">{payment.amount}</TableCell>
                      <TableCell>{payment.beneficiary}</TableCell>
                      <TableCell>{payment.authorizedBy}</TableCell>
                      <TableCell>{payment.date}</TableCell>
                      <TableCell>
                        <Badge variant={payment.status === 'Processed' ? 'default' : 'secondary'}>
                          {payment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
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

        <TabsContent value="claims" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Claims Processing Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Benefit Type</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Approved</TableHead>
                    <TableHead>Denied</TableHead>
                    <TableHead>Pending</TableHead>
                    <TableHead>Total Paid</TableHead>
                    <TableHead>Approval Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claimsSummary.map((summary, index) => {
                    const approvalRate = Math.round((summary.approved / summary.submitted) * 100);
                    return (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{summary.benefitType}</TableCell>
                        <TableCell>{summary.submitted}</TableCell>
                        <TableCell className="text-green-600">{summary.approved}</TableCell>
                        <TableCell className="text-red-600">{summary.denied}</TableCell>
                        <TableCell className="text-yellow-600">{summary.pending}</TableCell>
                        <TableCell className="font-semibold">{summary.totalPaid}</TableCell>
                        <TableCell>
                          <Badge variant={approvalRate >= 80 ? 'default' : 'secondary'}>
                            {approvalRate}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Alerts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="font-medium">Suspicious Login Activity</p>
                    <p className="text-sm text-muted-foreground">3 failed login attempts detected</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Shield className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">System Security Check</p>
                    <p className="text-sm text-muted-foreground">All security policies compliant</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <DollarSign className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium">High Value Transaction</p>
                    <p className="text-sm text-muted-foreground">Payment over $5,000 authorized</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Activity Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Active Sessions</span>
                    <Badge>5 users online</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Claims Processed Today</span>
                    <Badge variant="outline">12 claims</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Documents Accessed</span>
                    <Badge variant="outline">48 views</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Payments Authorized</span>
                    <Badge variant="outline">$24,600</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Report Library</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Monthly Audit Report - January 2024</h3>
                    <p className="text-sm text-muted-foreground">Generated on 2024-01-15</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Payment Audit Report - Q4 2023</h3>
                    <p className="text-sm text-muted-foreground">Generated on 2024-01-05</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Security Compliance Report - December 2023</h3>
                    <p className="text-sm text-muted-foreground">Generated on 2023-12-31</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AuditorView;