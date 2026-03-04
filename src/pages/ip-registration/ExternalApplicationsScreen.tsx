import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, Edit, Trash2, CheckCircle, Search, 
  Download, RefreshCw, ExternalLink, AlertTriangle, Loader2,
  User, Phone, Mail, MapPin, Calendar, Briefcase, Users, FileText
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
import { ScrollArea } from '@/components/ui/scroll-area';

// External API endpoint
const EXTERNAL_API_URL = 'https://fiqyahojoouloswmnhcu.supabase.co/functions/v1/applications';

// Date display format (consistent with project standards)
const DATE_DISPLAY_FORMAT = 'dd/MM/yyyy';
const DATETIME_DISPLAY_FORMAT = 'dd/MM/yyyy HH:mm';

// Interface for external application data (list view)
interface ExternalApplication {
  id: string;
  unique_uuid: string;
  application_id: string;
  ssn: string | null;
  firstname: string | null;
  middle_name: string | null;
  surname: string | null;
  dob: string | null;
  sex: string | null;
  nationality: string | null;
  phone: string | null;
  telephone: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  registration_date: string | null;
  email_addr?: string | null;
  address?: string | null;
}

// Interface for detailed application data (single record view)
interface ApplicationDetails {
  [key: string]: any;
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

// Helper to format field names for display
const formatFieldName = (key: string): string => {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
};

// Helper to format date values
const formatDateValue = (value: string): string => {
  if (!value) return '-';
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    // Check if it includes time component
    if (value.includes('T') || value.includes(' ')) {
      return format(date, DATETIME_DISPLAY_FORMAT);
    }
    return format(date, DATE_DISPLAY_FORMAT);
  } catch {
    return value;
  }
};

// Helper to check if a value looks like a date
const isDateLikeValue = (key: string, value: any): boolean => {
  if (typeof value !== 'string') return false;
  const dateKeywords = ['date', 'dob', 'birth', 'created', 'updated', 'at', 'time', 'expire'];
  const keyLower = key.toLowerCase();
  const hasDateKeyword = dateKeywords.some(keyword => keyLower.includes(keyword));
  const matchesDatePattern = /^\d{4}-\d{2}-\d{2}/.test(value) || /^\d{2}\/\d{2}\/\d{4}/.test(value);
  return hasDateKeyword && matchesDatePattern;
};

// Helper to get status display
const getStatusDisplay = (status: string): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } => {
  return statusConfig[status] || { label: status, variant: 'default' };
};

// Helper to format gender display
const formatGenderDisplay = (value: string | null): string => {
  if (!value) return '-';
  if (value === 'M') return 'Male';
  if (value === 'F') return 'Female';
  if (value === 'N') return 'Not-Specified';
  return value;
};

// Helper to format any value for display
const formatDisplayValue = (key: string, value: any): React.ReactNode => {
  if (value === null || value === undefined || value === '') return '-';
  
  // Handle arrays
  if (Array.isArray(value)) {
    if (value.length === 0) return '-';
    return value.map((item, idx) => (
      typeof item === 'object' ? JSON.stringify(item) : String(item)
    )).join(', ');
  }
  
  // Handle objects
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  
  // Handle status fields
  const keyLower = key.toLowerCase();
  if (keyLower === 'status') {
    const statusInfo = getStatusDisplay(String(value));
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  }
  
  // Handle gender fields
  if (keyLower === 'sex' || keyLower === 'gender') {
    return formatGenderDisplay(String(value));
  }
  
  // Handle date-like values
  if (isDateLikeValue(key, value)) {
    return formatDateValue(String(value));
  }
  
  // Handle booleans
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  
  return String(value);
};

// Group fields by category
const groupFields = (data: ApplicationDetails): Record<string, Record<string, any>> => {
  const groups: Record<string, Record<string, any>> = {
    'Applicant Details': {},
    'Personal Information': {},
    'Contact Information': {},
    'Employment Information': {},
    'Relations': {},
    'Dependents': {},
    'Notes & Remarks': {},
    'Status & Dates': {},
    'Other Information': {},
  };

  // Field categorization rules
  const fieldCategories: Record<string, string[]> = {
    'Applicant Details': ['application_id', 'ref_number', 'reference', 'ssn', 'social_security_number', 'unique_uuid', 'id'],
    'Personal Information': ['firstname', 'middle_name', 'surname', 'full_name', 'name', 'dob', 'birth_date', 'sex', 'nationality', 'place_of_birth', 'marital_status'],
    'Contact Information': ['phone', 'telephone', 'mobile', 'cell', 'email', 'address', 'street', 'city', 'parish', 'country', 'postal', 'zip', 'fax'],
    'Employment Information': ['employer', 'occupation', 'job', 'work', 'employment', 'company', 'business', 'salary', 'wage', 'income'],
    'Relations': ['spouse', 'mother', 'father', 'parent', 'next_of_kin', 'emergency_contact', 'relation'],
    'Dependents': ['dependent', 'child', 'children'],
    'Notes & Remarks': ['note', 'remark', 'comment', 'description', 'memo'],
    'Status & Dates': ['status', 'state', 'created', 'updated', 'submitted', 'approved', 'rejected', 'registration_date', 'effective_date', 'expire'],
  };

  // Skip these internal fields
  const skipFields = ['_source', '_externalId'];

  Object.entries(data).forEach(([key, value]) => {
    if (skipFields.includes(key)) return;
    
    const keyLower = key.toLowerCase();
    let assigned = false;

    for (const [category, keywords] of Object.entries(fieldCategories)) {
      if (keywords.some(keyword => keyLower.includes(keyword))) {
        groups[category][key] = value;
        assigned = true;
        break;
      }
    }

    if (!assigned) {
      groups['Other Information'][key] = value;
    }
  });

  // Remove empty groups
  Object.keys(groups).forEach(key => {
    if (Object.keys(groups[key]).length === 0) {
      delete groups[key];
    }
  });

  return groups;
};

// Get icon for each group
const getGroupIcon = (groupName: string): React.ReactNode => {
  const icons: Record<string, React.ReactNode> = {
    'Applicant Details': <FileText className="h-4 w-4" />,
    'Personal Information': <User className="h-4 w-4" />,
    'Contact Information': <Phone className="h-4 w-4" />,
    'Employment Information': <Briefcase className="h-4 w-4" />,
    'Relations': <Users className="h-4 w-4" />,
    'Dependents': <Users className="h-4 w-4" />,
    'Notes & Remarks': <FileText className="h-4 w-4" />,
    'Status & Dates': <Calendar className="h-4 w-4" />,
    'Other Information': <FileText className="h-4 w-4" />,
  };
  return icons[groupName] || <FileText className="h-4 w-4" />;
};

export default function ExternalApplicationsScreen() {
  const [applications, setApplications] = useState<ExternalApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [pageSize, setPageSize] = useState(10);
  
  // View dialog states
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [applicationDetails, setApplicationDetails] = useState<ApplicationDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  // Fetch external applications list
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
        id: app.id || `external-${app.referenceNumber || app.application_id || index}`,
        unique_uuid: app.unique_uuid || app.uuid || app.id || `ext-${index}`,
        // Prioritize referenceNumber as the primary application identifier
        application_id: app.referenceNumber || app.reference_number || app.application_id || app.applicationId || app.reference || app.ref_number || `EXT-${index + 1}`,
        ssn: app.ssn || app.social_security_number || app.registrationNumber || null,
        firstname: app.firstName || app.firstname || app.first_name || null,
        middle_name: app.middleName || app.middle_name || null,
        surname: app.lastName || app.surname || app.last_name || null,
        dob: app.dob || app.date_of_birth || app.dateOfBirth || null,
        sex: app.sex || app.gender || null,
        nationality: app.nationality || app.nationality_code || null,
        phone: app.phoneMobile || app.phone || app.telephone || app.phoneNumber || null,
        telephone: app.phoneMobile || app.telephone || app.phone || app.phoneNumber || null,
        status: app.status || 'P',
        created_by: app.created_by || app.createdBy || null,
        created_at: app.createdAt || app.created_at || new Date().toISOString(),
        registration_date: app.submittedAt || app.registration_date || app.registrationDate || null,
        email_addr: app.email || null,
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

  // Fetch single application details
  const fetchApplicationDetails = useCallback(async (applicationId: string) => {
    setDetailsLoading(true);
    setDetailsError(null);
    setApplicationDetails(null);

    try {
      const apiUrl = `${EXTERNAL_API_URL}/${encodeURIComponent(applicationId)}`;
      console.log('Fetching application details from:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch application details (Status: ${response.status})`);
      }

      const data = await response.json();
      
      // Handle wrapped response if needed
      let details: ApplicationDetails;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        // Check if data is wrapped in a property
        details = data.data || data.application || data.record || data;
      } else {
        details = data;
      }

      setApplicationDetails(details);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch application details';
      console.error('External API detail error:', errorMessage);
      setDetailsError(errorMessage);
      toast.error('Failed to load application details');
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Handle View button click
  const handleView = (record: ExternalApplication) => {
    const applicationId = record.application_id;
    setSelectedApplicationId(applicationId);
    setViewDialogOpen(true);
    fetchApplicationDetails(applicationId);
  };

  // Close view dialog
  const handleCloseView = () => {
    setViewDialogOpen(false);
    setSelectedApplicationId(null);
    setApplicationDetails(null);
    setDetailsError(null);
  };

  // Get full name from record
  const getFullName = (record: ExternalApplication): string => {
    const firstName = record.firstname || '';
    const middleName = record.middle_name || '';
    const lastName = record.surname || '';
    return [firstName, middleName, lastName].filter(Boolean).join(' ') || '-';
  };

  // Get date of birth
  const getDateOfBirth = (record: ExternalApplication): string => {
    const dob = record.dob;
    if (!dob) return '-';
    try {
      return format(new Date(dob), DATE_DISPLAY_FORMAT);
    } catch {
      return dob;
    }
  };

  // Get gender display
  const getGenderDisplay = (record: ExternalApplication): string => {
    const gender = record.sex;
    return formatGenderDisplay(gender);
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

  // Actions are disabled by default since external API doesn't support mutations
  const handleDisabledAction = (action: string) => {
    toast.info(`${action} is not available for external applications`, {
      description: 'This action is not supported by the external API.',
    });
  };

  // Render grouped application details
  const renderApplicationDetails = () => {
    if (detailsLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading application details...</p>
        </div>
      );
    }

    if (detailsError) {
      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Details</AlertTitle>
          <AlertDescription>
            {detailsError}
            <div className="mt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => selectedApplicationId && fetchApplicationDetails(selectedApplicationId)}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    if (!applicationDetails) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No details available
        </div>
      );
    }

    const groupedFields = groupFields(applicationDetails);

    return (
      <ScrollArea className="h-[60vh]">
        <div className="space-y-6 pr-4">
          {Object.entries(groupedFields).map(([groupName, fields]) => (
            <div key={groupName} className="space-y-3">
              <div className="flex items-center gap-2 text-primary font-semibold">
                {getGroupIcon(groupName)}
                <h4>{groupName}</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                {Object.entries(fields).map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {formatFieldName(key)}
                    </label>
                    <div className="text-sm text-foreground break-words">
                      {formatDisplayValue(key, value)}
                    </div>
                  </div>
                ))}
              </div>
              <Separator className="mt-4" />
            </div>
          ))}

          {/* Read-only warning */}
          <Alert className="border-warning/30 bg-warning/10">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-warning">
              This is a read-only view of an external record. Editing, deleting, and verification 
              are not available for external API records.
            </AlertDescription>
          </Alert>
        </div>
      </ScrollArea>
    );
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

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={handleCloseView}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5 text-blue-600" />
              Application Details
              {selectedApplicationId && (
                <Badge variant="outline" className="ml-2">
                  {selectedApplicationId}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              External application record (Read-Only)
            </DialogDescription>
          </DialogHeader>
          
          {renderApplicationDetails()}

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseView}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
