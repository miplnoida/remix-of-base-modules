import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  MapPin, 
  Clock, 
  Camera, 
  FileText, 
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Eye,
  Upload,
  LogIn,
  LogOut
} from "lucide-react";
import { mockFieldActivities } from "@/services/mockData/complianceData";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function FieldOperations() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [checkedInActivities, setCheckedInActivities] = useState<Set<string>>(new Set());

  const filteredActivities = mockFieldActivities.filter(activity => {
    const matchesSearch = 
      activity.employerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.caseNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || activity.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "checked_in": return "bg-blue-500";
      case "in_progress": return "bg-yellow-500";
      case "completed": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const handleCheckIn = (activityId: string) => {
    setCheckedInActivities(prev => new Set(prev).add(activityId));
    toast({
      title: "Check-In Successful",
      description: "You have checked in to this visit. GPS location recorded.",
    });
    setCheckInDialogOpen(false);
  };

  const handleCheckOut = (activityId: string) => {
    setCheckedInActivities(prev => {
      const newSet = new Set(prev);
      newSet.delete(activityId);
      return newSet;
    });
    toast({
      title: "Check-Out Successful",
      description: "Visit completed and recorded.",
    });
  };

  const handleViewDetails = (activity: any) => {
    setSelectedActivity(activity);
    setViewDialogOpen(true);
  };

  const handleUploadEvidence = (activity: any) => {
    setSelectedActivity(activity);
    setUploadDialogOpen(true);
  };

  const handleEvidenceUpload = () => {
    toast({
      title: "Evidence Uploaded",
      description: "Evidence files have been uploaded successfully.",
    });
    setUploadDialogOpen(false);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Field Operations</h1>
          <p className="text-muted-foreground">
            Track check-ins, evidence collection, and working papers
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-foreground">{checkedInActivities.size}</div>
            <p className="text-sm text-muted-foreground">Active Check-Ins</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-foreground">45</div>
            <p className="text-sm text-muted-foreground">Visits This Week</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-foreground">156</div>
            <p className="text-sm text-muted-foreground">Evidence Files</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-foreground">38</div>
            <p className="text-sm text-muted-foreground">Working Papers</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Field Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by employer or case number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>

          {/* Activities List */}
          <div className="space-y-4">
            {filteredActivities.map((activity) => {
              const isCheckedIn = checkedInActivities.has(activity.id);
              
              return (
                <div 
                  key={activity.id}
                  className="border rounded-lg p-4 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground">
                          {activity.employerName}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {activity.caseNumber}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>Plan: {activity.planReference}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(activity.status)}`} />
                      <span className="text-sm text-muted-foreground capitalize">
                        {activity.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Plan Reference</p>
                      <p className="text-sm font-semibold text-foreground">{activity.planReference}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Check-In Time</p>
                      <p className="text-sm font-semibold text-foreground">{activity.checkInTime || 'Not checked in'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Visit Type</p>
                      <p className="text-sm font-semibold text-foreground">{activity.visitType}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Evidence Files</p>
                      <p className="text-sm font-semibold text-foreground">{activity.evidenceCount || 0}</p>
                    </div>
                  </div>

                  {isCheckedIn && (
                    <div className="flex items-center gap-2 mb-3 p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Checked in • Visit in progress
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleViewDetails(activity)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleUploadEvidence(activity)}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Evidence
                    </Button>
                    {!isCheckedIn ? (
                      <Button 
                        size="sm" 
                        onClick={() => {
                          setSelectedActivity(activity);
                          setCheckInDialogOpen(true);
                        }}
                      >
                        <LogIn className="h-4 w-4 mr-2" />
                        Check In
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleCheckOut(activity.id)}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Check Out
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Field Activity Details</DialogTitle>
            <DialogDescription>
              Complete details of field visit and activities
            </DialogDescription>
          </DialogHeader>

          {selectedActivity && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Employer</Label>
                  <p className="font-medium">{selectedActivity.employerName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Case Number</Label>
                  <p className="font-medium">{selectedActivity.caseNumber}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Plan Reference</Label>
                  <p className="font-medium">{selectedActivity.planReference}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Visit Type</Label>
                  <p className="font-medium">{selectedActivity.visitType}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Check-In Time</Label>
                  <p className="font-medium">{selectedActivity.checkInTime || 'Not checked in'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Check-Out Time</Label>
                  <p className="font-medium">{selectedActivity.checkOutTime || 'In progress'}</p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Purpose</Label>
                <Card className="mt-2">
                  <CardContent className="pt-4">
                    <p className="text-sm">{selectedActivity.purpose || "Follow-up visit for C3 compliance"}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Evidence Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Evidence</DialogTitle>
            <DialogDescription>
              Upload photos, documents, or other evidence files
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="evidence-type">Evidence Type</Label>
              <select 
                id="evidence-type"
                className="w-full p-2 border rounded-md"
              >
                <option value="PHOTO">Photo</option>
                <option value="DOCUMENT">Document</option>
                <option value="SIGNED_FORM">Signed Form</option>
                <option value="AUDIO">Audio Recording</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="evidence-file">Select File</Label>
              <Input id="evidence-file" type="file" multiple />
            </div>

            <div className="space-y-2">
              <Label htmlFor="evidence-description">Description</Label>
              <Textarea 
                id="evidence-description"
                placeholder="Describe the evidence..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEvidenceUpload}>
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Check-In Dialog */}
      <Dialog open={checkInDialogOpen} onOpenChange={setCheckInDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check In to Visit</DialogTitle>
            <DialogDescription>
              Confirm your location and start the field visit
            </DialogDescription>
          </DialogHeader>

          {selectedActivity && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="font-medium">{selectedActivity.employerName}</p>
                <p className="text-sm text-muted-foreground">Plan: {selectedActivity.planReference}</p>
                <p className="text-sm text-muted-foreground">Case: {selectedActivity.caseNumber}</p>
              </div>

              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded">
                <MapPin className="h-4 w-4 text-blue-600" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  GPS location will be recorded upon check-in
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="checkin-notes">Initial Notes (Optional)</Label>
                <Textarea 
                  id="checkin-notes"
                  placeholder="Add any initial observations..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckInDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => selectedActivity && handleCheckIn(selectedActivity.id)}>
              <LogIn className="h-4 w-4 mr-2" />
              Confirm Check-In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
