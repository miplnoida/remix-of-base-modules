import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, User, Settings, Database, Shield } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function BemaSystemLogs() {
  const auditLogs = [
    {
      id: 1,
      timestamp: "2025-01-22 10:45:23",
      user: "John Smith",
      action: "Updated arrears ledger",
      entity: "Employer: EMP-1234",
      module: "Arrears",
      ipAddress: "192.168.1.45",
      result: "success"
    },
    {
      id: 2,
      timestamp: "2025-01-22 10:32:15",
      user: "Sarah Johnson",
      action: "Approved payment plan",
      entity: "Plan: PP-5678",
      module: "Payment Plans",
      ipAddress: "192.168.1.67",
      result: "success"
    },
    {
      id: 3,
      timestamp: "2025-01-22 10:18:42",
      user: "Mike Williams",
      action: "Attempted to delete audit case",
      entity: "Audit: AUD-2025-015",
      module: "Audits",
      ipAddress: "192.168.1.88",
      result: "failed"
    },
    {
      id: 4,
      timestamp: "2025-01-22 09:55:11",
      user: "Emma Davis",
      action: "Created legal case",
      entity: "Case: LEG-2025-023",
      module: "Legal",
      ipAddress: "192.168.1.92",
      result: "success"
    },
    {
      id: 5,
      timestamp: "2025-01-22 09:42:33",
      user: "David Brown",
      action: "Updated rule configuration",
      entity: "Rule: penalty_rate",
      module: "Admin",
      ipAddress: "192.168.1.12",
      result: "success"
    },
  ];

  const systemEvents = [
    {
      id: 1,
      timestamp: "2025-01-22 11:00:00",
      event: "Scheduled backup completed",
      type: "system",
      status: "success"
    },
    {
      id: 2,
      timestamp: "2025-01-22 10:30:15",
      event: "Database index rebuild",
      type: "database",
      status: "success"
    },
    {
      id: 3,
      timestamp: "2025-01-22 09:15:42",
      event: "Failed login attempt (3 consecutive)",
      type: "security",
      status: "warning"
    },
    {
      id: 4,
      timestamp: "2025-01-22 08:00:00",
      event: "Daily statistics aggregation",
      type: "system",
      status: "success"
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">System Logs & Audit Trail</h1>
        <p className="text-muted-foreground">
          Complete audit trail of all system activities and user actions
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Actions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">847</div>
            <p className="text-xs text-muted-foreground">User actions logged</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">52</div>
            <p className="text-xs text-muted-foreground">Currently online</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Events</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">In last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Attempts</CardTitle>
            <Shield className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Security alerts</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Activity Logs</CardTitle>
              <CardDescription>Detailed audit trail of all user actions</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select defaultValue="all">
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  <SelectItem value="arrears">Arrears</SelectItem>
                  <SelectItem value="audits">Audits</SelectItem>
                  <SelectItem value="legal">Legal</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue="today">
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Search logs..." className="w-64" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="audit">
            <TabsList>
              <TabsTrigger value="audit">Audit Log</TabsTrigger>
              <TabsTrigger value="system">System Events</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            <TabsContent value="audit">
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="p-4 border rounded-lg space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">{log.module}</Badge>
                            <span className="text-sm font-medium">{log.action}</span>
                            <Badge variant={log.result === "success" ? "default" : "destructive"}>
                              {log.result}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{log.entity}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{log.timestamp}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>User: {log.user}</span>
                        <span>•</span>
                        <span>IP: {log.ipAddress}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="system">
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  {systemEvents.map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        {event.type === "system" && <Settings className="h-5 w-5 text-blue-600" />}
                        {event.type === "database" && <Database className="h-5 w-5 text-green-600" />}
                        {event.type === "security" && <Shield className="h-5 w-5 text-red-600" />}
                        <div>
                          <p className="text-sm font-medium">{event.event}</p>
                          <p className="text-xs text-muted-foreground">{event.timestamp}</p>
                        </div>
                      </div>
                      <Badge 
                        variant={
                          event.status === "success" ? "default" :
                          event.status === "warning" ? "destructive" :
                          "secondary"
                        }
                      >
                        {event.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="security">
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  {auditLogs.filter(log => log.result === "failed").map((log) => (
                    <div key={log.id} className="p-4 border border-red-200 rounded-lg space-y-2 bg-red-50">
                      <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-red-600" />
                        <span className="text-sm font-medium text-red-900">{log.action}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-red-700">
                        <span>User: {log.user}</span>
                        <span>•</span>
                        <span>IP: {log.ipAddress}</span>
                        <span>•</span>
                        <span>{log.timestamp}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
