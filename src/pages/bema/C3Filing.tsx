import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Search,
  Download,
  Filter,
  Send,
  XCircle
} from "lucide-react";
import { useState } from "react";

interface C3Submission {
  id: string;
  employerId: string;
  employerName: string;
  period: string;
  submittedDate: string;
  status: "pending" | "validated" | "queried" | "posted";
  validationScore: number;
  issues: string[];
  totalContributions: number;
  employeeCount: number;
}

const mockC3Submissions: C3Submission[] = [
  {
    id: "C3-2025-001",
    employerId: "EMP-1001",
    employerName: "Caribbean Hotel Group",
    period: "January 2025",
    submittedDate: "2025-02-01",
    status: "queried",
    validationScore: 75,
    issues: ["Missing SSNs (3)", "Five-week month error"],
    totalContributions: 45678.90,
    employeeCount: 85,
  },
  {
    id: "C3-2025-002",
    employerId: "EMP-1002",
    employerName: "Tech Solutions Inc",
    period: "January 2025",
    submittedDate: "2025-02-02",
    status: "validated",
    validationScore: 100,
    issues: [],
    totalContributions: 32450.00,
    employeeCount: 52,
  },
  {
    id: "C3-2025-003",
    employerId: "EMP-1003",
    employerName: "Construction Pro Ltd",
    period: "December 2024",
    submittedDate: "2025-01-28",
    status: "pending",
    validationScore: 60,
    issues: ["Over-62 levy applied", "Missing holiday period", "Duplicate SSN entries"],
    totalContributions: 28900.50,
    employeeCount: 45,
  },
];

const getStatusBadge = (status: C3Submission["status"]) => {
  const config = {
    pending: { variant: "outline" as const, label: "Pending Review" },
    validated: { variant: "default" as const, label: "Validated" },
    queried: { variant: "secondary" as const, label: "Queried" },
    posted: { variant: "default" as const, label: "Posted" },
  };
  
  return <Badge variant={config[status].variant}>{config[status].label}</Badge>;
};

export default function C3Filing() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">C3 Filing Review & Query Center</h1>
          <p className="text-muted-foreground">Validate submissions and manage queries</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filter</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Received</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">287</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Validation Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Validated</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">234</div>
            <p className="text-xs text-muted-foreground">Ready to post</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Queries</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Awaiting response</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by employer name or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* C3 Submissions List */}
      <Tabs defaultValue="all">
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="queried">Queried</TabsTrigger>
          <TabsTrigger value="validated">Validated</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {mockC3Submissions.map((submission) => (
            <Card key={submission.id}>
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <div>
                        <h3 className="font-semibold">{submission.employerName}</h3>
                        <p className="text-sm text-muted-foreground">{submission.employerId}</p>
                      </div>
                      {getStatusBadge(submission.status)}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Period</p>
                        <p className="font-medium">{submission.period}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Submitted</p>
                        <p className="font-medium">{submission.submittedDate}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Employees</p>
                        <p className="font-medium">{submission.employeeCount}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total</p>
                        <p className="font-medium">${submission.totalContributions.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Validation Score</span>
                        <span className="font-medium">{submission.validationScore}%</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${submission.validationScore}%` }}
                        />
                      </div>
                    </div>

                    {submission.issues.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {submission.issues.map((issue, idx) => (
                          <Badge key={idx} variant="outline" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {issue}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-row lg:flex-col gap-2">
                    <Button variant="outline" size="sm" className="flex-1 lg:flex-none">View Details</Button>
                    {submission.status === "queried" && (
                      <Button size="sm" className="flex-1 lg:flex-none gap-1">
                        <Send className="h-3 w-3" />
                        Send Query
                      </Button>
                    )}
                    {submission.status === "validated" && (
                      <Button size="sm" className="flex-1 lg:flex-none">Post</Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center py-8">Pending submissions will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queried">
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center py-8">Queried submissions will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="validated">
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center py-8">Validated submissions will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}