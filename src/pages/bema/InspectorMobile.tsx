import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Smartphone, Calendar, MapPin, Camera, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function BemaInspectorMobile() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inspector Field Work</h1>
          <p className="text-muted-foreground">
            Mobile workflow, weekly plans, and field activities
          </p>
        </div>
        <Button className="gap-2">
          <Calendar className="h-4 w-4" />
          Submit Weekly Plan
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Activities</CardTitle>
            <MapPin className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">Visits scheduled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed (Week)</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-muted-foreground">Out of 30 planned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notices Served</CardTitle>
            <FileText className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Evidence Captured</CardTitle>
            <Camera className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">47</div>
            <p className="text-xs text-muted-foreground">Photos & documents</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today">Today's Plan</TabsTrigger>
          <TabsTrigger value="week">Weekly Plan</TabsTrigger>
          <TabsTrigger value="activities">Recent Activities</TabsTrigger>
          <TabsTrigger value="mobile">Mobile Guide</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Today's Schedule</CardTitle>
              <CardDescription>
                Planned field activities for {new Date().toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { time: "09:00 AM", type: "inspection", employer: "Caribbean Hotel", status: "pending", zone: "Zone A" },
                  { time: "11:00 AM", type: "audit", employer: "Construction Pro", status: "in_progress", zone: "Zone A" },
                  { time: "02:00 PM", type: "education", employer: "New Restaurant LLC", status: "pending", zone: "Zone B" },
                  { time: "04:00 PM", type: "notice_service", employer: "Retail Store", status: "pending", zone: "Zone B" },
                ].map((activity, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="text-sm font-medium w-20">{activity.time}</div>
                      <div>
                        <p className="font-medium">{activity.employer}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="capitalize">{activity.type.replace("_", " ")}</Badge>
                          <span className="text-sm text-muted-foreground">{activity.zone}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={activity.status === "in_progress" ? "default" : "secondary"}>
                        {activity.status.replace("_", " ")}
                      </Badge>
                      <Button variant="outline" size="sm">Check In</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="week">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Plan Submission</CardTitle>
              <CardDescription>
                Submit your planned activities for next week
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  Submit your weekly plan including all scheduled inspections, audits, education visits, 
                  and notice services for approval by your supervisor.
                </p>
              </div>
              <Button>Create Weekly Plan</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities">
          <Card>
            <CardHeader>
              <CardTitle>Recent Field Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Your recent field activities and logs will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mobile">
          <Card>
            <CardHeader>
              <CardTitle>Mobile App Features</CardTitle>
              <CardDescription>
                Guide for using the inspector mobile application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Check In/Out with Geo-Tagging
                </h4>
                <p className="text-sm text-muted-foreground">
                  Log your arrival and departure times with automatic location tracking for verification.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Capture Evidence
                </h4>
                <p className="text-sm text-muted-foreground">
                  Take photos of wage books, employee interviews, and workplace conditions directly from the field.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Digital Notice Service
                </h4>
                <p className="text-sm text-muted-foreground">
                  Serve notices digitally and capture employer signatures directly on your device.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
