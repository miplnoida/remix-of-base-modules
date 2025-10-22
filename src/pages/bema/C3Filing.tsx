import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Download,
  Filter,
  Send,
  Eye,
  FileCheck,
  XCircle,
  AlertTriangle,
  Users,
  Calendar,
  Mail,
  Paperclip,
  ArrowRight
} from "lucide-react";
import { BackNavigation } from "@/components/ui/back-navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const c3Submissions = [
  { 
    id: "C3-2025-156", 
    employer: "ABC Construction Ltd", 
    employerId: "EMP-2031",
    period: "2025-06", 
    submitted: "2025-06-15",
    status: "validated",
    employees: 45,
    totalWages: 125000,
    totalContrib: 18750,
    validationScore: 98,
    arrearsFlag: false,
    autoChecks: { missingSsn: 0, fiveWeekError: 0, over62Levy: 0, missingHoliday: 0 },
    assignedTo: "Maria Rodriguez"
  },
  { 
    id: "C3-2025-157", 
    employer: "XYZ Services Inc", 
    employerId: "EMP-1842",
    period: "2025-06", 
    submitted: "2025-06-14",
    status: "query_raised",
    employees: 12,
    totalWages: 48000,
    totalContrib: 7200,
    validationScore: 72,
    arrearsFlag: true,
    autoChecks: { missingSsn: 2, fiveWeekError: 0, over62Levy: 1, missingHoliday: 0 },
    assignedTo: "Carlos Martinez",
    queryRaised: "2025-06-16",
    queryStatus: "In Progress"
  },
  { 
    id: "C3-2025-158", 
    employer: "Tech Solutions Co", 
    employerId: "EMP-3245",
    period: "2025-06", 
    submitted: "2025-06-18",
    status: "pending",
    employees: 28,
    totalWages: 89000,
    totalContrib: 13350,
    validationScore: 0,
    arrearsFlag: false,
    autoChecks: { missingSsn: 0, fiveWeekError: 0, over62Levy: 0, missingHoliday: 0 },
    assignedTo: "Pending"
  },
  { 
    id: "C3-2025-159", 
    employer: "Green Valley Farms", 
    employerId: "EMP-1923",
    period: "2025-06", 
    submitted: "2025-06-12",
    status: "query_raised",
    employees: 67,
    totalWages: 142000,
    totalContrib: 21300,
    validationScore: 65,
    arrearsFlag: false,
    autoChecks: { missingSsn: 5, fiveWeekError: 1, over62Levy: 2, missingHoliday: 1 },
    assignedTo: "Sarah Johnson",
    queryRaised: "2025-06-13",
    queryStatus: "Assigned"
  },
  { 
    id: "C3-2025-160", 
    employer: "Marina Hotel Group", 
    employerId: "EMP-2714",
    period: "2025-06", 
    submitted: "2025-06-10",
    status: "resolved",
    employees: 152,
    totalWages: 456000,
    totalContrib: 68400,
    validationScore: 95,
    arrearsFlag: false,
    autoChecks: { missingSsn: 0, fiveWeekError: 0, over62Levy: 0, missingHoliday: 0 },
    assignedTo: "David Chen",
    queryRaised: "2025-06-11",
    queryResolved: "2025-06-17",
    queryStatus: "Resolved"
  },
  { 
    id: "C3-2025-161", 
    employer: "Coastal Shipping Ltd", 
    employerId: "EMP-3891",
    period: "2025-06", 
    submitted: "2025-06-19",
    status: "escalated",
    employees: 34,
    totalWages: 98000,
    totalContrib: 14700,
    validationScore: 45,
    arrearsFlag: true,
    autoChecks: { missingSsn: 8, fiveWeekError: 2, over62Levy: 3, missingHoliday: 1 },
    assignedTo: "Ana Silva",
    queryRaised: "2025-06-20",
    queryStatus: "Escalated",
    escalatedReason: "Multiple unresolved issues"
  },
];

export default function BemaC3Filing() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedC3, setSelectedC3] = useState<any>(null);
  const [queryDialogOpen, setQueryDialogOpen] = useState(false);

  const getStatusBadge = (status: string) => {
    const badges = {
      validated: { variant: "bg-green-100 text-green-800", label: "Validated", icon: CheckCircle },
      query_raised: { variant: "bg-amber-100 text-amber-800", label: "Query Raised", icon: AlertCircle },
      pending: { variant: "bg-blue-100 text-blue-800", label: "Pending Review", icon: Clock },
      resolved: { variant: "bg-green-100 text-green-800", label: "Resolved", icon: CheckCircle },
      escalated: { variant: "bg-red-100 text-red-800", label: "Escalated", icon: AlertTriangle },
    };
    
    const badge = badges[status as keyof typeof badges] || { variant: "bg-gray-100 text-gray-800", label: status, icon: FileText };
    const Icon = badge.icon;
    
    return (
      <Badge className={`${badge.variant} hover:opacity-80 flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {badge.label}
      </Badge>
    );
  };

  const getValidationColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-amber-600";
    if (score > 0) return "text-red-600";
    return "text-muted-foreground";
  };

  const filteredSubmissions = c3Submissions.filter(c3 => {
    const matchesSearch = c3.employer.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         c3.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c3.employerId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || c3.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: c3Submissions.length,
    validated: c3Submissions.filter(c => c.status === "validated").length,
    queries: c3Submissions.filter(c => c.status === "query_raised").length,
    pending: c3Submissions.filter(c => c.status === "pending").length,
    escalated: c3Submissions.filter(c => c.status === "escalated").length,
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <BackNavigation />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg">
        <div className="container mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold mb-2">C3 Filing Review & Query Center</h1>
          <p className="text-purple-100">Centralized validation and monitoring of employer C3 submissions</p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Stats Row */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-0 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">This period</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-0 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Validated</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.validated}</div>
              <p className="text-xs text-muted-foreground mt-1">Auto-passed</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-0 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Queries Raised</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">{stats.queries}</div>
              <p className="text-xs text-muted-foreground mt-1">Needs review</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-0 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Pending Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats.pending}</div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting validation</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-0 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Escalated</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{stats.escalated}</div>
              <p className="text-xs text-muted-foreground mt-1">To arrears</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Actions */}
        <Card className="shadow-md">
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex-1 flex flex-wrap gap-3">
                <div className="flex-1 min-w-[250px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by C3 ID, employer name, or ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="validated">Validated</SelectItem>
                    <SelectItem value="query_raised">Query Raised</SelectItem>
                    <SelectItem value="pending">Pending Review</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="escalated">Escalated</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={() => toast.success("Exporting to Excel...")}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Excel
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => toast.success("Exporting to PDF...")}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* C3 Submissions Table */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>C3 Submissions ({filteredSubmissions.length})</CardTitle>
            <CardDescription>Review validation results and manage queries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>C3 ID</TableHead>
                    <TableHead>Employer</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Employees</TableHead>
                    <TableHead className="text-right">Total Wages</TableHead>
                    <TableHead className="text-right">Contribution</TableHead>
                    <TableHead className="text-center">Validation</TableHead>
                    <TableHead className="text-center">Auto Checks</TableHead>
                    <TableHead className="text-center">Arrears</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubmissions.map((c3) => {
                    const totalIssues = Object.values(c3.autoChecks).reduce((a, b) => a + b, 0);
                    
                    return (
                      <TableRow key={c3.id} className="hover:bg-muted/50">
                        <TableCell className="font-mono text-sm font-semibold">{c3.id}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{c3.employer}</p>
                            <p className="text-xs text-muted-foreground">{c3.employerId}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{c3.period}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(c3.status)}
                        </TableCell>
                        <TableCell className="text-right font-medium">{c3.employees}</TableCell>
                        <TableCell className="text-right font-medium">
                          ${c3.totalWages.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          ${c3.totalContrib.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          {c3.validationScore > 0 ? (
                            <div className={`text-2xl font-bold ${getValidationColor(c3.validationScore)}`}>
                              {c3.validationScore}
                            </div>
                          ) : (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {totalIssues > 0 ? (
                            <div className="flex flex-col items-center gap-1">
                              <Badge variant="destructive" className="w-8 h-8 rounded-full flex items-center justify-center">
                                {totalIssues}
                              </Badge>
                              <span className="text-xs text-muted-foreground">issues</span>
                            </div>
                          ) : (
                            <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {c3.arrearsFlag ? (
                            <Badge variant="destructive">Yes</Badge>
                          ) : (
                            <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-foreground">{c3.assignedTo}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedC3(c3);
                                toast.info(`Viewing C3-${c3.id.split('-')[2]} details...`);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {(c3.status === "query_raised" || totalIssues > 0) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedC3(c3);
                                  setQueryDialogOpen(true);
                                }}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            )}
                            {c3.status === "escalated" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toast.warning("Escalating to arrears ledger...")}
                              >
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Query Queue Section */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Query Queue Management</CardTitle>
            <CardDescription>Track and resolve C3 queries with employers</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="assigned">
              <TabsList>
                <TabsTrigger value="assigned">Assigned</TabsTrigger>
                <TabsTrigger value="in_progress">In Progress</TabsTrigger>
                <TabsTrigger value="resolved">Resolved</TabsTrigger>
              </TabsList>

              <TabsContent value="assigned" className="mt-4">
                <div className="space-y-3">
                  {c3Submissions.filter(c => c.queryStatus === "Assigned").map((c3) => (
                    <div key={c3.id} className="p-4 border rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{c3.id}</Badge>
                            <span className="font-semibold text-foreground">{c3.employer}</span>
                            <Badge className="bg-amber-100 text-amber-800">New</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            Period: {c3.period} | Raised: {c3.queryRaised} | Assigned to: {c3.assignedTo}
                          </p>
                          <div className="flex gap-2 flex-wrap">
                            {c3.autoChecks.missingSsn > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {c3.autoChecks.missingSsn} Missing SSN
                              </Badge>
                            )}
                            {c3.autoChecks.fiveWeekError > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {c3.autoChecks.fiveWeekError} Five-Week Error
                              </Badge>
                            )}
                            {c3.autoChecks.over62Levy > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {c3.autoChecks.over62Levy} Over-62 Levy
                              </Badge>
                            )}
                            {c3.autoChecks.missingHoliday > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {c3.autoChecks.missingHoliday} Missing Holiday
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button 
                          size="sm"
                          onClick={() => {
                            setSelectedC3(c3);
                            setQueryDialogOpen(true);
                          }}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Send Query
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="in_progress" className="mt-4">
                <div className="space-y-3">
                  {c3Submissions.filter(c => c.queryStatus === "In Progress").map((c3) => (
                    <div key={c3.id} className="p-4 border rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{c3.id}</Badge>
                            <span className="font-semibold text-foreground">{c3.employer}</span>
                            <Badge className="bg-blue-100 text-blue-800">Awaiting Response</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Query sent: {c3.queryRaised} | Assigned to: {c3.assignedTo}
                          </p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => toast.info("Opening communication history...")}
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          View Correspondence
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="resolved" className="mt-4">
                <div className="space-y-3">
                  {c3Submissions.filter(c => c.queryStatus === "Resolved").map((c3) => (
                    <div key={c3.id} className="p-4 border rounded-lg bg-green-50 hover:bg-green-100 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{c3.id}</Badge>
                            <span className="font-semibold text-foreground">{c3.employer}</span>
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Resolved
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Raised: {c3.queryRaised} | Resolved: {c3.queryResolved} | By: {c3.assignedTo}
                          </p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => toast.success("Viewing resolution details...")}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Query Dialog */}
      <Dialog open={queryDialogOpen} onOpenChange={setQueryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Raise C3 Query</DialogTitle>
            <DialogDescription>
              Send validation query to {selectedC3?.employer} for {selectedC3?.id}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid gap-4">
              <div>
                <Label>Query Type</Label>
                <Select defaultValue="validation">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="validation">Validation Issues</SelectItem>
                    <SelectItem value="missing_data">Missing Data</SelectItem>
                    <SelectItem value="clarification">Clarification Needed</SelectItem>
                    <SelectItem value="discrepancy">Discrepancy Found</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Query Message</Label>
                <Textarea 
                  placeholder="Describe the issues found during validation..."
                  rows={5}
                  className="resize-none"
                />
              </div>

              <div>
                <Label>Attach Documents</Label>
                <div className="mt-2 flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Paperclip className="h-4 w-4 mr-2" />
                    Attach Notice
                  </Button>
                  <Button variant="outline" size="sm">
                    <Paperclip className="h-4 w-4 mr-2" />
                    Attach Letter
                  </Button>
                </div>
              </div>

              {selectedC3 && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-semibold mb-2">Auto-Validation Issues Detected:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedC3.autoChecks.missingSsn > 0 && (
                      <div className="text-sm">• Missing SSN: {selectedC3.autoChecks.missingSsn}</div>
                    )}
                    {selectedC3.autoChecks.fiveWeekError > 0 && (
                      <div className="text-sm">• Five-Week Error: {selectedC3.autoChecks.fiveWeekError}</div>
                    )}
                    {selectedC3.autoChecks.over62Levy > 0 && (
                      <div className="text-sm">• Over-62 Levy: {selectedC3.autoChecks.over62Levy}</div>
                    )}
                    {selectedC3.autoChecks.missingHoliday > 0 && (
                      <div className="text-sm">• Missing Holiday: {selectedC3.autoChecks.missingHoliday}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setQueryDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                toast.success("Query sent to employer successfully");
                setQueryDialogOpen(false);
              }}
            >
              <Send className="h-4 w-4 mr-2" />
              Send Query
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
