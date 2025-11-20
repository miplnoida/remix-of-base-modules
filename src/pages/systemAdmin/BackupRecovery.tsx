import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  HardDrive,
} from "lucide-react";
import { toast } from "sonner";

interface Backup {
  id: string;
  name: string;
  type: "Full" | "Incremental" | "Differential";
  size: string;
  status: "Completed" | "In Progress" | "Failed";
  date: string;
  time: string;
  location: string;
}

const BackupRecovery = () => {
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);

  const [backups] = useState<Backup[]>([
    {
      id: "1",
      name: "SSB_Full_Backup_20240115",
      type: "Full",
      size: "2.4 GB",
      status: "Completed",
      date: "2024-01-15",
      time: "02:00 AM",
      location: "/backups/full/2024-01-15",
    },
    {
      id: "2",
      name: "SSB_Incremental_Backup_20240114",
      type: "Incremental",
      size: "180 MB",
      status: "Completed",
      date: "2024-01-14",
      time: "02:00 AM",
      location: "/backups/incremental/2024-01-14",
    },
    {
      id: "3",
      name: "SSB_Full_Backup_20240113",
      type: "Full",
      size: "2.3 GB",
      status: "Completed",
      date: "2024-01-13",
      time: "02:00 AM",
      location: "/backups/full/2024-01-13",
    },
  ]);

  const handleCreateBackup = () => {
    setIsCreatingBackup(true);
    setBackupProgress(0);

    // Simulate backup progress
    const interval = setInterval(() => {
      setBackupProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsCreatingBackup(false);
          toast.success("Backup created successfully");
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  const handleRestoreBackup = (backup: Backup) => {
    toast.success(`Restore initiated for ${backup.name}`);
  };

  const handleDownloadBackup = (backup: Backup) => {
    toast.success(`Downloading ${backup.name}...`);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "In Progress":
        return <Clock className="h-4 w-4 text-blue-600" />;
      case "Failed":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      Completed: "default",
      "In Progress": "secondary",
      Failed: "destructive",
    };
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Backup & Recovery</h1>
          <p className="text-muted-foreground mt-1">
            Manage system backups and data recovery
          </p>
        </div>
        <Button onClick={handleCreateBackup} disabled={isCreatingBackup}>
          <Database className="mr-2 h-4 w-4" />
          {isCreatingBackup ? "Creating Backup..." : "Create Backup"}
        </Button>
      </div>

      {isCreatingBackup && (
        <Card>
          <CardHeader>
            <CardTitle>Backup In Progress</CardTitle>
            <CardDescription>
              Creating system backup... Please do not close this window.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={backupProgress} className="h-2" />
            <p className="text-sm text-muted-foreground mt-2">
              {backupProgress}% Complete
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Backups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{backups.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Last Backup</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Today</div>
            <p className="text-xs text-muted-foreground">02:00 AM</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Size</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.9 GB</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24%</div>
            <Progress value={24} className="h-1 mt-2" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Backup Configuration</CardTitle>
          <CardDescription>
            Configure automatic backup settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Backup Type</Label>
              <Select defaultValue="full">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full Backup</SelectItem>
                  <SelectItem value="incremental">Incremental Backup</SelectItem>
                  <SelectItem value="differential">Differential Backup</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Backup Schedule</Label>
              <Select defaultValue="daily">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Retention Policy</Label>
            <Select defaultValue="30">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 Days</SelectItem>
                <SelectItem value="30">30 Days</SelectItem>
                <SelectItem value="90">90 Days</SelectItem>
                <SelectItem value="365">1 Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button>
            <CheckCircle className="mr-2 h-4 w-4" />
            Save Configuration
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Backup History</CardTitle>
          <CardDescription>
            View and manage all system backups
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Backup Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backups.map((backup) => (
                <TableRow key={backup.id}>
                  <TableCell className="font-medium">{backup.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{backup.type}</Badge>
                  </TableCell>
                  <TableCell>{backup.size}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(backup.status)}
                      {getStatusBadge(backup.status)}
                    </div>
                  </TableCell>
                  <TableCell>{backup.date}</TableCell>
                  <TableCell>{backup.time}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {backup.location}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRestoreBackup(backup)}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownloadBackup(backup)}
                      >
                        <Download className="h-4 w-4" />
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
};

export default BackupRecovery;
