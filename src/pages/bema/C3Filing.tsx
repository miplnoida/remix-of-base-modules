import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Upload, FileCheck, AlertCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function BemaC3Filing() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">C3 Filing Management</h1>
          <p className="text-muted-foreground">
            Online C3 submissions, validation, and query management
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Upload className="h-4 w-4" />
            Upload Scanned C3
          </Button>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New C3 Submission
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Incomplete submissions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Submitted</CardTitle>
            <FileCheck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45</div>
            <p className="text-xs text-muted-foreground">Awaiting validation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Queries</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">Require clarification</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Posted</CardTitle>
            <FileCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">342</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Submissions</TabsTrigger>
          <TabsTrigger value="online">Online</TabsTrigger>
          <TabsTrigger value="scanned">Scanned</TabsTrigger>
          <TabsTrigger value="queries">Queries</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent C3 Submissions</CardTitle>
              <CardDescription>
                View and manage C3 filing submissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { id: "C3-2025-001", employer: "Island Hotel Group", period: "2025-01", status: "submitted", employees: 45, amount: 12450.50 },
                  { id: "C3-2025-002", employer: "Tech Solutions Inc", period: "2025-01", status: "validated", employees: 28, amount: 8920.00 },
                  { id: "C3-2025-003", employer: "Caribbean Retail Ltd", period: "2025-01", status: "query_raised", employees: 67, amount: 19340.75 },
                  { id: "C3-2025-004", employer: "Construction Pro", period: "2025-01", status: "posted", employees: 53, amount: 15780.25 },
                ].map((submission) => (
                  <div key={submission.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <p className="font-medium">{submission.employer}</p>
                        <Badge variant="outline">{submission.id}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Period: {submission.period}</span>
                        <span>•</span>
                        <span>{submission.employees} employees</span>
                        <span>•</span>
                        <span>${submission.amount.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge 
                        variant={
                          submission.status === "posted" ? "default" :
                          submission.status === "query_raised" ? "destructive" :
                          "secondary"
                        }
                      >
                        {submission.status.replace("_", " ")}
                      </Badge>
                      <Button variant="outline" size="sm">View</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="online">
          <Card>
            <CardHeader>
              <CardTitle>Online Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Online C3 submissions will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scanned">
          <Card>
            <CardHeader>
              <CardTitle>Scanned Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Scanned C3 documents will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queries">
          <Card>
            <CardHeader>
              <CardTitle>Active Queries</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">C3 queries requiring resolution will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
