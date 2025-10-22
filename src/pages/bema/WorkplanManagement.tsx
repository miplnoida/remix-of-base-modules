import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  User,
  MapPin,
  FileText,
  Download,
  Filter
} from "lucide-react";
import { useState } from "react";

interface WorkplanEntry {
  id: string;
  inspector: string;
  zone: string;
  week: string;
  status: "draft" | "submitted" | "approved" | "completed" | "overdue";
  plannedVisits: number;
  completedVisits: number;
  plannedAudits: number;
  completedAudits: number;
}

const mockWorkplans: WorkplanEntry[] = [
  {
    id: "WP-2025-01",
    inspector: "Inspector A",
    zone: "Zone A",
    week: "Week 3, Jan 2025",
    status: "submitted",
    plannedVisits: 15,
    completedVisits: 0,
    plannedAudits: 3,
    completedAudits: 0,
  },
  {
    id: "WP-2025-02",
    inspector: "Inspector B",
    zone: "Zone B",
    week: "Week 3, Jan 2025",
    status: "approved",
    plannedVisits: 12,
    completedVisits: 8,
    plannedAudits: 2,
    completedAudits: 1,
  },
  {
    id: "WP-2025-03",
    inspector: "Inspector C",
    zone: "Zone C",
    week: "Week 2, Jan 2025",
    status: "completed",
    plannedVisits: 18,
    completedVisits: 18,
    plannedAudits: 4,
    completedAudits: 4,
  },
  {
    id: "WP-2025-04",
    inspector: "Inspector D",
    zone: "Zone D",
    week: "Week 2, Jan 2025",
    status: "overdue",
    plannedVisits: 10,
    completedVisits: 7,
    plannedAudits: 2,
    completedAudits: 1,
  },
];

const getStatusBadge = (status: WorkplanEntry["status"]) => {
  const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    draft: { variant: "outline", label: "Draft" },
    submitted: { variant: "secondary", label: "Awaiting Approval" },
    approved: { variant: "default", label: "Approved" },
    completed: { variant: "default", label: "Completed" },
    overdue: { variant: "destructive", label: "Overdue" },
  };
  
  const config = variants[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

export default function WorkplanManagement() {
  const [selectedWeek, setSelectedWeek] = useState("current");

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workplan & Inspector Management</h1>
          <p className="text-muted-foreground">Monitor, approve, and track field activities</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Workplans awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Currently in execution</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87%</div>
            <p className="text-xs text-muted-foreground">Planned vs completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Workplan List */}
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending Approval</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {mockWorkplans
            .filter((wp) => wp.status === "submitted")
            .map((workplan) => (
              <Card key={workplan.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-4">
                        <div>
                          <h3 className="font-semibold">{workplan.id}</h3>
                          <p className="text-sm text-muted-foreground">{workplan.week}</p>
                        </div>
                        {getStatusBadge(workplan.status)}
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{workplan.inspector}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{workplan.zone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span>{workplan.plannedVisits} visits planned</span>
                        </div>
                      </div>

                      <div className="flex gap-4 text-sm">
                        <div className="space-y-1">
                          <p className="text-muted-foreground">Field Visits</p>
                          <p className="font-medium">
                            {workplan.completedVisits}/{workplan.plannedVisits}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-muted-foreground">Audits</p>
                          <p className="font-medium">
                            {workplan.completedAudits}/{workplan.plannedAudits}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">View Details</Button>
                      <Button variant="destructive" size="sm">Reject</Button>
                      <Button size="sm">Approve</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          {mockWorkplans
            .filter((wp) => wp.status === "approved")
            .map((workplan) => (
              <Card key={workplan.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-4">
                        <div>
                          <h3 className="font-semibold">{workplan.id}</h3>
                          <p className="text-sm text-muted-foreground">{workplan.week}</p>
                        </div>
                        {getStatusBadge(workplan.status)}
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{workplan.inspector}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{workplan.zone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {Math.round((workplan.completedVisits / workplan.plannedVisits) * 100)}% complete
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Field Visits Progress</span>
                          <span className="font-medium">
                            {workplan.completedVisits}/{workplan.plannedVisits}
                          </span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{
                              width: `${(workplan.completedVisits / workplan.plannedVisits) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <Button variant="outline" size="sm">View Details</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {mockWorkplans
            .filter((wp) => wp.status === "completed")
            .map((workplan) => (
              <Card key={workplan.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-4">
                        <div>
                          <h3 className="font-semibold">{workplan.id}</h3>
                          <p className="text-sm text-muted-foreground">{workplan.week}</p>
                        </div>
                        {getStatusBadge(workplan.status)}
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{workplan.inspector}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{workplan.zone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>100% complete</span>
                        </div>
                      </div>
                    </div>

                    <Button variant="outline" size="sm">View Report</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
