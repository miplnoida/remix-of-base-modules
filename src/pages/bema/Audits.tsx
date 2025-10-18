import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, FileWarning, Clock, CheckCircle2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function BemaAudits() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audits, Surveys & Investigations</h1>
          <p className="text-muted-foreground">
            Case management, wage book reviews, and employee interviews
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Audit Case
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18</div>
            <p className="text-xs text-muted-foreground">Pending start</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Search className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">32</div>
            <p className="text-xs text-muted-foreground">Active audits</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">127</div>
            <p className="text-xs text-muted-foreground">This quarter</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Escalated</CardTitle>
            <FileWarning className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">9</div>
            <p className="text-xs text-muted-foreground">To legal</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Audits</TabsTrigger>
          <TabsTrigger value="random">Random Audits</TabsTrigger>
          <TabsTrigger value="complaints">Complaints</TabsTrigger>
          <TabsTrigger value="investigations">Investigations</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Cases</CardTitle>
              <CardDescription>
                Manage audits, surveys, scouting, and investigations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { 
                    caseNo: "AUD-2025-001", 
                    employer: "Caribbean Hotel Group", 
                    type: "random", 
                    status: "in_progress",
                    inspector: "John Smith",
                    dueDate: "2025-02-15",
                    findings: "Reviewing wage books"
                  },
                  { 
                    caseNo: "AUD-2025-002", 
                    employer: "Construction Pro Ltd", 
                    type: "complaint", 
                    status: "assigned",
                    inspector: "Sarah Johnson",
                    dueDate: "2025-02-10",
                    findings: "Employee complaint received"
                  },
                  { 
                    caseNo: "INV-2025-003", 
                    employer: "Tech Solutions Inc", 
                    type: "investigation", 
                    status: "completed",
                    inspector: "Mike Williams",
                    dueDate: "2025-01-30",
                    findings: "Non-compliance identified"
                  },
                ].map((audit) => (
                  <div key={audit.caseNo} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <p className="font-medium">{audit.employer}</p>
                          <Badge variant="outline">{audit.caseNo}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{audit.findings}</p>
                      </div>
                      <Badge 
                        variant={
                          audit.status === "completed" ? "default" :
                          audit.status === "in_progress" ? "secondary" :
                          "outline"
                        }
                      >
                        {audit.status.replace("_", " ")}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-6">
                        <div>
                          <span className="text-muted-foreground">Type: </span>
                          <span className="font-medium capitalize">{audit.type}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Inspector: </span>
                          <span className="font-medium">{audit.inspector}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Due: </span>
                          <span className="font-medium">{audit.dueDate}</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">View Details</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="random">
          <Card>
            <CardHeader>
              <CardTitle>Random Audits</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Random audit cases will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="complaints">
          <Card>
            <CardHeader>
              <CardTitle>Complaint-Based Audits</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Audits triggered by complaints will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="investigations">
          <Card>
            <CardHeader>
              <CardTitle>Investigations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Investigation cases will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
