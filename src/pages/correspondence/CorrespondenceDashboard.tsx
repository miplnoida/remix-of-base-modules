import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  ArrowUp,
  ArrowDown,
  Eye
} from 'lucide-react';

export default function CorrespondenceDashboard() {
  const [correspondence, setCorrespondence] = useState<Correspondence[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CorrespondenceFilters>({});
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCorrespondence();
  }, [filters]);

  const loadCorrespondence = async () => {
    try {
      setLoading(true);
      const data = await correspondenceService.getAll({
        ...filters,
        searchQuery
      });
      setCorrespondence(data);
    } catch (error) {
      toast.error('Failed to load correspondence');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getChannelIcon = (channel: CorrespondenceChannel) => {
    switch (channel) {
      case CorrespondenceChannel.EMAIL:
        return <Mail className="h-4 w-4" />;
      case CorrespondenceChannel.PHONE:
        return <Phone className="h-4 w-4" />;
      case CorrespondenceChannel.LETTER:
        return <FileText className="h-4 w-4" />;
      case CorrespondenceChannel.IN_PERSON:
        return <User className="h-4 w-4" />;
      case CorrespondenceChannel.PORTAL:
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getDirectionIcon = (direction: CorrespondenceDirection) => {
    return direction === CorrespondenceDirection.OUTGOING ? (
      <ArrowUp className="h-4 w-4 text-blue-600" />
    ) : (
      <ArrowDown className="h-4 w-4 text-green-600" />
    );
  };

  const getStatusColor = (status: CorrespondenceStatus) => {
    switch (status) {
      case CorrespondenceStatus.DRAFT:
        return 'bg-gray-100 text-gray-800';
      case CorrespondenceStatus.SENT:
      case CorrespondenceStatus.DELIVERED:
        return 'bg-green-100 text-green-800';
      case CorrespondenceStatus.FAILED:
      case CorrespondenceStatus.BOUNCED:
        return 'bg-red-100 text-red-800';
      case CorrespondenceStatus.RECEIVED:
      case CorrespondenceStatus.LOGGED:
        return 'bg-blue-100 text-blue-800';
      case CorrespondenceStatus.ASSIGNED:
      case CorrespondenceStatus.IN_PROGRESS:
        return 'bg-yellow-100 text-yellow-800';
      case CorrespondenceStatus.RESPONDED:
      case CorrespondenceStatus.CLOSED:
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Correspondence</h1>
          <p className="text-muted-foreground">
            Manage all incoming and outgoing communications
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Log Incoming
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Outgoing
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total Correspondence</div>
          <div className="text-2xl font-semibold mt-1">{correspondence.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Outgoing</div>
          <div className="text-2xl font-semibold mt-1 text-blue-600">
            {correspondence.filter(c => c.direction === CorrespondenceDirection.OUTGOING).length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Incoming</div>
          <div className="text-2xl font-semibold mt-1 text-green-600">
            {correspondence.filter(c => c.direction === CorrespondenceDirection.INCOMING).length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Pending Response</div>
          <div className="text-2xl font-semibold mt-1 text-amber-600">
            {correspondence.filter(c => c.status === CorrespondenceStatus.ASSIGNED).length}
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search correspondence..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadCorrespondence()}
              className="pl-10"
            />
          </div>

          <Select
            value={filters.direction || 'all'}
            onValueChange={(value) => 
              setFilters({ ...filters, direction: value === 'all' ? undefined : value as CorrespondenceDirection })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Direction" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Directions</SelectItem>
              <SelectItem value={CorrespondenceDirection.OUTGOING}>Outgoing</SelectItem>
              <SelectItem value={CorrespondenceDirection.INCOMING}>Incoming</SelectItem>
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
              <TableHead className="w-20">Direction</TableHead>
              <TableHead className="w-32">Number</TableHead>
              <TableHead className="w-32">Date</TableHead>
              <TableHead className="w-20">Channel</TableHead>
              <TableHead>Party</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead className="w-28">Module</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  Loading correspondence...
                </TableCell>
              </TableRow>
            ) : correspondence.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No correspondence found
                </TableCell>
              </TableRow>
            ) : (
              correspondence.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getDirectionIcon(item.direction)}
                      {getChannelIcon(item.channel)}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{item.correspondenceNumber}</TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(item.createdDate), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.channel}
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
                      {item.summary && (
                        <div className="text-sm text-muted-foreground truncate">
                          {item.summary}
                        </div>
                      )}
                    </div>
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
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
