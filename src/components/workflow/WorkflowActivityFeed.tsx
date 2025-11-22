import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlayCircle, PauseCircle, CheckCircle2, XCircle, Clock, User, FileText } from "lucide-react";

interface Activity {
  id: string;
  type: "started" | "completed" | "failed" | "paused" | "resumed" | "approved" | "rejected";
  workflowName: string;
  stepName?: string;
  user: string;
  timestamp: string;
  details?: string;
}

const mockActivities: Activity[] = [
  {
    id: "act-001",
    type: "started",
    workflowName: "Retirement Benefit Application",
    user: "John Doe",
    timestamp: "2024-11-22T10:45:00Z",
    details: "New application submitted for processing",
  },
  {
    id: "act-002",
    type: "completed",
    workflowName: "Sickness Benefit Claim",
    stepName: "Medical Verification",
    user: "System",
    timestamp: "2024-11-22T10:30:00Z",
    details: "Automated verification completed successfully",
  },
  {
    id: "act-003",
    type: "approved",
    workflowName: "Employer Registration",
    stepName: "Manager Approval",
    user: "Sarah Williams",
    timestamp: "2024-11-22T10:15:00Z",
    details: "Registration approved and forwarded to next step",
  },
  {
    id: "act-004",
    type: "paused",
    workflowName: "Compliance Audit",
    stepName: "Document Review",
    user: "Mike Johnson",
    timestamp: "2024-11-22T10:00:00Z",
    details: "Waiting for additional documentation from employer",
  },
  {
    id: "act-005",
    type: "failed",
    workflowName: "Fee Waiver Request",
    stepName: "Eligibility Check",
    user: "System",
    timestamp: "2024-11-22T09:45:00Z",
    details: "Eligibility criteria not met - missing required documentation",
  },
  {
    id: "act-006",
    type: "resumed",
    workflowName: "Benefit Calculation",
    stepName: "Financial Review",
    user: "Jane Smith",
    timestamp: "2024-11-22T09:30:00Z",
    details: "Resumed after receiving corrected contribution data",
  },
  {
    id: "act-007",
    type: "rejected",
    workflowName: "Service Request",
    stepName: "Supervisor Review",
    user: "Robert Brown",
    timestamp: "2024-11-22T09:15:00Z",
    details: "Request rejected due to incomplete information",
  },
  {
    id: "act-008",
    type: "completed",
    workflowName: "Maternity Benefit Application",
    user: "System",
    timestamp: "2024-11-22T09:00:00Z",
    details: "Application processed and payment authorized",
  },
];

export default function WorkflowActivityFeed() {
  const getActivityIcon = (type: string) => {
    const icons: Record<string, any> = {
      started: <PlayCircle className="h-5 w-5 text-blue-600" />,
      completed: <CheckCircle2 className="h-5 w-5 text-green-600" />,
      failed: <XCircle className="h-5 w-5 text-red-600" />,
      paused: <PauseCircle className="h-5 w-5 text-yellow-600" />,
      resumed: <PlayCircle className="h-5 w-5 text-purple-600" />,
      approved: <CheckCircle2 className="h-5 w-5 text-green-600" />,
      rejected: <XCircle className="h-5 w-5 text-red-600" />,
    };
    return icons[type] || <Clock className="h-5 w-5 text-gray-600" />;
  };

  const getActivityColor = (type: string) => {
    const colors: Record<string, string> = {
      started: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
      paused: "bg-yellow-100 text-yellow-800",
      resumed: "bg-purple-100 text-purple-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Workflow Activity Feed</h2>
        <p className="text-sm text-muted-foreground">
          Real-time updates on workflow activities and events
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {mockActivities.map((activity, index) => (
                <div
                  key={activity.id}
                  className="flex gap-4 pb-4 border-b last:border-0 last:pb-0"
                >
                  <div className="mt-1">{getActivityIcon(activity.type)}</div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={getActivityColor(activity.type)} variant="secondary">
                          {activity.type}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatTime(activity.timestamp)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {activity.workflowName}
                      </div>
                      {activity.stepName && (
                        <div className="text-sm text-muted-foreground ml-6">
                          Step: {activity.stepName}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground ml-6">
                      <User className="h-3 w-3" />
                      {activity.user}
                    </div>
                    {activity.details && (
                      <div className="text-sm text-muted-foreground ml-6 bg-muted/50 p-2 rounded">
                        {activity.details}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
