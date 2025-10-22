import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Calendar, User, FileText, CheckCircle, XCircle, Clock, Download, Filter } from "lucide-react";
import { useBemaRegistrations } from "@/hooks/useBemaData";
import { toast } from "sonner";

interface RegistrationEntry {
  id: string;
  businessName: string;
  employerId: string;
  submittedDate: string;
  registrationType: "new" | "reactivation" | "change";
  status: "pending" | "approved" | "rejected";
  assignedInspector: string;
  zone: string;
}

const mockRegistrations: RegistrationEntry[] = [
  {
    id: "REG-2025-001",
    businessName: "Island Paradise Resort",
    employerId: "EMP-PENDING",
    submittedDate: "2025-01-20",
    registrationType: "new",
    status: "pending",
    assignedInspector: "John Smith",
    zone: "Zone A",
  },
  {
    id: "REG-2025-002",
    businessName: "Tech Solutions Inc",
    employerId: "EMP-1234",
    submittedDate: "2025-01-18",
    registrationType: "new",
    status: "approved",
    assignedInspector: "Sarah Johnson",
    zone: "Zone B",
  },
  {
    id: "REG-2025-003",
    businessName: "Construction Pro Ltd",
    employerId: "EMP-PENDING",
    submittedDate: "2025-01-15",
    registrationType: "reactivation",
    status: "rejected",
    assignedInspector: "Mike Williams",
    zone: "Zone C",
  },
];

export default function Registrations() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: registrationsData } = useBemaRegistrations();

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Registration Management</h1>
          <p className="text-muted-foreground">Review and approve new employer registrations</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={() => toast.info("Filters panel will appear here")}
          >
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={() => toast.success("Export started")}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved (MTD)</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">Requires resubmission</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Registered</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,284</div>
            <p className="text-xs text-muted-foreground">All employers</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="pending">Pending Approval</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Registrations</CardTitle>
              <CardDescription>
                Review and approve new employer registration applications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockRegistrations.filter(r => r.status === "pending").map((registration) => (
                  <div key={registration.id} className="p-4 border rounded-lg space-y-4">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <div>
                            <h3 className="font-semibold text-lg">{registration.businessName}</h3>
                            <p className="text-sm text-muted-foreground">{registration.id}</p>
                          </div>
                          <Badge 
                            variant="outline"
                            className="border-blue-600 text-blue-700 bg-blue-50 w-fit"
                          >
                            {registration.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Registration Type</p>
                            <p className="font-medium capitalize">{registration.registrationType}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Submitted</p>
                            <p className="font-medium">{registration.submittedDate}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Inspector</p>
                            <p className="font-medium">{registration.assignedInspector}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Zone</p>
                            <p className="font-medium">{registration.zone}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-row md:flex-col gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex-1 md:flex-none"
                          onClick={() => toast.info(`Viewing form for ${registration.businessName}`)}
                        >
                          View Form
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          className="flex-1 md:flex-none"
                          onClick={() => {
                            toast.success(`Registration ${registration.id} rejected`);
                          }}
                        >
                          Reject
                        </Button>
                        <Button 
                          size="sm"
                          className="flex-1 md:flex-none"
                          onClick={() => {
                            toast.success(`Registration ${registration.id} approved`);
                          }}
                        >
                          Approve
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved">
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center py-8">Approved registrations will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rejected">
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center py-8">Rejected registrations will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
