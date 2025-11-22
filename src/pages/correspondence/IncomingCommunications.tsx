import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { correspondenceService } from '@/services/correspondenceService';
import {
  Correspondence,
  CorrespondenceDirection,
  CorrespondenceChannel,
  CorrespondenceStatus,
  CorrespondenceModule,
  CorrespondenceFilters
} from '@/types/correspondence';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  Plus, 
  Search, 
  Filter, 
  Mail, 
  Phone, 
  FileText, 
  User, 
  MessageSquare,
  ArrowDownLeft,
  Eye,
  CheckCircle,
  UserPlus,
  Clock,
  ExternalLink
} from 'lucide-react';
import NewCorrespondenceDialog from '@/components/correspondence/NewCorrespondenceDialog';
import { PartyType } from '@/types/correspondence';

export default function IncomingCommunications() {
  const [correspondence, setCorrespondence] = useState<Correspondence[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CorrespondenceFilters>({
    direction: CorrespondenceDirection.INCOMING
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewDialog, setShowNewDialog] = useState(false);

  useEffect(() => {
    loadCorrespondence();
  }, [filters]);

  const loadCorrespondence = async () => {
    try {
      setLoading(true);
      const data = await correspondenceService.getAll({
        ...filters,
        searchQuery,
        direction: CorrespondenceDirection.INCOMING // Always incoming
      });
      setCorrespondence(data);
    } catch (error) {
      toast.error('Failed to load incoming communications');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (id: string) => {
    try {
      await correspondenceService.updateStatus(id, CorrespondenceStatus.ASSIGNED);
      toast.success('Correspondence assigned');
      loadCorrespondence();
    } catch (error) {
      toast.error('Failed to assign correspondence');
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await correspondenceService.updateStatus(id, CorrespondenceStatus.LOGGED);
      toast.success('Marked as read');
      loadCorrespondence();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const getChannelIcon = (channel: CorrespondenceChannel) => {
    switch (channel) {
      case CorrespondenceChannel.EMAIL: return <Mail className="h-4 w-4" />;
      case CorrespondenceChannel.PHONE: return <Phone className="h-4 w-4" />;
      case CorrespondenceChannel.LETTER: return <FileText className="h-4 w-4" />;
      case CorrespondenceChannel.IN_PERSON: return <User className="h-4 w-4" />;
      case CorrespondenceChannel.PORTAL: return <MessageSquare className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: CorrespondenceStatus) => {
    switch (status) {
      case CorrespondenceStatus.RECEIVED:
      case CorrespondenceStatus.LOGGED:
        return 'bg-blue-100 text-blue-800';
      case CorrespondenceStatus.ASSIGNED:
      case CorrespondenceStatus.IN_PROGRESS:
        return 'bg-yellow-100 text-yellow-800';
      case CorrespondenceStatus.RESPONDED:
        return 'bg-green-100 text-green-800';
      case CorrespondenceStatus.CLOSED:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'NORMAL': return 'bg-blue-100 text-blue-800';
      case 'LOW': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const unreadCount = correspondence.filter(c => c.status === CorrespondenceStatus.RECEIVED).length;
  const assignedCount = correspondence.filter(c => c.status === CorrespondenceStatus.ASSIGNED).length;
  const overdueCount = correspondence.filter(c => 
    c.respondByDate && new Date(c.respondByDate) < new Date()
  ).length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Incoming Communications</h1>
          <p className="text-muted-foreground">
            All incoming correspondence requiring attention or response
          </p>
        </div>
        <Button onClick={() => setShowNewDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Log Incoming
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Total Incoming</div>
              <div className="text-2xl font-semibold mt-1">{correspondence.length}</div>
            </div>
            <ArrowDownLeft className="h-8 w-8 text-blue-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Unread</div>
              <div className="text-2xl font-semibold mt-1 text-orange-600">{unreadCount}</div>
            </div>
            <Mail className="h-8 w-8 text-orange-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Assigned</div>
              <div className="text-2xl font-semibold mt-1 text-yellow-600">{assignedCount}</div>
            </div>
            <UserPlus className="h-8 w-8 text-yellow-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Overdue Response</div>
              <div className="text-2xl font-semibold mt-1 text-red-600">{overdueCount}</div>
            </div>
            <Clock className="h-8 w-8 text-red-600" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search incoming..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadCorrespondence()}
              className="pl-10"
            />
          </div>

          <Select
            value={(filters.status?.[0] as string) || 'all'}
            onValueChange={(value) => 
              setFilters({ ...filters, status: value === 'all' ? undefined : [value as CorrespondenceStatus] })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value={CorrespondenceStatus.RECEIVED}>Received</SelectItem>
              <SelectItem value={CorrespondenceStatus.LOGGED}>Logged</SelectItem>
              <SelectItem value={CorrespondenceStatus.ASSIGNED}>Assigned</SelectItem>
              <SelectItem value={CorrespondenceStatus.IN_PROGRESS}>In Progress</SelectItem>
              <SelectItem value={CorrespondenceStatus.RESPONDED}>Responded</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={(filters.channel?.[0] as string) || 'all'}
            onValueChange={(value) => 
              setFilters({ ...filters, channel: value === 'all' ? undefined : [value as CorrespondenceChannel] })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Channel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Channels</SelectItem>
              {Object.values(CorrespondenceChannel).map((channel) => (
                <SelectItem key={channel} value={channel}>
                  {channel.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={(filters.module?.[0] as string) || 'all'}
            onValueChange={(value) => 
              setFilters({ ...filters, module: value === 'all' ? undefined : [value as CorrespondenceModule] })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Module" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modules</SelectItem>
              {Object.values(CorrespondenceModule).map((module) => (
                <SelectItem key={module} value={module}>
                  {module}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={loadCorrespondence} className="w-full">
            <Filter className="h-4 w-4 mr-2" />
            Apply Filters
          </Button>
        </div>
      </Card>

      {/* Correspondence Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Channel</TableHead>
              <TableHead className="w-32">Number</TableHead>
              <TableHead className="w-32">Received</TableHead>
              <TableHead className="w-32">Comm. Date</TableHead>
              <TableHead className="w-28">Ref. No.</TableHead>
              <TableHead>From (Party)</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead className="w-24">Priority</TableHead>
              <TableHead className="w-28">Module</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8">
                  Loading incoming communications...
                </TableCell>
              </TableRow>
            ) : correspondence.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                  No incoming correspondence found
                </TableCell>
              </TableRow>
            ) : (
              correspondence.map((item) => (
                <TableRow 
                  key={item.id}
                  className={item.status === CorrespondenceStatus.RECEIVED ? 'bg-blue-50/50' : ''}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getChannelIcon(item.channel)}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{item.correspondenceNumber}</TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(item.receivedDate || item.createdDate), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className="text-sm">
                    {item.communicationDate ? (
                      <div>
                        <div>{format(new Date(item.communicationDate), 'MMM dd, yyyy')}</div>
                        {item.storingTime && (
                          <div className="text-xs text-muted-foreground">
                            Stored: {format(new Date(item.storingTime), 'HH:mm')}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm font-mono">
                    {item.referenceNumber || <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {item.parties.filter(p => p.isPrimary).map(p => (
                        <div key={p.id} className="text-sm">
                          <div className="font-medium">{p.partyName}</div>
                          <div className="text-muted-foreground text-xs">
                            {p.partyType.replace(/_/g, ' ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      <div className="font-medium truncate">{item.subject}</div>
                      {item.respondByDate && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Respond by: {format(new Date(item.respondByDate), 'MMM dd, yyyy')}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getPriorityColor(item.priority)}>
                      {item.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {item.contexts && item.contexts.length > 0 && (
                      <Badge variant="outline">{item.contexts[0].module}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(item.status)}>
                      {item.status.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" title="View Details">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {item.status === CorrespondenceStatus.RECEIVED && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          title="Mark as Read"
                          onClick={() => handleMarkAsRead(item.id)}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      {(item.status === CorrespondenceStatus.RECEIVED || item.status === CorrespondenceStatus.LOGGED) && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          title="Assign"
                          onClick={() => handleAssign(item.id)}
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" title="Open Related">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <NewCorrespondenceDialog
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
        onCreated={() => {
          loadCorrespondence();
        }}
      />
    </div>
  );
}
