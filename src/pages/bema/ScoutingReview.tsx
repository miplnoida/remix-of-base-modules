import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Eye, CheckCircle, XCircle, FileText, Image } from "lucide-react";
import { toast } from "sonner";

export default function BemaScoutingReview() {
  const scoutingReports = [
    {
      id: "SC-2025-001",
      inspector: "John Smith",
      businessName: "New Construction Site",
      location: "Basseterre, Zone A",
      coordinates: { lat: 17.3026, lng: -62.7177 },
      date: "2025-01-20",
      status: "pending",
      observations: "Observed 15+ employees, appears to be unregistered employer",
      photos: 4,
      activityType: "construction"
    },
    {
      id: "SC-2025-002",
      inspector: "Sarah Johnson",
      businessName: "Island Cafe & Restaurant",
      location: "Frigate Bay, Zone B",
      coordinates: { lat: 17.2952, lng: -62.7072 },
      date: "2025-01-18",
      status: "verified",
      observations: "Operating business with 8 visible employees, no SSB registration found",
      photos: 3,
      activityType: "hospitality"
    },
    {
      id: "SC-2025-003",
      inspector: "Mike Williams",
      businessName: "Auto Repair Shop",
      location: "Sandy Point, Zone C",
      coordinates: { lat: 17.3677, lng: -62.8433 },
      date: "2025-01-15",
      status: "invalid",
      observations: "Follow-up revealed business is actually registered under different name",
      photos: 2,
      activityType: "automotive"
    },
  ];

  const handleApprove = (id: string) => {
    toast.success("Scouting report approved - Creating registration case");
  };

  const handleReject = (id: string) => {
    toast.success("Scouting report marked as invalid");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Scouting & New Employer Detection</h1>
          <p className="text-muted-foreground">
            Review inspector scouting reports and detected unregistered employers
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <MapPin className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Awaiting verification</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">28</div>
            <p className="text-xs text-muted-foreground">Confirmed unregistered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invalid</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">False positives</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <MapPin className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45</div>
            <p className="text-xs text-muted-foreground">Total reports</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending Review</TabsTrigger>
          <TabsTrigger value="verified">Verified</TabsTrigger>
          <TabsTrigger value="invalid">Invalid</TabsTrigger>
          <TabsTrigger value="map">Map View</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Scouting Reports</CardTitle>
              <CardDescription>
                Review and verify unregistered employer detections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {scoutingReports.filter(r => r.status === "pending").map((report) => (
                  <div key={report.id} className="p-4 border rounded-lg space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <MapPin className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium text-lg">{report.businessName}</p>
                            <p className="text-sm text-muted-foreground">{report.location}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <Badge variant="outline">{report.id}</Badge>
                          <span className="text-muted-foreground">Inspector: {report.inspector}</span>
                          <span className="text-muted-foreground">Date: {report.date}</span>
                        </div>
                      </div>
                      <Badge 
                        variant={
                          report.status === "verified" ? "default" :
                          report.status === "invalid" ? "destructive" :
                          "outline"
                        }
                        className={report.status === "pending" ? "border-blue-600 text-blue-700 bg-blue-50" : ""}
                      >
                        {report.status}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">Observations:</p>
                      <p className="text-sm text-muted-foreground">{report.observations}</p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Image className="h-4 w-4 text-muted-foreground" />
                        <span>{report.photos} photos attached</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="capitalize">{report.activityType}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => toast.info(`Viewing photos for ${report.businessName}`)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Photos
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => toast.info(`Viewing location for ${report.businessName}`)}
                      >
                        <MapPin className="h-4 w-4 mr-2" />
                        View Location
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => handleApprove(report.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Verify & Create Registration
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleReject(report.id)}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Mark Invalid
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verified">
          <Card>
            <CardHeader>
              <CardTitle>Verified Reports</CardTitle>
              <CardDescription>Confirmed unregistered employers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {scoutingReports.filter(r => r.status === "verified").map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{report.businessName}</p>
                      <p className="text-sm text-muted-foreground">{report.location}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => toast.info(`Viewing details for ${report.businessName}`)}
                    >
                      View Details
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invalid">
          <Card>
            <CardHeader>
              <CardTitle>Invalid Reports</CardTitle>
              <CardDescription>False positives or already registered</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {scoutingReports.filter(r => r.status === "invalid").map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{report.businessName}</p>
                      <p className="text-sm text-muted-foreground">{report.observations}</p>
                    </div>
                    <Badge variant="destructive">Invalid</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="map">
          <Card>
            <CardHeader>
              <CardTitle>Scouting Map View</CardTitle>
              <CardDescription>Geographic distribution of scouting reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-96 bg-muted rounded-lg">
                <div className="text-center">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Interactive map would display here showing all scouting locations
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
