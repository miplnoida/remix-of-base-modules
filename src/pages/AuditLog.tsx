
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { 
  Search, 
  Filter, 
  Download, 
  CalendarIcon, 
  History,
  User,
  FileText,
  Settings,
  Shield,
  Database
} from "lucide-react";
import { format } from "date-fns";

const AuditLog = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  // Mock audit log data
  const auditLogs = [
    {
      id: "AL-001",
      timestamp: "2024-01-20 14:30:25",
      user: "admin@secureserve.gov",
      action: "LOGIN",
      module: "Authentication",
      description: "User logged into the system",
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      sessionId: "sess_abc123",
      severity: "info"
    },
    {
      id: "AL-002",
      timestamp: "2024-01-20 14:32:15",
      user: "admin@secureserve.gov",
      action: "CREATE",
      module: "User Management",
      description: "Created new user account for john.doe@email.com",
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      sessionId: "sess_abc123",
      severity: "medium"
    },
    {
      id: "AL-003",
      timestamp: "2024-01-20 14:25:10",
      user: "hr.manager@secureserve.gov",
      action: "UPDATE",
      module: "Benefits Management",
      description: "Updated benefit application status to APPROVED for application ID BEN-2024-001",
      ipAddress: "192.168.1.105",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      sessionId: "sess_def456",
      severity: "medium"
    },
    {
      id: "AL-004",
      timestamp: "2024-01-20 14:20:45",
      user: "system",
      action: "BACKUP",
      module: "System Administration",
      description: "Automated daily backup completed successfully",
      ipAddress: "127.0.0.1",
      userAgent: "SystemService/1.0",
      sessionId: "sys_backup_001",
      severity: "info"
    },
    {
      id: "AL-005",
      timestamp: "2024-01-20 14:15:30",
      user: "compliance@secureserve.gov",
      action: "DELETE",
      module: "Document Management",
      description: "Deleted expired document DOC-2023-987",
      ipAddress: "192.168.1.110",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      sessionId: "sess_ghi789",
      severity: "high"
    },
    {
      id: "AL-006",
      timestamp: "2024-01-20 14:10:20",
      user: "unknown",
      action: "FAILED_LOGIN",
      module: "Authentication",
      description: "Failed login attempt for user admin@secureserve.gov",
      ipAddress: "203.0.113.45",
      userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
      sessionId: "failed_attempt_001",
      severity: "high"
    }
  ];

  const getActionIcon = (action: string) => {
    switch (action) {
      case "LOGIN":
      case "LOGOUT":
        return <User className="h-4 w-4" />;
      case "CREATE":
      case "UPDATE":
      case "DELETE":
        return <FileText className="h-4 w-4" />;
      case "BACKUP":
        return <Database className="h-4 w-4" />;
      case "FAILED_LOGIN":
        return <Shield className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "high":
        return <Badge className="bg-red-100 text-red-800">High</Badge>;
      case "medium":
        return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-800">Info</Badge>;
    }
  };

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = 
      log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.ipAddress.includes(searchTerm) ||
      log.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    const matchesModule = moduleFilter === "all" || log.module === moduleFilter;
    const matchesUser = userFilter === "all" || log.user === userFilter;
    
    return matchesSearch && matchesAction && matchesModule && matchesUser;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-government-700">Audit Log</h1>
          <p className="text-gray-600 mt-1">Complete system activity log with detailed tracking and filtering capabilities</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Log
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Advanced Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Action Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="LOGIN">Login</SelectItem>
                <SelectItem value="LOGOUT">Logout</SelectItem>
                <SelectItem value="CREATE">Create</SelectItem>
                <SelectItem value="UPDATE">Update</SelectItem>
                <SelectItem value="DELETE">Delete</SelectItem>
                <SelectItem value="BACKUP">Backup</SelectItem>
                <SelectItem value="FAILED_LOGIN">Failed Login</SelectItem>
              </SelectContent>
            </Select>

            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                <SelectItem value="Authentication">Authentication</SelectItem>
                <SelectItem value="User Management">User Management</SelectItem>
                <SelectItem value="Benefits Management">Benefits Management</SelectItem>
                <SelectItem value="Document Management">Document Management</SelectItem>
                <SelectItem value="System Administration">System Administration</SelectItem>
              </SelectContent>
            </Select>

            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger>
                <SelectValue placeholder="User" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="admin@secureserve.gov">Admin</SelectItem>
                <SelectItem value="hr.manager@secureserve.gov">HR Manager</SelectItem>
                <SelectItem value="compliance@secureserve.gov">Compliance</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "PPP") : "From Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Button variant="outline" onClick={() => {
              setSearchTerm("");
              setActionFilter("all");
              setModuleFilter("all");
              setUserFilter("all");
              setDateFrom(undefined);
              setDateTo(undefined);
            }}>
              Clear All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Audit Entries ({filteredLogs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Session ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-sm">{log.timestamp}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {log.user}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getActionIcon(log.action)}
                      <Badge variant="outline">{log.action}</Badge>
                    </div>
                  </TableCell>
                  <TableCell>{log.module}</TableCell>
                  <TableCell className="max-w-xs truncate" title={log.description}>
                    {log.description}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{log.ipAddress}</TableCell>
                  <TableCell>{getSeverityBadge(log.severity)}</TableCell>
                  <TableCell className="font-mono text-xs">{log.sessionId}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLog;
