import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, RefreshCw, Send, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WebhookDelivery {
  id: string;
  webhookName: string;
  endpoint: string;
  event: string;
  workflowId: string;
  status: "Success" | "Failed" | "Pending" | "Retrying";
  responseCode?: number;
  attempts: number;
  sentAt: string;
  responseTime?: number;
}

const mockDeliveries: WebhookDelivery[] = [
  {
    id: "wh-001",
    webhookName: "Workflow Completion Notification",
    endpoint: "https://api.example.com/webhooks/workflow-complete",
    event: "workflow.completed",
    workflowId: "run-001",
    status: "Success",
    responseCode: 200,
    attempts: 1,
    sentAt: "2024-11-22T10:45:00Z",
    responseTime: 245,
  },
  {
    id: "wh-002",
    webhookName: "Approval Request Webhook",
    endpoint: "https://api.example.com/webhooks/approval-request",
    event: "workflow.approval_required",
    workflowId: "run-002",
    status: "Failed",
    responseCode: 500,
    attempts: 3,
    sentAt: "2024-11-22T10:30:00Z",
    responseTime: 1234,
  },
  {
    id: "wh-003",
    webhookName: "SLA Violation Alert",
    endpoint: "https://api.example.com/webhooks/sla-violation",
    event: "workflow.sla_exceeded",
    workflowId: "run-003",
    status: "Retrying",
    responseCode: 503,
    attempts: 2,
    sentAt: "2024-11-22T10:20:00Z",
  },
  {
    id: "wh-004",
    webhookName: "Step Completion Hook",
    endpoint: "https://api.example.com/webhooks/step-complete",
    event: "workflow.step_completed",
    workflowId: "run-004",
    status: "Success",
    responseCode: 201,
    attempts: 1,
    sentAt: "2024-11-22T10:15:00Z",
    responseTime: 189,
  },
];

export default function WorkflowWebhooks() {
  const { toast } = useToast();
  const [deliveries] = useState<WebhookDelivery[]>(mockDeliveries);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      Success: "bg-success/10 text-success",
      Failed: "bg-destructive/10 text-destructive",
      Pending: "bg-info/10 text-info",
      Retrying: "bg-warning/15 text-warning",
    };
    return colors[status] || "bg-muted text-muted-foreground";
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, any> = {
      Success: <CheckCircle2 className="h-4 w-4 text-green-600" />,
      Failed: <XCircle className="h-4 w-4 text-red-600" />,
      Pending: <Clock className="h-4 w-4 text-blue-600" />,
      Retrying: <RefreshCw className="h-4 w-4 text-yellow-600" />,
    };
    return icons[status] || <Clock className="h-4 w-4 text-gray-600" />;
  };

  const handleRetry = (id: string) => {
    toast({
      title: "Webhook Retry",
      description: "Webhook delivery has been queued for retry",
    });
  };

  const successCount = deliveries.filter((d) => d.status === "Success").length;
  const failedCount = deliveries.filter((d) => d.status === "Failed").length;
  const avgResponseTime =
    deliveries
      .filter((d) => d.responseTime)
      .reduce((sum, d) => sum + (d.responseTime || 0), 0) /
    deliveries.filter((d) => d.responseTime).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Webhook Deliveries</h2>
          <p className="text-sm text-muted-foreground">
            Monitor webhook delivery status and performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Configure Webhook
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deliveries</CardTitle>
            <Send className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliveries.length}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((successCount / deliveries.length) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">{successCount} successful</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{failedCount}</div>
            <p className="text-xs text-muted-foreground">Delivery failures</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgResponseTime.toFixed(0)}ms</div>
            <p className="text-xs text-muted-foreground">Response time</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Webhook Deliveries</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Webhook Name</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead>Response</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Response Time</TableHead>
                <TableHead>Sent At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveries.map((delivery) => (
                <TableRow key={delivery.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(delivery.status)}
                      <Badge className={getStatusColor(delivery.status)} variant="secondary">
                        {delivery.status}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{delivery.webhookName}</TableCell>
                  <TableCell className="text-sm font-mono">{delivery.event}</TableCell>
                  <TableCell className="text-sm max-w-xs truncate">
                    {delivery.endpoint}
                  </TableCell>
                  <TableCell>
                    {delivery.responseCode && (
                      <Badge
                        variant={delivery.responseCode < 400 ? "outline" : "destructive"}
                        className="font-mono"
                      >
                        {delivery.responseCode}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{delivery.attempts}</TableCell>
                  <TableCell className="text-sm">
                    {delivery.responseTime ? `${delivery.responseTime}ms` : "-"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(delivery.sentAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {delivery.status === "Failed" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRetry(delivery.id)}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm">
                        View Payload
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
