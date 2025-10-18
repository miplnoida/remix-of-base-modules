import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Building2, UserCog, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function BemaRegistrations() {
  const [activeTab, setActiveTab] = useState("all");

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Registration & Onboarding</h1>
          <p className="text-muted-foreground">
            Manage employer, self-employed, and voluntary contributor registrations
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Registration
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">
              Awaiting inspector assignment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Employers</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,284</div>
            <p className="text-xs text-muted-foreground">
              +12 this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contributors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">387</div>
            <p className="text-xs text-muted-foreground">
              Self-employed & voluntary
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Registrations</TabsTrigger>
          <TabsTrigger value="employers">Employers</TabsTrigger>
          <TabsTrigger value="self-employed">Self-Employed</TabsTrigger>
          <TabsTrigger value="voluntary">Voluntary</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Registrations</CardTitle>
              <CardDescription>
                All pending and approved registrations across all types
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Building2 className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Caribbean Construction Ltd.</p>
                        <p className="text-sm text-muted-foreground">REG-2025-{1000 + i}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary">Employer</Badge>
                      <Badge>Pending</Badge>
                      <Button variant="outline" size="sm">View Details</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employers">
          <Card>
            <CardHeader>
              <CardTitle>Employer Registrations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Employer registration list will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="self-employed">
          <Card>
            <CardHeader>
              <CardTitle>Self-Employed Registrations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Self-employed registration list will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="voluntary">
          <Card>
            <CardHeader>
              <CardTitle>Voluntary Contributor Registrations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Voluntary contributor list will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
