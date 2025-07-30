import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, Clock, AlertCircle, Eye, Check, X, MessageSquare } from "lucide-react";

export default function C3Verification() {
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const mockPendingRecords = [
    {
      id: "C3-2024-005",
      payerId: "EMP005",
      payerName: "Tech Solutions Ltd",
      type: "Employer",
      period: "2024-01",
      dateSubmitted: "2024-01-20",
      submittedBy: "Sarah Johnson",
      amount: 18750.00,
      employeeCount: 45,
      status: "Pending Review",
      priority: "High"
    },
    {
      id: "C3-2024-006",
      payerId: "SE006",
      payerName: "Freelance Designer",
      type: "Self-Employed",
      period: "2024-01",
      dateSubmitted: "2024-01-19",
      submittedBy: "Michael Brown",
      amount: 3200.00,
      employeeCount: 1,
      status: "Pending Verification",
      priority: "Medium"
    },
    {
      id: "C3-2024-007",
      payerId: "VOL007",
      payerName: "John Doe",
      type: "Voluntary Contribution",
      period: "2024-01",
      dateSubmitted: "2024-01-18",
      submittedBy: "System",
      amount: 1500.00,
      employeeCount: 1,
      status: "Needs Clarification",
      priority: "Low"
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending Review":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending Review</Badge>;
      case "Pending Verification":
        return <Badge className="bg-blue-100 text-blue-800">Pending Verification</Badge>;
      case "Needs Clarification":
        return <Badge className="bg-orange-100 text-orange-800">Needs Clarification</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "High":
        return <Badge className="bg-red-100 text-red-800">High</Badge>;
      case "Medium":
        return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
      case "Low":
        return <Badge className="bg-green-100 text-green-800">Low</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{priority}</Badge>;
    }
  };

  const handleApprove = (record: any) => {
    console.log("Approving record:", record);
  };

  const handleReject = (record: any) => {
    console.log("Rejecting record:", record);
  };

  const handleRequestClarification = (record: any) => {
    console.log("Requesting clarification for:", record);
  };

  const handleView = (record: any) => {
    console.log("Viewing record:", record);
  };

  const filteredRecords = mockPendingRecords.filter(record => {
    const matchesSearch = record.payerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || record.status.toLowerCase().includes(statusFilter.toLowerCase());
    const matchesType = !typeFilter || record.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Verification Queue</h1>
          <p className="text-muted-foreground">Review and verify pending C3 contribution records</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">12</div>
            <p className="text-xs text-muted-foreground">Awaiting initial review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Verification</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">8</div>
            <p className="text-xs text-muted-foreground">Awaiting final verification</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Clarification</CardTitle>
            <MessageSquare className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">5</div>
            <p className="text-xs text-muted-foreground">Requires additional info</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">15</div>
            <p className="text-xs text-muted-foreground">Completed verifications</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <Input
                placeholder="Search by Payer Name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-md z-50">
                  <SelectItem value="">All Statuses</SelectItem>
                  <SelectItem value="pending review">Pending Review</SelectItem>
                  <SelectItem value="pending verification">Pending Verification</SelectItem>
                  <SelectItem value="needs clarification">Needs Clarification</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-md z-50">
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="Employer">Employer</SelectItem>
                  <SelectItem value="Self-Employed">Self-Employed</SelectItem>
                  <SelectItem value="Voluntary Contribution">Voluntary Contribution</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("");
                  setTypeFilter("");
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verification Queue Table */}
      <Card>
        <CardHeader>
          <CardTitle>Verification Queue</CardTitle>
          <CardDescription>Records awaiting verification or review</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>C3 ID</TableHead>
                  <TableHead>Payer Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Date Submitted</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.id}</TableCell>
                    <TableCell>{record.payerName}</TableCell>
                    <TableCell>{record.type}</TableCell>
                    <TableCell>{record.period}</TableCell>
                    <TableCell>{record.dateSubmitted}</TableCell>
                    <TableCell>${record.amount.toLocaleString()}</TableCell>
                    <TableCell>{record.employeeCount}</TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                    <TableCell>{getPriorityBadge(record.priority)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleView(record)}
                          className="gap-1"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleApprove(record)}
                          className="gap-1 text-green-600 hover:text-green-700"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleReject(record)}
                          className="gap-1 text-red-600 hover:text-red-700"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleRequestClarification(record)}
                          className="gap-1"
                        >
                          <MessageSquare className="h-3 w-3" />
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

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Batch operations for verification queue</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-16 flex flex-col gap-2">
              <CheckCircle className="h-5 w-5" />
              <span>Approve All Low Priority</span>
            </Button>
            
            <Button variant="outline" className="h-16 flex flex-col gap-2">
              <MessageSquare className="h-5 w-5" />
              <span>Send Bulk Notifications</span>
            </Button>

            <Button variant="outline" className="h-16 flex flex-col gap-2">
              <AlertCircle className="h-5 w-5" />
              <span>Escalate High Priority</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}