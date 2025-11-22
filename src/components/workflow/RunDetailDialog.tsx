import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, Clock, AlertCircle, Circle } from "lucide-react";

interface RunDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  runId: string;
}

const mockRunDetail = {
  id: "run-2024-001",
  workflowName: "Retirement Benefit Application",
  status: "InProgress",
  startedBy: "Jane Officer",
  startedAt: "2025-01-20T09:15:00",
  currentStep: "Eligibility Check",
  steps: [
    {
      name: "Application Intake",
      status: "Completed",
      startedAt: "2025-01-20T09:15:00",
      completedAt: "2025-01-20T09:30:00",
      assignedTo: "Jane Officer",
      notes: "Initial application received and validated",
    },
    {
      name: "Eligibility Check",
      status: "InProgress",
      startedAt: "2025-01-20T09:30:00",
      completedAt: null,
      assignedTo: "System",
      notes: "Automated eligibility verification in progress",
    },
    {
      name: "Supervisor Review",
      status: "Pending",
      startedAt: null,
      completedAt: null,
      assignedTo: "Benefits Supervisor",
      notes: null,
    },
    {
      name: "Payment Setup",
      status: "Pending",
      startedAt: null,
      completedAt: null,
      assignedTo: "Finance Team",
      notes: null,
    },
  ],
  formData: {
    applicantName: "John Doe",
    ssn: "SKN-123-456",
    monthlyEarnings: "3500",
    yearsContributed: "25",
    hasValidCertificate: "Yes",
  },
};

export default function RunDetailDialog({ open, onOpenChange, runId }: RunDetailDialogProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Completed":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "InProgress":
        return <Clock className="h-5 w-5 text-blue-600" />;
      case "Failed":
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-800";
      case "InProgress":
        return "bg-blue-100 text-blue-800";
      case "Failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Workflow Run Details</DialogTitle>
          <DialogDescription>
            {mockRunDetail.workflowName} - {runId}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className={getStatusColor(mockRunDetail.status)}>
                {mockRunDetail.status}
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Started By</CardTitle>
            </CardHeader>
            <CardContent className="font-medium">
              {mockRunDetail.startedBy}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Current Step</CardTitle>
            </CardHeader>
            <CardContent className="font-medium">
              {mockRunDetail.currentStep}
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="timeline">
          <TabsList>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="data">Form Data</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="space-y-4 mt-4">
            <div className="relative">
              {mockRunDetail.steps.map((step, index) => (
                <div key={index} className="flex gap-4 pb-6">
                  <div className="flex flex-col items-center">
                    {getStatusIcon(step.status)}
                    {index < mockRunDetail.steps.length - 1 && (
                      <div className="w-0.5 h-full bg-border mt-2" />
                    )}
                  </div>
                  <Card className="flex-1">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{step.name}</CardTitle>
                        <Badge className={getStatusColor(step.status)} variant="outline">
                          {step.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Assigned To:</span>
                        <span className="font-medium">{step.assignedTo}</span>
                      </div>
                      {step.startedAt && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Started:</span>
                          <span>{new Date(step.startedAt).toLocaleString()}</span>
                        </div>
                      )}
                      {step.completedAt && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Completed:</span>
                          <span>{new Date(step.completedAt).toLocaleString()}</span>
                        </div>
                      )}
                      {step.notes && (
                        <div className="pt-2 border-t">
                          <p className="text-muted-foreground">{step.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="data" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Submitted Form Data</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(mockRunDetail.formData).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-2 border-b last:border-0">
                      <span className="font-medium text-muted-foreground">
                        {key.replace(/([A-Z])/g, ' $1').trim()}:
                      </span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
