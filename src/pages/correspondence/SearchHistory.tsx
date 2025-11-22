import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { correspondenceService } from '@/services/correspondenceService';
import {
  Correspondence,
  CorrespondenceDirection,
  CorrespondenceChannel,
  CorrespondenceStatus,
  CorrespondenceModule,
  CorrespondenceFilters,
  PartyType
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
  Calendar as CalendarIcon,
  Download,
  ExternalLink,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SearchHistory() {
  const [correspondence, setCorrespondence] = useState<Correspondence[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [advancedFilters, setAdvancedFilters] = useState<CorrespondenceFilters>({});
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  const handleSearch = async () => {
    if (!searchQuery.trim() && Object.keys(advancedFilters).length === 0 && !dateFrom && !dateTo) {
      toast.error('Please enter search criteria');
      return;
    }

    try {
      setLoading(true);
      const data = await correspondenceService.getAll({
        ...advancedFilters,
        searchQuery,
        dateFrom: dateFrom?.toISOString(),
        dateTo: dateTo?.toISOString()
      });
      setCorrespondence(data);
      toast.success(`Found ${data.length} results`);
    } catch (error) {
      toast.error('Search failed');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSearchQuery('');
    setAdvancedFilters({});
    setDateFrom(undefined);
    setDateTo(undefined);
    setCorrespondence([]);
  };

  const handleExport = () => {
    toast.success('Exporting search results...');
    // Export logic would go here
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
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Search & History</h1>
          <p className="text-muted-foreground">
            Advanced search across all correspondence records
          </p>
        </div>
        {correspondence.length > 0 && (
          <Button onClick={handleExport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Results
          </Button>
        )}
      </div>

      {/* Advanced Search Panel */}
      <Card className="p-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Search Criteria</h3>
          
          {/* Text Search */}
          <div>
            <Label>Search Keywords</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by subject, body, correspondence number, party name..."
                className="pl-10"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
          </div>

          {/* Filters Grid */}
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <Label>Direction</Label>
              <Select
                value={advancedFilters.direction || 'all'}
                onValueChange={(value) =>
                  setAdvancedFilters({ ...advancedFilters, direction: value === 'all' ? undefined : value as CorrespondenceDirection })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any Direction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Direction</SelectItem>
                  <SelectItem value={CorrespondenceDirection.OUTGOING}>Outgoing</SelectItem>
                  <SelectItem value={CorrespondenceDirection.INCOMING}>Incoming</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Channel</Label>
              <Select
                value={(advancedFilters.channel?.[0] as string) || 'all'}
                onValueChange={(value) =>
                  setAdvancedFilters({ ...advancedFilters, channel: value === 'all' ? undefined : [value as CorrespondenceChannel] })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any Channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Channel</SelectItem>
                  {Object.values(CorrespondenceChannel).map((channel) => (
                    <SelectItem key={channel} value={channel}>
                      {channel.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Module</Label>
              <Select
                value={(advancedFilters.module?.[0] as string) || 'all'}
                onValueChange={(value) =>
                  setAdvancedFilters({ ...advancedFilters, module: value === 'all' ? undefined : [value as CorrespondenceModule] })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any Module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Module</SelectItem>
                  {Object.values(CorrespondenceModule).map((module) => (
                    <SelectItem key={module} value={module}>
                      {module}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Status</Label>
              <Select
                value={(advancedFilters.status?.[0] as string) || 'all'}
                onValueChange={(value) =>
                  setAdvancedFilters({ ...advancedFilters, status: value === 'all' ? undefined : [value as CorrespondenceStatus] })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Status</SelectItem>
                  {Object.values(CorrespondenceStatus).map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Date From</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "PPP") : "Pick a date"}
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
            </div>

            <div>
              <Label>Date To</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button onClick={handleSearch} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Results */}
      {correspondence.length > 0 && (
        <Card>
          <div className="p-4 border-b">
            <h3 className="font-semibold">Search Results ({correspondence.length})</h3>
          </div>
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
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {correspondence.map((item) => (
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
                  <TableCell>
                    <Badge className={getStatusColor(item.status)}>
                      {item.status.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {!loading && correspondence.length === 0 && (searchQuery || Object.keys(advancedFilters).length > 0) && (
        <Card className="p-12 text-center">
          <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Results Found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search criteria
          </p>
        </Card>
      )}
    </div>
  );
}
