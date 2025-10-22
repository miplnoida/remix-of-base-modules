import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  FileCheck, 
  Clock, 
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Download,
  Filter,
  Plus
} from "lucide-react";
import { useState } from "react";
import { useBemaWaivers } from "@/hooks/useBemaData";

interface WaiverRequest {
  id: string;
  employerId: string;
  employerName: string;
  requestType: "penalty" | "interest" | "full_waiver";
  amount: number;
  reason: string;
  requestedDate: string;
  status: "pending_compliance" | "pending_legal" | "pending_director" | "approved" | "rejected";
  currentApprover: string;
}

const mockWaivers: WaiverRequest[] = [
  {
    id: "WAV-2025-001",
    employerId: "EMP-1001",
    employerName: "Caribbean Hotel Group",
    requestType: "penalty",
    amount: 12500.00,
    reason: "COVID-19 financial hardship",
    requestedDate: "2025-01-15",
    status: "pending_legal",
    currentApprover: "Legal Officer",
  },
  {
    id: "WAV-2025-002",
    employerId: "EMP-1002",
    employerName: "Tech Solutions Inc",
    requestType: "interest",
    amount: 8750.50,
    reason: "System error in payment processing",
    requestedDate: "2025-01-20",
    status: "pending_director",
    currentApprover: "Director",
  },
  {
    id: "WAV-2025-003",
    employerId: "EMP-1003",
    employerName: "Construction Pro Ltd",
    requestType: "full_waiver",
    amount: 45000.00,
    reason: "Business closure and liquidation",
    requestedDate: "2025-01-10",
    status: "approved",
    currentApprover: "Completed",
  },
];

const getStatusBadge = (status: WaiverRequest["status"]) => {
  const config = {
    pending_compliance: { variant: "outline" as const, label: "Pending Compliance" },
    pending_legal: { variant: "secondary" as const, label: "Pending Legal" },
    pending_director: { variant: "secondary" as const, label: "Pending Director" },
    approved: { variant: "default" as const, label: "Approved" },
    rejected: { variant: "destructive" as const, label: "Rejected" },
  };
  
  return <Badge variant={config[status].variant}>{config[status].label}</Badge>;
};

const getTypeBadge = (type: WaiverRequest["requestType"]) => {
  const config = {
    penalty: { label: "Penalty Waiver" },
    interest: { label: "Interest Waiver" },
    full_waiver: { label: "Full Waiver" },
  };
  
  return <Badge variant="outline">{config[type].label}</Badge>;
};

export default function WaiversManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: waiversData } = useBemaWaivers();

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Waiver & Write-off Management</h1>
          <p className="text-muted-foreground">Manage penalty and interest waiver requests</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filter</span>
          </Button>
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Request</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved (YTD)</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">34</div>
            <p className="text-xs text-muted-foreground">$187K total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">This year</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Director</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">High priority</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by employer name or waiver ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Waivers List */}
      <Tabs defaultValue="pending">
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {mockWaivers
            .filter((w) => w.status.startsWith("pending"))
            .map((waiver) => (
              <Card key={waiver.id}>
                <CardContent className="pt-6">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="space-y-3 flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <div>
                          <h3 className="font-semibold">{waiver.employerName}</h3>
                          <p className="text-sm text-muted-foreground">{waiver.id}</p>
                        </div>
                        <div className="flex gap-2">
                          {getTypeBadge(waiver.requestType)}
                          {getStatusBadge(waiver.status)}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Amount Requested</p>
                          <p className="font-bold text-lg">${waiver.amount.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Requested Date</p>
                          <p className="font-medium">{waiver.requestedDate}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Current Stage</p>
                          <p className="font-medium">{waiver.currentApprover}</p>
                        </div>
                      </div>

                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Reason</p>
                        <p className="text-sm">{waiver.reason}</p>
                      </div>

                      {/* Approval Flow Indicator */}
                      <div className="flex items-center gap-2 text-xs">
                        <div className="flex items-center gap-1">
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <CheckCircle className="h-4 w-4 text-primary-foreground" />
                          </div>
                          <span>Compliance</span>
                        </div>
                        <div className="flex-1 h-px bg-border" />
                        <div className="flex items-center gap-1">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            waiver.status === "pending_legal" || waiver.status === "pending_director" 
                              ? "bg-secondary" 
                              : "bg-muted"
                          }`}>
                            <Clock className="h-4 w-4" />
                          </div>
                          <span>Legal</span>
                        </div>
                        <div className="flex-1 h-px bg-border" />
                        <div className="flex items-center gap-1">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            waiver.status === "pending_director" ? "bg-secondary" : "bg-muted"
                          }`}>
                            <Clock className="h-4 w-4" />
                          </div>
                          <span>Director</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-row lg:flex-col gap-2">
                      <Button variant="outline" size="sm" className="flex-1 lg:flex-none">
                        View Details
                      </Button>
                      <Button variant="destructive" size="sm" className="flex-1 lg:flex-none">
                        Reject
                      </Button>
                      <Button size="sm" className="flex-1 lg:flex-none">
                        Approve
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>

        <TabsContent value="approved">
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center py-8">Approved waivers will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rejected">
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center py-8">Rejected waivers will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center py-8">All waivers will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}