
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Download, 
  FileText, 
  BarChart3, 
  Receipt,
  Building2,
  Users,
  PieChart,
  DollarSign,
  Filter,
  Search,
  Calendar
} from 'lucide-react';

const ReportsHub = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  // Sample data for different report categories
  const reportCategories = {
    claims: {
      title: "Claims Administration Reports",
      icon: FileText,
      reports: [
        { name: "Ben Cheques By Cheque Number", lastRun: "2024-01-15", format: "PDF" },
        { name: "Ben Cheques By Cheque Number(Rev)", lastRun: "2024-01-14", format: "Excel" },
        { name: "Ben Cheques By Island Report", lastRun: "2024-01-13", format: "PDF" },
        { name: "Ben Cheques By Name Report", lastRun: "2024-01-12", format: "Excel" },
        { name: "Ben Cheques By SSN", lastRun: "2024-01-11", format: "PDF" },
        { name: "Ben Cheques By Name Report", lastRun: "2024-01-10", format: "Excel" },
        { name: "Benefit Claims Status By Inspector", lastRun: "2024-01-09", format: "PDF" },
        { name: "Benefit Payment Report", lastRun: "2024-01-08", format: "Excel" },
        { name: "Cheques Summary by Survivor Type", lastRun: "2024-01-07", format: "PDF" },
        { name: "Claim Delay Letter", lastRun: "2024-01-06", format: "Word" },
        { name: "Claim Processing Control Report", lastRun: "2024-01-05", format: "Excel" },
        { name: "Claims Adjustment", lastRun: "2024-01-04", format: "PDF" },
        { name: "Claims Approved", lastRun: "2024-01-03", format: "Excel" },
        { name: "Claims Approved by Officers", lastRun: "2024-01-02", format: "PDF" },
        { name: "Claims Disallowance", lastRun: "2024-01-01", format: "Excel" },
        { name: "Claims Disallowance Letter", lastRun: "2023-12-31", format: "Word" },
        { name: "Claims Entered by Officers", lastRun: "2023-12-30", format: "PDF" },
        { name: "Claims Modified by Officers", lastRun: "2023-12-29", format: "Excel" },
        { name: "Claims Modified for Period", lastRun: "2023-12-28", format: "PDF" },
        { name: "Claims paid by Waiting Period", lastRun: "2023-12-27", format: "Excel" },
        { name: "Claims Processed by Officers", lastRun: "2023-12-26", format: "PDF" },
        { name: "Claims received by type for period", lastRun: "2023-12-25", format: "Excel" },
        { name: "Claims Verified by Officers", lastRun: "2023-12-24", format: "PDF" },
        { name: "Claims Void Report", lastRun: "2023-12-23", format: "Excel" },
        { name: "Delivery of ASS Pension Payable", lastRun: "2023-12-22", format: "PDF" },
        { name: "Direct Deposit Bank Letter", lastRun: "2023-12-21", format: "Word" },
        { name: "Direct Deposit Bank List", lastRun: "2023-12-20", format: "Excel" },
        { name: "Existing Pensioners Report", lastRun: "2023-12-19", format: "PDF" },
        { name: "List of Cashed Cheques (Date Issue)", lastRun: "2023-12-18", format: "Excel" },
        { name: "List of Cashed Cheques", lastRun: "2023-12-17", format: "PDF" },
        { name: "List of Cashed Cheques (Chq Num)", lastRun: "2023-12-16", format: "Excel" },
        { name: "List of Cashed Cheques (Summary)", lastRun: "2023-12-15", format: "PDF" },
        { name: "List of Issued Cheques", lastRun: "2023-12-14", format: "Excel" },
        { name: "List of Outstanding Cheques", lastRun: "2023-12-13", format: "PDF" },
        { name: "List of Registered Postal Packets", lastRun: "2023-12-12", format: "Excel" },
        { name: "List of Stale Cheques", lastRun: "2023-12-11", format: "PDF" },
        { name: "Pension Award Letter", lastRun: "2023-12-10", format: "Word" },
        { name: "Posting List", lastRun: "2023-12-09", format: "Excel" },
        { name: "Self-Employed Claims", lastRun: "2023-12-08", format: "PDF" },
        { name: "Short Term Benefits Payments", lastRun: "2023-12-07", format: "Excel" },
        { name: "STB Posting List", lastRun: "2023-12-06", format: "PDF" },
        { name: "Summary Of Ben Cheques", lastRun: "2023-12-05", format: "Excel" },
        { name: "Summary Report of Outstanding Cheques", lastRun: "2023-12-04", format: "PDF" },
        { name: "Survivor Children born", lastRun: "2023-12-03", format: "Excel" }
      ]
    },
    cashier: {
      title: "Cashier Reports",
      icon: Receipt,
      reports: [
        { name: "Arrears (Accountant General)", lastRun: "2024-01-15", format: "Excel" },
        { name: "Arrears (Levy)", lastRun: "2024-01-14", format: "PDF" },
        { name: "Arrears (Levy) - Estimate", lastRun: "2024-01-13", format: "Excel" },
        { name: "Arrears (Severance)", lastRun: "2024-01-12", format: "PDF" },
        { name: "Arrears (Severance) - Estimate", lastRun: "2024-01-11", format: "Excel" },
        { name: "Arrears (Social Security - SE) - Estimate", lastRun: "2024-01-10", format: "PDF" },
        { name: "Arrears (Social Security)", lastRun: "2024-01-09", format: "Excel" },
        { name: "Arrears (Social Security) - Estimate", lastRun: "2024-01-08", format: "PDF" },
        { name: "Arrears by Zone or Inspectors", lastRun: "2024-01-07", format: "Excel" },
        { name: "C3 Data Entry Production Summary", lastRun: "2024-01-06", format: "PDF" },
        { name: "Cashier Receipt Report (Acc. Gen)", lastRun: "2024-01-05", format: "Excel" },
        { name: "Cashier Receipt Report (Social Sec)", lastRun: "2024-01-04", format: "PDF" },
        { name: "Cashier Receipt Report (SS With Period)", lastRun: "2024-01-03", format: "Excel" },
        { name: "Cashier Receipt Summary (Acc. Gen)", lastRun: "2024-01-02", format: "PDF" },
        { name: "Cashier Receipt Summary (Social Sec)", lastRun: "2024-01-01", format: "Excel" },
        { name: "Daily Cash Report", lastRun: "2023-12-31", format: "PDF" },
        { name: "Daily List Of Transactions", lastRun: "2023-12-30", format: "Excel" },
        { name: "Employer Payment History", lastRun: "2023-12-29", format: "PDF" },
        { name: "Missing C3 (Accountant General)", lastRun: "2023-12-28", format: "Excel" },
        { name: "Missing C3 (Social Security)", lastRun: "2023-12-27", format: "PDF" }
      ]
    },
    employer: {
      title: "Employer Administration Reports",
      icon: Building2,
      reports: [
        { name: "Active Employer List by Zone", lastRun: "2024-01-15", format: "Excel" },
        { name: "C3 Status Report", lastRun: "2024-01-14", format: "PDF" },
        { name: "Compliance Legal Action", lastRun: "2024-01-13", format: "Excel" },
        { name: "Data Entry Production Report Detail", lastRun: "2024-01-12", format: "PDF" },
        { name: "Electronic C3 Exception Report", lastRun: "2024-01-11", format: "Excel" },
        { name: "Employee Listing", lastRun: "2024-01-10", format: "PDF" },
        { name: "Employer Account Details (Levy)", lastRun: "2024-01-09", format: "Excel" },
        { name: "Employer Account Details (Soc Security)", lastRun: "2024-01-08", format: "PDF" },
        { name: "Employer Account Details (Social Security)", lastRun: "2024-01-07", format: "Excel" },
        { name: "Employer Account Details (Social Security) - EST", lastRun: "2024-01-06", format: "PDF" },
        { name: "Employer Account Summary", lastRun: "2024-01-05", format: "Excel" },
        { name: "Employer C3 Submission History", lastRun: "2024-01-04", format: "PDF" },
        { name: "Employer Liability Report", lastRun: "2024-01-03", format: "Excel" },
        { name: "Employer List by Status, Zone, Sect", lastRun: "2024-01-02", format: "PDF" },
        { name: "Employer Listing", lastRun: "2024-01-01", format: "Excel" },
        { name: "Employer Notice of Penalty", lastRun: "2023-12-31", format: "PDF" },
        { name: "Employer Penalty Notice Summary", lastRun: "2023-12-30", format: "Excel" },
        { name: "Employer Registration Activity", lastRun: "2023-12-29", format: "PDF" },
        { name: "Employer Status Listing", lastRun: "2023-12-28", format: "Excel" },
        { name: "Estimated Empl Liability Statement", lastRun: "2023-12-27", format: "PDF" },
        { name: "List of Active Employer By Island", lastRun: "2023-12-26", format: "Excel" }
      ]
    },
    persons: {
      title: "Insured Persons Administration Reports",
      icon: Users,
      reports: [
        { name: "Acknowledgment Letter", lastRun: "2024-01-15", format: "Word" },
        { name: "Assistance Pensioner Activity", lastRun: "2024-01-14", format: "Excel" },
        { name: "Employer Annual Contribution Statement", lastRun: "2024-01-13", format: "PDF" },
        { name: "Insured Person Listing", lastRun: "2024-01-12", format: "Excel" },
        { name: "Insured Person Registration Details", lastRun: "2024-01-11", format: "PDF" },
        { name: "Insured Person Statement", lastRun: "2024-01-10", format: "Excel" },
        { name: "IP Contribution Campaign", lastRun: "2024-01-09", format: "PDF" },
        { name: "IP Contribution Statement", lastRun: "2024-01-08", format: "Excel" },
        { name: "List Of Active Pensioners", lastRun: "2024-01-07", format: "PDF" },
        { name: "List Of Active Pensioners Abroad", lastRun: "2024-01-06", format: "Excel" },
        { name: "List of All Self Employed Activity", lastRun: "2024-01-05", format: "PDF" },
        { name: "Pensionable person confirmation", lastRun: "2024-01-04", format: "Word" },
        { name: "Persons Approaching Pensionable Age", lastRun: "2024-01-03", format: "Excel" },
        { name: "Persons Approaching Pensionable Age Letter", lastRun: "2024-01-02", format: "Word" },
        { name: "Registration Letter", lastRun: "2024-01-01", format: "Word" },
        { name: "Self Employed Account Summary", lastRun: "2023-12-31", format: "Excel" },
        { name: "Self Employed Acct. Details (Levy)", lastRun: "2023-12-30", format: "PDF" },
        { name: "Self Employed Acct. Details (Severance)", lastRun: "2023-12-29", format: "Excel" },
        { name: "Self Employed Acct. Details (SS)", lastRun: "2023-12-28", format: "PDF" },
        { name: "Self Employed Cleared Activity", lastRun: "2023-12-27", format: "Excel" },
        { name: "Self Employed Est. Liability Stmt", lastRun: "2023-12-26", format: "PDF" },
        { name: "Self Employed Liability", lastRun: "2023-12-25", format: "Excel" },
        { name: "Self Employed Liability Statement", lastRun: "2023-12-24", format: "PDF" },
        { name: "Self Employed Registration Details", lastRun: "2023-12-23", format: "Excel" },
        { name: "Voluntary Contribution Statement", lastRun: "2023-12-22", format: "PDF" },
        { name: "Social Listing Report", lastRun: "2023-12-21", format: "Excel" }
      ]
    },
    statistics: {
      title: "Statistics Reports",
      icon: PieChart,
      reports: [
        { name: "Age Distribution - Registration date", lastRun: "2024-01-15", format: "Excel" },
        { name: "Benefits Paid To Employee by Sex", lastRun: "2024-01-14", format: "PDF" },
        { name: "Employer Distribution by Industry", lastRun: "2024-01-13", format: "Excel" },
        { name: "Employment by Sector", lastRun: "2024-01-12", format: "PDF" },
        { name: "Long Term Benefits Paid To Employee", lastRun: "2024-01-11", format: "Excel" },
        { name: "Relative Wage Trend Employed Staff", lastRun: "2024-01-10", format: "PDF" },
        { name: "Short Term Benefits Paid To Employee", lastRun: "2024-01-09", format: "Excel" },
        { name: "Sickness Benefit Paid by Age Group", lastRun: "2024-01-08", format: "PDF" },
        { name: "Summary of Claims Paid", lastRun: "2024-01-07", format: "Excel" },
        { name: "Summary of Claims Received", lastRun: "2024-01-06", format: "PDF" },
        { name: "Tab17 - Number of persons", lastRun: "2024-01-05", format: "Excel" },
        { name: "Tab18 - Age Distribution", lastRun: "2024-01-04", format: "PDF" },
        { name: "Tab19 - Density Factors", lastRun: "2024-01-03", format: "Excel" },
        { name: "Tab20 - Avg. Insurable Earnings(a)", lastRun: "2024-01-02", format: "PDF" },
        { name: "Tab21 - Avg. Insurable Earnings(b)", lastRun: "2024-01-01", format: "Excel" },
        { name: "Tab22 - Past Insurable Credits", lastRun: "2023-12-31", format: "PDF" },
        { name: "Tab22 - Past Insurable Credits(a)", lastRun: "2023-12-30", format: "Excel" },
        { name: "Tab23 - Past Insurable Credits(b)", lastRun: "2023-12-29", format: "PDF" },
        { name: "Tab24 - New Entrants Historical", lastRun: "2023-12-28", format: "Excel" }
      ]
    }
  };

  const generateReport = (reportName: string, category: string) => {
    console.log(`Generating ${reportName} from ${category} category...`);
    // In a real application, this would trigger report generation
  };

  const filteredReports = (reports: any[]) => {
    return reports.filter(report => 
      report.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
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
                onClick={() => navigate("/")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <nav className="flex items-center space-x-2 text-sm text-gray-500">
                <span>Reports & Analytics</span>
                <span>/</span>
                <span className="text-gray-900 font-medium">All Reports</span>
              </nav>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search reports..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics Hub</h1>
          <p className="text-gray-600">Access all system reports and analytics across different modules</p>
        </div>

        <Tabs defaultValue="claims" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="claims">Claims</TabsTrigger>
            <TabsTrigger value="cashier">Cashier</TabsTrigger>
            <TabsTrigger value="employer">Employer</TabsTrigger>
            <TabsTrigger value="persons">Persons</TabsTrigger>
            <TabsTrigger value="statistics">Statistics</TabsTrigger>
          </TabsList>

          {Object.entries(reportCategories).map(([key, category]) => (
            <TabsContent key={key} value={key} className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <category.icon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{category.title}</CardTitle>
                      <CardDescription>
                        {filteredReports(category.reports).length} reports available
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Report Name</TableHead>
                        <TableHead>Last Run</TableHead>
                        <TableHead>Format</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReports(category.reports).map((report, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{report.name}</TableCell>
                          <TableCell>{report.lastRun}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{report.format}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => generateReport(report.name, key)}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Generate
                              </Button>
                              <Button size="sm" variant="ghost">
                                <Calendar className="h-4 w-4 mr-1" />
                                Schedule
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

export default ReportsHub;
