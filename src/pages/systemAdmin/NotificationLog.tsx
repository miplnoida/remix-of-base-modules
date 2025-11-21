import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Mail, MessageSquare, Bell, Eye, Filter, Download, AlertCircle, CheckCircle, XCircle, Clock } from "lucide-react";
import { notificationRequests, notificationMessages } from "@/services/mockData/notificationData";
import { NotificationMessage, NotificationChannel, SourceModule, NotificationStatus, NotificationPriority } from "@/types/notification";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function NotificationLog() {
  const [searchTerm, setSearchTerm] = useState("");
  const [channelFilter, setChannelFilter] = useState<string>("All");
  const [moduleFilter, setModuleFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [priorityFilter, setPriorityFilter] = useState<string>("All");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<NotificationMessage | null>(null);
  const [selectedTab, setSelectedTab] = useState("requests");

  // Filter requests
  const filteredRequests = notificationRequests.filter(req => {
    const matchesSearch = 
      req.sourceContextReference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.recipients[0]?.partyName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesModule = moduleFilter === "All" || req.sourceModule === moduleFilter;
    const matchesChannel = channelFilter === "All" || req.channel === channelFilter;
    const matchesStatus = statusFilter === "All" || req.status === statusFilter;
    const matchesPriority = priorityFilter === "All" || req.priority === priorityFilter;
    return matchesSearch && matchesModule && matchesChannel && matchesStatus && matchesPriority;
  });

  // Filter messages
  const filteredMessages = notificationMessages.filter(msg => {
    const matchesSearch = 
      msg.recipientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.recipientAddress.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesChannel = channelFilter === "All" || msg.channel === channelFilter;
    const matchesStatus = statusFilter === "All" || msg.status === statusFilter;
    return matchesSearch && matchesChannel && matchesStatus;
  });

  // Statistics
  const stats = {
    total: notificationRequests.length,
    sent: notificationMessages.filter(m => ['Sent', 'Delivered'].includes(m.status)).length,
    failed: notificationMessages.filter(m => m.status === 'Failed').length,
    pending: notificationRequests.filter(r => ['Pending', 'Queued'].includes(r.status)).length,
  };

  const getStatusColor = (status: NotificationStatus) => {
    const colors: Record<NotificationStatus, string> = {
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Queued': 'bg-blue-100 text-blue-800',
      'InProgress': 'bg-purple-100 text-purple-800',
      'Sent': 'bg-green-100 text-green-800',
      'Delivered': 'bg-green-100 text-green-800',
      'Failed': 'bg-red-100 text-red-800',
      'Bounced': 'bg-orange-100 text-orange-800',
      'Cancelled': 'bg-gray-100 text-gray-800',
      'Completed': 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: NotificationPriority) => {
    const colors: Record<NotificationPriority, string> = {
      'Low': 'bg-gray-100 text-gray-800',
      'Normal': 'bg-blue-100 text-blue-800',
      'High': 'bg-orange-100 text-orange-800',
      'Critical': 'bg-red-100 text-red-800',
    };
    return colors[priority];
  };

  const getChannelIcon = (channel: NotificationChannel) => {
    switch (channel) {
      case 'Email': return <Mail className="h-4 w-4" />;
      case 'SMS': return <MessageSquare className="h-4 w-4" />;
      case 'Push': return <Bell className="h-4 w-4" />;
      default: return <Mail className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Notification Log</h1>
          <p className="text-muted-foreground">Comprehensive tracking of all system notifications</p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Log
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-sm text-muted-foreground">Total Requests</p>
              </div>
              <Mail className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
                <p className="text-sm text-muted-foreground">Sent/Delivered</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <p className="text-sm text-muted-foreground">Pending/Queued</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
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
          <div className="grid grid-cols-5 gap-4">
            <Input
              placeholder="Search by reference or recipient..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Modules</SelectItem>
                <SelectItem value="Compliance">Compliance</SelectItem>
                <SelectItem value="Benefits">Benefits</SelectItem>
                <SelectItem value="Finance">Finance</SelectItem>
                <SelectItem value="Legal">Legal</SelectItem>
                <SelectItem value="InternalAudit">Internal Audit</SelectItem>
                <SelectItem value="Scheduler">Scheduler</SelectItem>
              </SelectContent>
            </Select>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Channels</SelectItem>
                <SelectItem value="Email">Email</SelectItem>
                <SelectItem value="SMS">SMS</SelectItem>
                <SelectItem value="Push">Push</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Status</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Sent">Sent</SelectItem>
                <SelectItem value="Delivered">Delivered</SelectItem>
                <SelectItem value="Failed">Failed</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Priority</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Normal">Normal</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="requests">Notification Requests</TabsTrigger>
          <TabsTrigger value="messages">Individual Messages</TabsTrigger>
        </TabsList>

        {/* Requests Tab */}
        <TabsContent value="requests">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date/Time</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Context</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Success Rate</TableHead>
                    <TableHead>Requested By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request.requestId}>
                      <TableCell className="text-sm">
                        {new Date(request.requestedDateTime).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{request.sourceModule}</Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">{request.sourceContextReference}</div>
                          <div className="text-xs text-muted-foreground">{request.sourceContextType}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{request.templateName || 'Custom'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getChannelIcon(request.channel)}
                          <span className="text-sm">{request.channel}</span>
                        </div>
                      </TableCell>
                      <TableCell>{request.totalRecipients}</TableCell>
                      <TableCell>
                        <Badge className={getPriorityColor(request.priority)}>
                          {request.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(request.status)}>
                          {request.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <span className="text-green-600 font-medium">{request.successfulSends}</span>
                          {' / '}
                          <span className="text-red-600">{request.failedSends}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{request.requestedByUserName}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sent Date/Time</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Subject/Preview</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>Provider ID</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMessages.map((message) => (
                    <TableRow key={message.messageId}>
                      <TableCell className="text-sm">
                        {message.sentOn ? new Date(message.sentOn).toLocaleString() : 'Not sent'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getChannelIcon(message.channel)}
                          <span className="text-sm">{message.channel}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{message.recipientName}</TableCell>
                      <TableCell className="text-sm font-mono">{message.recipientAddress}</TableCell>
                      <TableCell className="max-w-xs truncate text-sm">
                        {message.subject || message.bodyRendered.substring(0, 50) + '...'}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(message.status)}>
                          {message.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{message.attemptCount}</Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono">{message.providerMessageId || 'N/A'}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedMessage(message);
                            setDetailsOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Message Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Notification Message Details</DialogTitle>
            <DialogDescription>Message ID: {selectedMessage?.messageId}</DialogDescription>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Recipient Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Name</p>
                      <p className="font-medium">{selectedMessage.recipientName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Address</p>
                      <p className="font-mono text-sm">{selectedMessage.recipientAddress}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Channel</p>
                      <Badge>{selectedMessage.channel}</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Delivery Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <Badge className={getStatusColor(selectedMessage.status)}>
                        {selectedMessage.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Attempts</p>
                      <p className="font-medium">{selectedMessage.attemptCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Provider Message ID</p>
                      <p className="font-mono text-xs">{selectedMessage.providerMessageId || 'N/A'}</p>
                    </div>
                    {selectedMessage.errorMessage && (
                      <div>
                        <p className="text-xs text-muted-foreground">Error</p>
                        <p className="text-sm text-red-600">{selectedMessage.errorMessage}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Message Content</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedMessage.subject && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Subject</p>
                      <p className="font-medium">{selectedMessage.subject}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Body</p>
                    <div className="p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">
                      {selectedMessage.bodyRendered}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Timeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-start gap-3 border-l-2 border-primary pl-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium">Created</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(selectedMessage.createdOn).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {selectedMessage.sentOn && (
                    <div className="flex items-start gap-3 border-l-2 border-primary pl-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium">Sent</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(selectedMessage.sentOn).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                  {selectedMessage.deliveredOn && (
                    <div className="flex items-start gap-3 border-l-2 border-green-600 pl-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium">Delivered</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(selectedMessage.deliveredOn).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
