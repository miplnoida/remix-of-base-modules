import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, Edit, Trash2, CheckCircle, Search, 
  Download, RefreshCw, ExternalLink, AlertTriangle, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// External API endpoint
const EXTERNAL_API_URL = 'https://hekgiuycrjncxalcapfz.supabase.co/functions/v1/applications';

// Interface for external application data
interface ExternalApplication {
  id: string;
  unique_uuid: string;
  application_id: string;
  ssn: string | null;
  firstname: string | null;
  first_name: string | null;
  middle_name: string | null;
  surname: string | null;
  last_name: string | null;
  dob: string | null;
  date_of_birth: string | null;
  sex: string | null;
  gender: string | null;
  nationality_code: string | null;
  nationality: string | null;
  phone: string | null;
  telephone: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  registration_date: string | null;
  email?: string | null;
  address?: string | null;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  Z: { label: 'Draft', variant: 'secondary' },
  P: { label: 'Pending', variant: 'default' },
  V: { label: 'Verified', variant: 'outline' },
  E: { label: 'Employed', variant: 'default' },
  A: { label: 'Active', variant: 'default' },
  C: { label: 'Ceased', variant: 'destructive' },
  T: { label: 'Terminated', variant: 'destructive' },
  I: { label: 'Inactive', variant: 'secondary' },
  S: { label: 'Suspended', variant: 'destructive' },
  R: { label: 'Rejected', variant: 'destructive' },
};

export default function ExternalApplicationsScreen() {
  const [applications, setApplications] = useState<ExternalApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [selectedApplication, setSelectedApplication] = useState<ExternalApplication | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  // Fetch external applications
  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(EXTERNAL_API_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }

      const data = await response.json();
      
      // Handle different response formats
      let apps: any[] = [];
      if (Array.isArray(data)) {
        apps = data;
      } else if (data && typeof data === 'object') {
        apps = data.data || data.applications || data.records || [];
      }

      // Map external data to our format
      const mappedApplications: ExternalApplication[] = apps.map((app: any, index: number) => ({
        id: app.id || `external-${app.application_id || app.reference || index}`,
        unique_uuid: app.unique_uuid || app.uuid || `ext-${app.id || app.application_id || index}`,
        application_id: app.application_id || app.applicationId || app.reference || app.ref_number || `EXT-${index + 1}`,
        ssn: app.ssn || app.social_security_number || null,
        firstname: app.firstname || app.first_name || app.firstName || null,
        first_name: app.first_name || app.firstname || app.firstName || null,
        middle_name: app.middle_name || app.middleName || null,
        surname: app.surname || app.last_name || app.lastName || null,
        last_name: app.last_name || app.surname || app.lastName || null,
        dob: app.dob || app.date_of_birth || app.dateOfBirth || null,
        date_of_birth: app.date_of_birth || app.dob || app.dateOfBirth || null,
        sex: app.sex || app.gender || null,
        gender: app.gender || app.sex || null,
        nationality_code: app.nationality_code || app.nationalityCode || app.nationality || null,
        nationality: app.nationality || app.nationality_code || null,
        phone: app.phone || app.telephone || app.phoneNumber || null,
        telephone: app.telephone || app.phone || app.phoneNumber || null,
        status: app.status || 'P',
        created_by: app.created_by || app.createdBy || null,
        created_at: app.created_at || app.createdAt || new Date().toISOString(),
        registration_date: app.registration_date || app.registrationDate || null,
        email: app.email || null,
        address: app.address || null,
      }));

      setApplications(mappedApplications);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch external applications';
      console.error('External API error:', errorMessage);
      setError(errorMessage);
      toast.error('Failed to load external applications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Get full name from record
  const getFullName = (record: ExternalApplication): string => {
    const firstName = record.firstname || record.first_name || '';
    const middleName = record.middle_name || '';
    const lastName = record.surname || record.last_name || '';
    return [firstName, middleName, lastName].filter(Boolean).join(' ') || '-';
  };

  // Get date of birth
  const getDateOfBirth = (record: ExternalApplication): string => {
    const dob = record.dob || record.date_of_birth;
    if (!dob) return '-';
    try {
      return format(new Date(dob), 'dd/MM/yyyy');
    } catch {
      return dob;
    }
  };

  // Get gender display
  const getGenderDisplay = (record: ExternalApplication): string => {
    const gender = record.sex || record.gender;
    if (gender === 'M') return 'Male';
    if (gender === 'F') return 'Female';
    if (gender === 'N') return 'Not-Specified';
    return gender || '-';
  };

  // Quick search filter (client-side)
  const filteredApplications = useMemo(() => {
    if (!searchText) return applications;
    
    const search = searchText.toLowerCase();
    return applications.filter(record => {
      const fullName = getFullName(record).toLowerCase();
      return (
        record.application_id?.toLowerCase().includes(search) ||
        record.ssn?.toLowerCase().includes(search) ||
        fullName.includes(search) ||
        (record.phone || record.telephone)?.toLowerCase().includes(search)
      );
    });
  }, [applications, searchText]);

  // View handler
  const handleView = (record: ExternalApplication) => {
    setSelectedApplication(record);
    setViewDialogOpen(true);
  };

  // Actions are disabled by default since external API doesn't support mutations
  const canEdit = false;
  const canDelete = false;
  const canVerify = false;

  const handleDisabledAction = (action: string) => {
    toast.info(`${action} is not available for external applications`, {
      description: 'This action is not supported by the external API.',
    });
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
            <ExternalLink className="h-6 w-6 text-blue-600" />
            External Applications
          </h1>
          <p className="text-muted-foreground">
            Third-party insured person registration applications
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={fetchApplications}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Info Alert */}
      <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
        <ExternalLink className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-700 dark:text-blue-400">External Data Source</AlertTitle>
        <AlertDescription className="text-blue-600 dark:text-blue-300">
          This screen displays applications fetched from an external third-party API. 
          These records are read-only and not stored in the local database.
        </AlertDescription>
      </Alert>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Data</AlertTitle>
          <AlertDescription>
            {error}. Please try refreshing the page or contact support if the issue persists.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
              {filteredApplications.length} Applications
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Quick Search */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by Application ID/SSN, Name, Phone...." 
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">show</span>
              <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(parseInt(v))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">records</span>
            </div>
          </div>

          {/* Table Header with Export */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">
              External Applications ({filteredApplications.length})
            </h3>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>

          {/* Records Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Application ID/SSN</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date of Birth</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Loading external applications...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2 text-destructive">
                        <AlertTriangle className="h-8 w-8" />
                        <span>Failed to load data</span>
                        <Button variant="outline" size="sm" onClick={fetchApplications}>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Retry
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredApplications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No external applications found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredApplications.slice(0, pageSize).map((record) => (
                    <TableRow key={record.id} className="bg-blue-50/30 dark:bg-blue-950/10">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span>{record.ssn || record.application_id}</span>
                          <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            External
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{getFullName(record)}</TableCell>
                      <TableCell>
                        <Badge variant={statusConfig[record.status]?.variant || 'default'}>
                          {statusConfig[record.status]?.label || record.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{getDateOfBirth(record)}</TableCell>
                      <TableCell>{getGenderDisplay(record)}</TableCell>
                      <TableCell>{record.phone || record.telephone || '-'}</TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <div className="flex items-center gap-1">
                            {/* View - always enabled */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleView(record)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View Details</TooltipContent>
                            </Tooltip>

                            {/* Edit - disabled */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  disabled
                                  onClick={() => handleDisabledAction('Edit')}
                                  className="opacity-50 cursor-not-allowed"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit not supported by external API</TooltipContent>
                            </Tooltip>

                            {/* Delete - disabled */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  disabled
                                  onClick={() => handleDisabledAction('Delete')}
                                  className="opacity-50 cursor-not-allowed"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete not supported by external API</TooltipContent>
                            </Tooltip>

                            {/* Verify - disabled */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  disabled
                                  onClick={() => handleDisabledAction('Verify')}
                                  className="opacity-50 cursor-not-allowed"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Verify not supported by external API</TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5 text-blue-600" />
              Application Details
            </DialogTitle>
            <DialogDescription>
              External application record (Read-Only)
            </DialogDescription>
          </DialogHeader>
          
          {selectedApplication && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Application ID</label>
                  <p className="text-foreground font-medium">{selectedApplication.application_id || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">SSN</label>
                  <p className="text-foreground font-medium">{selectedApplication.ssn || '-'}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                  <p className="text-foreground">{getFullName(selectedApplication)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <Badge variant={statusConfig[selectedApplication.status]?.variant || 'default'}>
                    {statusConfig[selectedApplication.status]?.label || selectedApplication.status}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                  <p className="text-foreground">{getDateOfBirth(selectedApplication)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Gender</label>
                  <p className="text-foreground">{getGenderDisplay(selectedApplication)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone</label>
                  <p className="text-foreground">{selectedApplication.phone || selectedApplication.telephone || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-foreground">{selectedApplication.email || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nationality</label>
                  <p className="text-foreground">{selectedApplication.nationality || selectedApplication.nationality_code || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created At</label>
                  <p className="text-foreground">
                    {selectedApplication.created_at 
                      ? format(new Date(selectedApplication.created_at), 'dd/MM/yyyy HH:mm')
                      : '-'}
                  </p>
                </div>
              </div>

              {selectedApplication.address && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Address</label>
                  <p className="text-foreground">{selectedApplication.address}</p>
                </div>
              )}

              <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-700 dark:text-amber-400">
                  This is a read-only view of an external record. Editing, deleting, and verification 
                  are not available for external API records.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
