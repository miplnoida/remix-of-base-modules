import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Mail, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface EmailReport {
  id: string;
  reportName: string;
  recipients: string[];
  frequency: "Daily" | "Weekly" | "Monthly";
  reportType: string;
  lastSent?: string;
  nextScheduled: string;
  status: "Active" | "Paused";
}

const mockReports: EmailReport[] = [
  {
    id: "rep-001",
    reportName: "Daily Workflow Summary",
    recipients: ["manager@example.com", "supervisor@example.com"],
    frequency: "Daily",
    reportType: "Execution Summary",
    lastSent: "2024-11-22T06:00:00Z",
    nextScheduled: "2024-11-23T06:00:00Z",
    status: "Active",
  },
  {
    id: "rep-002",
    reportName: "Weekly Performance Report",
    recipients: ["director@example.com"],
    frequency: "Weekly",
    reportType: "Performance Metrics",
    lastSent: "2024-11-18T08:00:00Z",
    nextScheduled: "2024-11-25T08:00:00Z",
    status: "Active",
  },
  {
    id: "rep-003",
    reportName: "Monthly SLA Compliance",
    recipients: ["compliance@example.com", "quality@example.com"],
    frequency: "Monthly",
    reportType: "SLA Report",
    lastSent: "2024-11-01T09:00:00Z",
    nextScheduled: "2024-12-01T09:00:00Z",
    status: "Active",
  },
];

export default function WorkflowEmailReports() {
  const { toast } = useToast();
  const [reports, setReports] = useState<EmailReport[]>(mockReports);
  const [showDialog, setShowDialog] = useState(false);

  const handleCreate = () => {
    toast({
      title: "Report Schedule Created",
      description: "Automated email report has been scheduled successfully",
    });
    setShowDialog(false);
  };

  const handleDelete = (id: string) => {
    setReports(reports.filter((r) => r.id !== id));
    toast({
      title: "Report Schedule Deleted",
      description: "Automated report schedule has been removed",
    });
  };

  const getFrequencyColor = (frequency: string) => {
    const colors: Record<string, string> = {
      Daily: "bg-info/10 text-info",
      Weekly: "bg-success/10 text-success",
      Monthly: "bg-accent/20 text-accent-foreground",
    };
    return colors[frequency] || "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Automated Email Reports</h2>
          <p className="text-sm text-muted-foreground">
            Schedule automated workflow performance reports
          </p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Report Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Schedule Email Report</DialogTitle>
              <DialogDescription>
                Configure automated workflow performance reports
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Report Name</Label>
                <Input placeholder="e.g., Daily Workflow Summary" />
              </div>
              <div className="grid gap-2">
                <Label>Report Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select report type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="summary">Execution Summary</SelectItem>
                    <SelectItem value="performance">Performance Metrics</SelectItem>
                    <SelectItem value="sla">SLA Report</SelectItem>
                    <SelectItem value="bottleneck">Bottleneck Analysis</SelectItem>
                    <SelectItem value="approval">Approval Statistics</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Frequency</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Recipients</Label>
                <Textarea
                  placeholder="Enter email addresses (one per line)"
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label>Schedule Time</Label>
                <Input type="time" defaultValue="06:00" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate}>Create Schedule</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Schedules</CardTitle>
            <Mail className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports.filter((r) => r.status === "Active").length}
            </div>
            <p className="text-xs text-muted-foreground">Currently running</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reports Sent</CardTitle>
            <Calendar className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recipients</CardTitle>
            <Mail className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Unique recipients</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Schedules</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Last Sent</TableHead>
                <TableHead>Next Scheduled</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">{report.reportName}</TableCell>
                  <TableCell className="text-sm">{report.reportType}</TableCell>
                  <TableCell>
                    <Badge className={getFrequencyColor(report.frequency)} variant="secondary">
                      {report.frequency}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {report.recipients.length} recipient(s)
                  </TableCell>
                  <TableCell className="text-sm">
                    {report.lastSent
                      ? new Date(report.lastSent).toLocaleString()
                      : "Not sent yet"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(report.nextScheduled).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={report.status === "Active" ? "default" : "secondary"}>
                      {report.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(report.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
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
