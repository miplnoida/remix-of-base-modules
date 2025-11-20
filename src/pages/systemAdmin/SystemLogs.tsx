import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Search,
  FileText,
  Download,
  Filter,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";

interface SystemLog {
  id: string;
  timestamp: string;
  level: "ERROR" | "WARNING" | "INFO" | "SUCCESS";
  module: string;
  message: string;
  user: string;
  ipAddress: string;
}

const SystemLogs = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [filterModule, setFilterModule] = useState<string>("all");

  const [logs] = useState<SystemLog[]>([
    {
      id: "1",
      timestamp: "2024-01-15 09:45:23",
      level: "ERROR",
      module: "Authentication",
      message: "Failed login attempt for user admin from 192.168.1.100",
      user: "system",
      ipAddress: "192.168.1.100",
    },
    {
      id: "2",
      timestamp: "2024-01-15 09:30:15",
      level: "SUCCESS",
      module: "C3 Processing",
      message: "C3 submission C3-2024-001 processed successfully",
      user: "john.doe",
      ipAddress: "192.168.1.50",
    },
    {
      id: "3",
      timestamp: "2024-01-15 09:15:42",
      level: "WARNING",
      module: "Database",
      message: "Database connection pool reaching maximum capacity (80%)",
      user: "system",
      ipAddress: "localhost",
    },
    {
      id: "4",
      timestamp: "2024-01-15 09:00:10",
      level: "INFO",
      module: "Scheduler",
      message: "Daily backup task initiated",
      user: "system",
      ipAddress: "localhost",
    },
    {
      id: "5",
      timestamp: "2024-01-15 08:45:33",
      level: "ERROR",
      module: "Payment Processing",
      message: "Payment gateway timeout for transaction TXN-20240115-001",
      user: "cashier01",
      ipAddress: "192.168.1.75",
    },
    {
      id: "6",
      timestamp: "2024-01-15 08:30:20",
      level: "INFO",
      module: "User Management",
      message: "New user account created: jane.smith",
      user: "admin",
      ipAddress: "192.168.1.10",
    },
  ]);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.module.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesLevel = filterLevel === "all" || log.level === filterLevel;
    const matchesModule = filterModule === "all" || log.module === filterModule;

    return matchesSearch && matchesLevel && matchesModule;
  });

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "ERROR":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case "WARNING":
        return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      case "INFO":
        return <Info className="h-4 w-4 text-blue-600" />;
      case "SUCCESS":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return null;
    }
  };

  const getLevelBadge = (level: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      ERROR: "destructive",
      WARNING: "secondary",
      INFO: "default",
      SUCCESS: "default",
    };
    
    const colors: Record<string, string> = {
      ERROR: "bg-red-100 text-red-800 hover:bg-red-100",
      WARNING: "bg-amber-100 text-amber-800 hover:bg-amber-100",
      INFO: "bg-blue-100 text-blue-800 hover:bg-blue-100",
      SUCCESS: "bg-green-100 text-green-800 hover:bg-green-100",
    };

    return (
      <Badge variant={variants[level]} className={colors[level]}>
        {level}
      </Badge>
    );
  };

  const handleExportLogs = () => {
    toast.success("Exporting logs to CSV...");
  };

  const uniqueModules = Array.from(new Set(logs.map((log) => log.module)));

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">System Logs</h1>
          <p className="text-muted-foreground mt-1">
            Monitor and review system activities and errors
          </p>
        </div>
        <Button onClick={handleExportLogs}>
          <Download className="mr-2 h-4 w-4" />
          Export Logs
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {logs.filter((l) => l.level === "ERROR").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {logs.filter((l) => l.level === "WARNING").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Info Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {logs.filter((l) => l.level === "INFO").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Activity Logs</CardTitle>
          <CardDescription>
            Filter and search through system logs
          </CardDescription>
          <div className="flex items-center gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="ERROR">Error</SelectItem>
                <SelectItem value="WARNING">Warning</SelectItem>
                <SelectItem value="INFO">Info</SelectItem>
                <SelectItem value="SUCCESS">Success</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterModule} onValueChange={setFilterModule}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                {uniqueModules.map((module) => (
                  <SelectItem key={module} value={module}>
                    {module}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>User</TableHead>
                <TableHead>IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs">
                    {log.timestamp}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getLevelIcon(log.level)}
                      {getLevelBadge(log.level)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.module}</Badge>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <p className="text-sm">{log.message}</p>
                  </TableCell>
                  <TableCell>{log.user}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {log.ipAddress}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredLogs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No logs found matching your filters
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemLogs;
