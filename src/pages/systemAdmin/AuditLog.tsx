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
import { 
  Search, 
  Filter, 
  Download, 
  History,
  User,
  FileText,
  Settings,
  Shield,
  Database,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { format } from "date-fns";
import { useAuditLogs } from "@/hooks/useAdminData";

const PAGE_SIZES = [10, 25, 50, 100];

const AuditLog = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data: auditLogs = [], isLoading } = useAuditLogs();

  const getActionIcon = (action: string) => {
    switch (action.toUpperCase()) {
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

  const getSeverityBadge = (action: string) => {
    const highSeverity = ["DELETE", "FAILED_LOGIN", "PERMISSION_CHANGE"];
    const mediumSeverity = ["CREATE", "UPDATE"];
    
    if (highSeverity.includes(action.toUpperCase())) {
      return <Badge className="bg-red-100 text-red-800">High</Badge>;
    }
    if (mediumSeverity.includes(action.toUpperCase())) {
      return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
    }
    return <Badge className="bg-blue-100 text-blue-800">Info</Badge>;
  };

  // Get unique modules and action types from data
  const uniqueModules = Array.from(new Set(auditLogs.map(log => log.module_name).filter(Boolean)));
  const uniqueActions = Array.from(new Set(auditLogs.map(log => log.action_type)));

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = 
      (log.user_email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (log.user_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (log.entity_type?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (log.entity_id?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (log.ip_address || '').includes(searchTerm);
    
    const matchesAction = actionFilter === "all" || log.action_type === actionFilter;
    const matchesModule = moduleFilter === "all" || log.module_name === moduleFilter;
    
    return matchesSearch && matchesAction && matchesModule;
  });

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + pageSize);

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'User', 'Action', 'Module', 'Entity Type', 'Entity ID', 'IP Address'].join(','),
      ...filteredLogs.map(log => [
        log.created_at,
        log.user_email || log.user_name || 'System',
        log.action_type,
        log.module_name || '',
        log.entity_type || '',
        log.entity_id || '',
        log.ip_address || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading audit logs...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Audit Log</h1>
          <p className="text-muted-foreground mt-1">Complete system activity log with detailed tracking</p>
        </div>
        
        <Button variant="outline" onClick={exportLogs}>
          <Download className="h-4 w-4 mr-2" />
          Export Log
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="pl-10"
              />
            </div>
            
            <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setCurrentPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Action Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActions.map(action => (
                  <SelectItem key={action} value={action}>{action}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={moduleFilter} onValueChange={(v) => { setModuleFilter(v); setCurrentPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                {uniqueModules.map(module => (
                  <SelectItem key={module} value={module!}>{module}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => {
              setSearchTerm("");
              setActionFilter("all");
              setModuleFilter("all");
              setCurrentPage(1);
            }}>
              Clear Filters
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
                <TableHead>Entity</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Severity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-sm">
                    {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span className="text-sm">{log.user_email || log.user_name || 'System'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getActionIcon(log.action_type)}
                      <Badge variant="outline">{log.action_type}</Badge>
                    </div>
                  </TableCell>
                  <TableCell>{log.module_name || '-'}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <span className="text-muted-foreground">{log.entity_type}</span>
                      {log.entity_id && <span className="ml-1 font-mono text-xs">#{log.entity_id.slice(0, 8)}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    {log.field_name && (
                      <span className="text-xs text-muted-foreground">
                        {log.field_name}: {log.old_value ? `${log.old_value} → ` : ''}{log.new_value || '-'}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{log.ip_address || '-'}</TableCell>
                  <TableCell>{getSeverityBadge(log.action_type)}</TableCell>
                </TableRow>
              ))}
              {paginatedLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No audit logs found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show</span>
              <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                <SelectTrigger className="w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map(size => (
                    <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">entries</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(startIndex + pageSize, filteredLogs.length)} of {filteredLogs.length} entries
              </span>
              <div className="flex gap-1">
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLog;
