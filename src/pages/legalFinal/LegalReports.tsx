/** @deprecated Legal V1 prototype — routes redirect to canonical Legal V1 screens. Pending deletion one release cycle after 2026-07. See docs/legal/LEGAL_LEGACY_RETIREMENT_AUDIT.md. */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Download, 
  FileText, 
  TrendingUp, 
  DollarSign, 
  Building2, 
  Users, 
  Calendar,
  BarChart3,
  Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LegalFinalService } from '@/services/legalFinalService';
import { CourtCase } from '@/types/legalFinal';

interface ReportData {
  cases: CourtCase[];
  summary: {
    totalCases: number;
    totalRecovered: number;
    averageDuration: number;
    successRate: number;
  };
}

export const LegalReports = () => {
  const [reportType, setReportType] = useState<string>('case-summary');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const navigate = useNavigate();

  const reportTypes = [
    { value: 'case-summary', label: 'Case Summary Report' },
    { value: 'employer-compliance', label: 'Employer Compliance Legal Report' },
    { value: 'contributor-dispute', label: 'Contributor Dispute Report' },
    { value: 'financial-recovery', label: 'Financial Recovery Report' },
    { value: 'case-duration', label: 'Case Duration Report' },
    { value: 'officer-performance', label: 'Officer Performance Report' },
    { value: 'hearing-schedule', label: 'Court Hearing Schedule Report' },
    { value: 'fraud-overpayment', label: 'Fraud/Overpayment Report' }
  ];

  const generateReport = async () => {
    setLoading(true);
    try {
      // Simulate report generation with mock data
      const cases = await LegalFinalService.getCourtCases();
      let filteredCases = cases;

      // Apply date filters if set
      if (dateFrom) {
        filteredCases = filteredCases.filter(c => new Date(c.dateOpened) >= dateFrom);
      }
      if (dateTo) {
        filteredCases = filteredCases.filter(c => new Date(c.dateOpened) <= dateTo);
      }

      // Filter by report type
      switch (reportType) {
        case 'employer-compliance':
          filteredCases = filteredCases.filter(c => c.caseType === 'Employer Arrears');
          break;
        case 'contributor-dispute':
          filteredCases = filteredCases.filter(c => c.caseType === 'Contributor Dispute');
          break;
        case 'fraud-overpayment':
          filteredCases = filteredCases.filter(c => 
            c.caseType === 'Fraud' || c.caseType === 'Overpayment'
          );
          break;
        default:
          // Keep all cases for general reports
          break;
      }

      const reportData: ReportData = {
        cases: filteredCases,
        summary: {
          totalCases: filteredCases.length,
          totalRecovered: 150000, // Mock data
          averageDuration: 45, // days
          successRate: 0.75 // 75%
        }
      };

      setReportData(reportData);
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = (format: 'pdf' | 'csv') => {
    // Mock export functionality
    console.log(`Exporting ${reportType} report as ${format.toUpperCase()}`);
    alert(`Report exported as ${format.toUpperCase()} (Mock functionality)`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'secondary';
      case 'Filed': return 'default';
      case 'Pending Hearing': return 'warning';
      case 'In Court': return 'info';
      case 'Judgment Delivered': return 'success';
      case 'Enforcement Ongoing': return 'destructive';
      case 'Closed': return 'outline';
      case 'Settled': return 'success';
      default: return 'default';
    }
  };

  const renderReportContent = () => {
    if (!reportData) return null;

    const selectedReportType = reportTypes.find(r => r.value === reportType);

    return (
      <div className="space-y-6">
        {/* Report Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{selectedReportType?.label}</span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => exportReport('csv')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button variant="outline" onClick={() => exportReport('pdf')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </CardTitle>
            <CardDescription>
              Generated on {new Date().toLocaleDateString()} • {reportData.cases.length} cases included
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Summary Statistics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cases</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData.summary.totalCases}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Recovered</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${reportData.summary.totalRecovered.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData.summary.averageDuration} days</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(reportData.summary.successRate * 100).toFixed(1)}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Table */}
        <Card>
          <CardHeader>
            <CardTitle>Case Details</CardTitle>
            <CardDescription>
              Detailed breakdown of cases included in this report
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Case ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Party</TableHead>
                    <TableHead>Officer</TableHead>
                    <TableHead>Date Opened</TableHead>
                    <TableHead>Next Hearing</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.cases.map((courtCase) => (
                    <TableRow key={courtCase.caseID}>
                      <TableCell className="font-medium">{courtCase.caseID}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{courtCase.caseType}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(courtCase.caseStatus) as any}>
                          {courtCase.caseStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {courtCase.employerName || courtCase.contributorName || 'N/A'}
                      </TableCell>
                      <TableCell>{courtCase.officerAssigned}</TableCell>
                      <TableCell>{courtCase.dateOpened}</TableCell>
                      <TableCell>
                        {courtCase.nextHearingDate ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {courtCase.nextHearingDate}
                          </div>
                        ) : (
                          'Not scheduled'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Additional Analysis */}
        {reportType === 'case-duration' && (
          <Card>
            <CardHeader>
              <CardTitle>Duration Analysis</CardTitle>
              <CardDescription>Case completion times by status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">30</div>
                    <div className="text-sm text-muted-foreground">Days (Fast Track)</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">45</div>
                    <div className="text-sm text-muted-foreground">Days (Average)</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-red-600">60+</div>
                    <div className="text-sm text-muted-foreground">Days (Complex)</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {reportType === 'officer-performance' && (
          <Card>
            <CardHeader>
              <CardTitle>Officer Performance</CardTitle>
              <CardDescription>Cases handled and success rates by officer</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {['Sarah Johnson', 'David Thompson', 'Lisa Rodriguez'].map((officer) => (
                  <div key={officer} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{officer}</p>
                      <p className="text-sm text-muted-foreground">Legal Officer</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">85% Success Rate</p>
                      <p className="text-sm text-muted-foreground">12 cases handled</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/legal-final')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Legal Reports</h1>
          <p className="text-muted-foreground">Generate comprehensive legal case reports</p>
        </div>
      </div>

      {/* Report Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Report Configuration
          </CardTitle>
          <CardDescription>
            Select report type and date range to generate your report
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Report Type</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Date From (Optional)</label>
              <Input
                type="date"
                value={dateFrom ? dateFrom.toISOString().split('T')[0] : ''}
                onChange={(e) => setDateFrom(e.target.value ? new Date(e.target.value) : undefined)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Date To (Optional)</label>
              <Input
                type="date"
                value={dateTo ? dateTo.toISOString().split('T')[0] : ''}
                onChange={(e) => setDateTo(e.target.value ? new Date(e.target.value) : undefined)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Generate Report</label>
              <Button onClick={generateReport} disabled={loading} className="w-full">
                {loading ? 'Generating...' : 'Generate Report'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      {renderReportContent()}
    </div>
  );
};
