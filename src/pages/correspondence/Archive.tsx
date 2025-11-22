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
  Search, 
  Filter, 
  Mail, 
  Phone, 
  FileText, 
  User, 
  MessageSquare,
  ArrowUpRight,
  ArrowDownLeft,
  Eye,
  Download,
  Archive as ArchiveIcon,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

export default function Archive() {
  const [correspondence, setCorrespondence] = useState<Correspondence[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CorrespondenceFilters>({
    status: [CorrespondenceStatus.CLOSED]
  });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCorrespondence();
  }, [filters]);

  const loadCorrespondence = async () => {
    try {
      setLoading(true);
      const data = await correspondenceService.getAll({
        ...filters,
        searchQuery,
        status: [CorrespondenceStatus.CLOSED] // Always closed/archived
      });
      setCorrespondence(data);
    } catch (error) {
      toast.error('Failed to load archived correspondence');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      // Restore would change status back to appropriate state
      toast.success('Correspondence restored');
      loadCorrespondence();
    } catch (error) {
      toast.error('Failed to restore correspondence');
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

  const getDirectionIcon = (direction: CorrespondenceDirection) => {
    return direction === CorrespondenceDirection.OUTGOING ? (
      <ArrowUpRight className="h-4 w-4 text-blue-600" />
    ) : (
      <ArrowDownLeft className="h-4 w-4 text-green-600" />
    );
  };

  const outgoingCount = correspondence.filter(c => c.direction === CorrespondenceDirection.OUTGOING).length;
  const incomingCount = correspondence.filter(c => c.direction === CorrespondenceDirection.INCOMING).length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Archive</h1>
          <p className="text-muted-foreground">
            Closed and archived correspondence for historical reference
          </p>
        </div>
        <Button variant="outline" onClick={loadCorrespondence}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Total Archived</div>
              <div className="text-2xl font-semibold mt-1">{correspondence.length}</div>
            </div>
            <ArchiveIcon className="h-8 w-8 text-gray-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Outgoing</div>
              <div className="text-2xl font-semibold mt-1 text-blue-600">{outgoingCount}</div>
            </div>
            <ArrowUpRight className="h-8 w-8 text-blue-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Incoming</div>
              <div className="text-2xl font-semibold mt-1 text-green-600">{incomingCount}</div>
            </div>
            <ArrowDownLeft className="h-8 w-8 text-green-600" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search archive..."
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
              <TableHead className="w-32">Comm. Date</TableHead>
              <TableHead className="w-28">Ref. No.</TableHead>
              <TableHead className="w-20">Channel</TableHead>
              <TableHead>Party</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead className="w-28">Module</TableHead>
              <TableHead className="w-32">Closed Date</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8">
                  Loading archived correspondence...
                </TableCell>
              </TableRow>
            ) : correspondence.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                  No archived correspondence found
                </TableCell>
              </TableRow>
            ) : (
              correspondence.map((item) => (
                <TableRow key={item.id} className="opacity-75">
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
                    <div className="max-w-xs truncate">{item.subject}</div>
                  </TableCell>
                  <TableCell>
                    {item.contexts && item.contexts.length > 0 && (
                      <Badge variant="outline">{item.contexts[0].module}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(item.lastModifiedDate), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" title="View Details">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" title="Download">
                        <Download className="h-4 w-4" />
                      </Button>
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
    </div>
  );
}
