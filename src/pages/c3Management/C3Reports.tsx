import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Filter, Calendar, Users, TrendingUp } from "lucide-react";
import { useState } from "react";

export default function C3Reports() {
  const [reportType, setReportType] = useState("");
  const [dateRange, setDateRange] = useState("");
  const [status, setStatus] = useState("");

  const mockReports = [
    {
      id: "RPT-001",
      title: "Monthly C3 Summary",
      period: "2024-01",
      generatedDate: "2024-01-31",
      status: "Generated",
      recordCount: 1257
    },
    {
      id: "RPT-002", 
      title: "Pending Verification Report",
      period: "2024-01",
      generatedDate: "2024-01-30",
      status: "Generated",
      recordCount: 56
    },
    {
      id: "RPT-003",
      title: "Employer Contribution Analysis",
      period: "2024-Q1",
      generatedDate: "2024-01-29",
      status: "In Progress",
      recordCount: 850
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Generated":
        return <Badge className="bg-green-100 text-green-800">Generated</Badge>;
      case "In Progress":
        return <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>;
      case "Failed":
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">C3 Reports</h1>
          <p className="text-muted-foreground">Generate and manage C3 contribution reports</p>
        </div>
        <Button className="gap-2">
          <FileText className="h-4 w-4" />
          Generate New Report
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Generated Reports</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">21</div>
            <p className="text-xs text-muted-foreground">91% success rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Records Processed</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,163</div>
            <p className="text-xs text-muted-foreground">Total C3 records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Generated</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Today</div>
            <p className="text-xs text-muted-foreground">Monthly summary</p>
          </CardContent>
        </Card>
      </div>

      {/* Report Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Report Type</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Report Types" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-md z-50">
                  <SelectItem value="summary">Monthly Summary</SelectItem>
                  <SelectItem value="verification">Verification Reports</SelectItem>
                  <SelectItem value="analysis">Analysis Reports</SelectItem>
                  <SelectItem value="compliance">Compliance Reports</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue placeholder="All Dates" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-md z-50">
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-md z-50">
                  <SelectItem value="generated">Generated</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button className="w-full gap-2">
                <Filter className="h-4 w-4" />
                Apply Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>Generated Reports</CardTitle>
          <CardDescription>View and download previously generated C3 reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Generated Date</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">{report.id}</TableCell>
                    <TableCell>{report.title}</TableCell>
                    <TableCell>{report.period}</TableCell>
                    <TableCell>{report.generatedDate}</TableCell>
                    <TableCell>{report.recordCount.toLocaleString()}</TableCell>
                    <TableCell>{getStatusBadge(report.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="gap-1">
                          <Download className="h-3 w-3" />
                          Download
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Report Generation */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Report Generation</CardTitle>
          <CardDescription>Generate common C3 reports instantly</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button variant="outline" className="h-20 flex flex-col gap-2">
              <FileText className="h-6 w-6" />
              <span>Monthly Summary</span>
            </Button>
            
            <Button variant="outline" className="h-20 flex flex-col gap-2">
              <Users className="h-6 w-6" />
              <span>Pending Verification</span>
            </Button>

            <Button variant="outline" className="h-20 flex flex-col gap-2">
              <TrendingUp className="h-6 w-6" />
              <span>Contribution Analysis</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}