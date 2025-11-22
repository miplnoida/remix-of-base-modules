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
  ArrowUpRight,
  Eye,
  Send,
  CheckCircle2,
  Clock,
  ExternalLink,
  XCircle
} from 'lucide-react';
import NewCorrespondenceDialog from '@/components/correspondence/NewCorrespondenceDialog';

export default function OutgoingCommunications() {
  const [correspondence, setCorrespondence] = useState<Correspondence[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CorrespondenceFilters>({
    direction: CorrespondenceDirection.OUTGOING
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
        direction: CorrespondenceDirection.OUTGOING // Always outgoing
      });
      setCorrespondence(data);
    } catch (error) {
      toast.error('Failed to load outgoing communications');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (id: string) => {
    try {
      await correspondenceService.updateStatus(id, CorrespondenceStatus.SENT);
      toast.success('Correspondence sent');
      loadCorrespondence();
    } catch (error) {
      toast.error('Failed to send correspondence');
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
      case CorrespondenceStatus.DRAFT:
        return 'bg-gray-100 text-gray-800';
      case CorrespondenceStatus.PENDING_APPROVAL:
        return 'bg-yellow-100 text-yellow-800';
      case CorrespondenceStatus.APPROVED:
        return 'bg-blue-100 text-blue-800';
      case CorrespondenceStatus.SENT:
        return 'bg-green-100 text-green-800';
      case CorrespondenceStatus.DELIVERED:
        return 'bg-emerald-100 text-emerald-800';
      case CorrespondenceStatus.FAILED:
      case CorrespondenceStatus.BOUNCED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const draftCount = correspondence.filter(c => c.status === CorrespondenceStatus.DRAFT).length;
  const sentCount = correspondence.filter(c => 
    c.status === CorrespondenceStatus.SENT || c.status === CorrespondenceStatus.DELIVERED
  ).length;
  const pendingApprovalCount = correspondence.filter(c => 
    c.status === CorrespondenceStatus.PENDING_APPROVAL
  ).length;
  const failedCount = correspondence.filter(c => 
    c.status === CorrespondenceStatus.FAILED || c.status === CorrespondenceStatus.BOUNCED
  ).length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Outgoing Communications</h1>
          <p className="text-muted-foreground">
            All outgoing correspondence sent to employers, insured persons, and other parties
          </p>
        </div>
        <Button onClick={() => setShowNewDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Outgoing
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Total Outgoing</div>
              <div className="text-2xl font-semibold mt-1">{correspondence.length}</div>
            </div>
            <ArrowUpRight className="h-8 w-8 text-green-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Drafts</div>
              <div className="text-2xl font-semibold mt-1 text-gray-600">{draftCount}</div>
            </div>
            <FileText className="h-8 w-8 text-gray-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Sent/Delivered</div>
              <div className="text-2xl font-semibold mt-1 text-green-600">{sentCount}</div>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Pending/Failed</div>
              <div className="text-2xl font-semibold mt-1 text-orange-600">
                {pendingApprovalCount + failedCount}
              </div>
            </div>
            <Clock className="h-8 w-8 text-orange-600" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search outgoing..."
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
              <SelectItem value={CorrespondenceStatus.DRAFT}>Draft</SelectItem>
              <SelectItem value={CorrespondenceStatus.PENDING_APPROVAL}>Pending Approval</SelectItem>
              <SelectItem value={CorrespondenceStatus.APPROVED}>Approved</SelectItem>
              <SelectItem value={CorrespondenceStatus.SENT}>Sent</SelectItem>
              <SelectItem value={CorrespondenceStatus.DELIVERED}>Delivered</SelectItem>
              <SelectItem value={CorrespondenceStatus.FAILED}>Failed</SelectItem>
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
              <TableHead className="w-32">Created/Sent</TableHead>
              <TableHead>To (Party)</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead className="w-28">Module</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Loading outgoing communications...
                </TableCell>
              </TableRow>
            ) : correspondence.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No outgoing correspondence found
                </TableCell>
              </TableRow>
            ) : (
              correspondence.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getChannelIcon(item.channel)}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{item.correspondenceNumber}</TableCell>
                  <TableCell className="text-sm">
                    {item.sentDate 
                      ? format(new Date(item.sentDate), 'MMM dd, yyyy')
                      : format(new Date(item.createdDate), 'MMM dd, yyyy')
                    }
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
                      {item.deliveryMetadata?.openedAt && (
                        <div className="text-xs text-green-600 mt-1">
                          Opened: {format(new Date(item.deliveryMetadata.openedAt), 'MMM dd, HH:mm')}
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
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" title="View Details">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {item.status === CorrespondenceStatus.DRAFT && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          title="Send Now"
                          onClick={() => handleSend(item.id)}
                        >
                          <Send className="h-4 w-4" />
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
