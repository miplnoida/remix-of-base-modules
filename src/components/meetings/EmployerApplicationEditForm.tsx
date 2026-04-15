import React, { useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Factory,
  Building2,
  Phone,
  Monitor,
  UserCircle,
  Globe,
  FileText,
  ClipboardCheck,
  MapPin,
  Mail,
  Users,
  Shield,
  Calendar,
  StickyNote,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Download,
} from 'lucide-react';
import { useERLookups } from '@/hooks/useERLookups';
import { useCountries } from '@/hooks/useIPMasterLookups';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { supabase } from '@/integrations/supabase/client';
import { logAuditTrail } from '@/services/auditService';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { EmployerMeetingDocumentsTab as EmployerMeetingDocumentsTabComponent } from './EmployerMeetingDocumentsTab';
import { ER_FIELD_LIMITS } from '@/validations/employerValidationSchema';
import { validateField, validateForm } from '@/lib/fieldValidationRegistry';
import { sanitizePhoneInput } from '@/lib/contactValidation';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    return format(new Date(dateStr), 'yyyy-MM-dd');
  } catch {
    return dateStr;
  }
}

function formatPhone(phone: string | null | undefined, dialCode: string | null | undefined): string {
  if (!phone) return '—';
  if (dialCode) return `(${dialCode}) ${phone}`;
  return phone;
}

// ─── Section Header ─────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex items-center justify-center h-8 w-8 rounded-md bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Editable Field ─────────────────────────────────────────────────────────

function EditField({
  label,
  value,
  onChange,
  type = 'text',
  maxLength,
  className,
  error,
  isRequired,
}: {
  label: string;
  value: any;
  onChange: (value: any) => void;
  type?: 'text' | 'email' | 'date' | 'number';
  maxLength?: number;
  className?: string;
  error?: string;
  isRequired?: boolean;
}) {
  return (
    <div className={`space-y-1.5 ${className || ''}`}>
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
        {isRequired && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      <Input
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(type === 'number' ? (e.target.value ? Number(e.target.value) : null) : e.target.value)}
        maxLength={maxLength}
        className={`h-9 ${error ? 'border-destructive focus-visible:ring-destructive' : ''}`}
      />
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

// ─── Select Field ───────────────────────────────────────────────────────────

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
  isRequired,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { code: string; label: string }[];
  placeholder?: string;
  error?: string;
  isRequired?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
        {isRequired && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      <div className={error ? 'rounded-md ring-1 ring-destructive' : ''}>
        <SearchableSelect
          options={options.map(o => ({ value: o.code, label: o.label }))}
          value={value || ''}
          onValueChange={onChange}
          placeholder={placeholder || `Select ${label}`}
          searchPlaceholder={`Search ${label.toLowerCase()}...`}
        />
      </div>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

// ─── Validation logic ───────────────────────────────────────────────────────

// Map fields to tabs for error grouping
const FIELD_TAB_MAP: Record<string, string> = {
  ownership_code: 'employer-profile',
  employer_name: 'basic-details',
  hq_address1: 'basic-details',
  application_date: 'basic-details',
  contact_telephone: 'contact-reach',
  email: 'contact-reach',
  mobile: 'contact-reach',
  contact_method: 'contact-reach',
  village_code: 'contact-reach',
  activity_type: 'contact-reach',
};

function validateAllFields(data: Record<string, any>): Record<string, string> {
  const errors: Record<string, string> = {};

  // Employer Profile tab
  if (!data.ownership_code?.trim()) {
    errors.ownership_code = 'Ownership type is required';
  }

  // Basic Details tab
  if (!data.employer_name?.trim()) {
    errors.employer_name = 'Employer name is required';
  } else if (data.employer_name.trim().length > 40) {
    errors.employer_name = `Employer name exceeds 40 characters (${data.employer_name.trim().length})`;
  }

  // Contact & Reach tab
  const hasContact = data.contact_telephone?.trim() || data.email?.trim() || data.business_email?.trim() || data.mobile?.trim();
  if (!hasContact) {
    errors.contact_method = 'At least one contact method (phone, email, or mobile) is required';
  }

  if (!data.village_code?.trim()) {
    errors.village_code = 'Village is required';
  }

  if (!data.activity_type?.trim()) {
    errors.activity_type = 'Activity type is required';
  }

  return errors;
}

function getTabErrorCounts(errors: Record<string, string>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const field of Object.keys(errors)) {
    const tab = FIELD_TAB_MAP[field] || 'unknown';
    counts[tab] = (counts[tab] || 0) + 1;
  }
  return counts;
}

function getFirstErrorTab(errors: Record<string, string>): string | null {
  const tabOrder = ['employer-profile', 'basic-details', 'contact-reach'];
  for (const tab of tabOrder) {
    for (const field of Object.keys(errors)) {
      if (FIELD_TAB_MAP[field] === tab) return tab;
    }
  }
  return null;
}

// ─── Imperative Handle ──────────────────────────────────────────────────────

export interface EmployerApplicationEditFormHandle {
  triggerValidation: () => { valid: boolean; errors: Record<string, string> };
}

// ─── Main Component ─────────────────────────────────────────────────────────

interface EmployerApplicationEditFormProps {
  data: Record<string, any>;
  onChange: (field: string, value: any) => void;
  onDataChange: (newData: Record<string, any>) => void;
  meetingId?: string;
  applicationReference?: string;
  onSaveTab?: (tabId: string) => Promise<void>;
  dirtyTabs?: Set<string>;
  savingTabs?: Set<string>;
}

export const EmployerApplicationEditForm = forwardRef<EmployerApplicationEditFormHandle, EmployerApplicationEditFormProps>(
  function EmployerApplicationEditForm({ data, onChange, onDataChange, meetingId, applicationReference }, ref) {
  const {
    officeCodes,
    ownershipCodes,
    sectorCodes,
    industrialCodes,
    villageCodes,
    activityTypes,
    inspectorCodes,
  } = useERLookups();
  const { data: countries = [] } = useCountries();

  const countryOptions = countries.map(c => ({
    code: c.code?.trim() || '',
    label: `${c.code?.trim() || ''} - ${c.description?.trim() || ''}`,
  }));

  // Validation errors state
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('employer-profile');

  // Expose triggerValidation to parent
  useImperativeHandle(ref, () => ({
    triggerValidation: () => {
      const errors = validateAllFields(data);
      setValidationErrors(errors);
      if (Object.keys(errors).length > 0) {
        const firstTab = getFirstErrorTab(errors);
        if (firstTab) setActiveTab(firstTab);
      }
      return { valid: Object.keys(errors).length === 0, errors };
    },
  }), [data]);

  // Wrap onChange to clear validation errors
  const handleFieldChange = useCallback((field: string, value: any) => {
    onChange(field, value);
    setValidationErrors(prev => {
      if (!prev[field]) {
        // For contact_method composite error, clear when any contact field changes
        if (['contact_telephone', 'email', 'business_email', 'mobile'].includes(field) && prev.contact_method) {
          const next = { ...prev };
          delete next.contact_method;
          return next;
        }
        return prev;
      }
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, [onChange]);

  // Owner CRUD state
  const [ownerDialogOpen, setOwnerDialogOpen] = useState(false);
  const [ownerEditIndex, setOwnerEditIndex] = useState<number | null>(null);
  const [ownerForm, setOwnerForm] = useState<Record<string, any>>({});
  const [ownerDeleteIndex, setOwnerDeleteIndex] = useState<number | null>(null);
  const [ownerErrors, setOwnerErrors] = useState<Record<string, string>>({});

  // Location CRUD state
  const [locDialogOpen, setLocDialogOpen] = useState(false);
  const [locEditIndex, setLocEditIndex] = useState<number | null>(null);
  const [locForm, setLocForm] = useState<Record<string, any>>({});
  const [locDeleteIndex, setLocDeleteIndex] = useState<number | null>(null);
  const [locErrors, setLocErrors] = useState<Record<string, string>>({});

  const owners: any[] = Array.isArray(data.owners) ? data.owners : [];
  const locations: any[] = Array.isArray(data.locations) ? data.locations : [];
  const documents: any[] = Array.isArray(data.documents) ? data.documents : [];
  const remarks: any[] = Array.isArray(data.remarks) ? data.remarks : [];

  // Tab error counts
  const tabErrorCounts = getTabErrorCounts(validationErrors);

  // ─── Owner CRUD ─────────────────────────────────────────────────────────

  const openAddOwner = () => {
    setOwnerEditIndex(null);
    setOwnerForm({ id: `temp-${Date.now()}`, name: '', title: '', phone: '', phone_dial_code: '', email: '', ssn: '', mobile: '' });
    setOwnerErrors({});
    setOwnerDialogOpen(true);
  };

  const openEditOwner = (index: number) => {
    setOwnerEditIndex(index);
    setOwnerForm({ ...owners[index] });
    setOwnerErrors({});
    setOwnerDialogOpen(true);
  };

  const handleOwnerFieldChange = useCallback((field: string, value: string) => {
    let sanitized = value;
    if (field === 'phone' || field === 'mobile') {
      sanitized = sanitizePhoneInput(value);
    }
    if (field === 'ssn') {
      sanitized = value.replace(/\D/g, '');
    }
    setOwnerForm(p => ({ ...p, [field]: sanitized }));
    const result = validateField(`owner.${field}`, sanitized);
    setOwnerErrors(prev => {
      const next = { ...prev };
      if (result.valid) delete next[field];
      else next[field] = result.error!;
      return next;
    });
  }, []);

  const saveOwner = () => {
    const allErrors = validateForm('owner', ownerForm);
    if (Object.keys(allErrors).length > 0) {
      setOwnerErrors(allErrors);
      const firstError = Object.values(allErrors)[0];
      toast.error('Please check the form for valid information!', {
        description: firstError,
        style: { backgroundColor: 'hsl(var(--destructive))', color: 'white', '--description-color': 'white' } as React.CSSProperties,
        classNames: { toast: '!bg-destructive', title: '!text-white', description: '!text-white !opacity-100' },
      });
      return;
    }
    const updated = [...owners];
    if (ownerEditIndex !== null) {
      updated[ownerEditIndex] = ownerForm;
    } else {
      updated.push(ownerForm);
    }
    onDataChange({ ...data, owners: updated });
    setOwnerDialogOpen(false);
  };

  const confirmDeleteOwner = () => {
    if (ownerDeleteIndex !== null) {
      const updated = owners.filter((_, i) => i !== ownerDeleteIndex);
      onDataChange({ ...data, owners: updated });
      setOwnerDeleteIndex(null);
    }
  };

  // ─── Location CRUD ──────────────────────────────────────────────────────

  const openAddLocation = () => {
    setLocEditIndex(null);
    setLocForm({ id: `temp-${Date.now()}`, trade_name: '', address1: '', address2: '', activity_type: '', city: '', state: '', country: '' });
    setLocErrors({});
    setLocDialogOpen(true);
  };

  const openEditLocation = (index: number) => {
    setLocEditIndex(index);
    setLocForm({ ...locations[index] });
    setLocErrors({});
    setLocDialogOpen(true);
  };

  const handleLocFieldChange = useCallback((field: string, value: string) => {
    setLocForm(p => ({ ...p, [field]: value }));
    const result = validateField(`location.${field}`, value);
    setLocErrors(prev => {
      const next = { ...prev };
      if (result.valid) delete next[field];
      else next[field] = result.error!;
      return next;
    });
  }, []);

  const saveLocation = () => {
    const allErrors = validateForm('location', locForm);
    if (Object.keys(allErrors).length > 0) {
      setLocErrors(allErrors);
      const firstError = Object.values(allErrors)[0];
      toast.error('Please check the form for valid information!', {
        description: firstError,
        style: { backgroundColor: 'hsl(var(--destructive))', color: 'white', '--description-color': 'white' } as React.CSSProperties,
        classNames: { toast: '!bg-destructive', title: '!text-white', description: '!text-white !opacity-100' },
      });
      return;
    }
    const updated = [...locations];
    if (locEditIndex !== null) {
      updated[locEditIndex] = locForm;
    } else {
      updated.push(locForm);
    }
    onDataChange({ ...data, locations: updated });
    setLocDialogOpen(false);
  };

  const confirmDeleteLocation = () => {
    if (locDeleteIndex !== null) {
      const updated = locations.filter((_, i) => i !== locDeleteIndex);
      onDataChange({ ...data, locations: updated });
      setLocDeleteIndex(null);
    }
  };

  // ─── Document actions (read-only) ───────────────────────────────────────

  const [docActionLoading, setDocActionLoading] = useState<string | null>(null);

  const handleDocAction = async (doc: any, action: 'view' | 'download') => {
    const docId = doc.id || doc.file_name || 'unknown';
    setDocActionLoading(docId);
    try {
      let url = doc.download_url || doc.url || doc.signed_url;

      // Platform docs: use signed URL from storage
      if (doc.file_path && !url) {
        const { data: signedData, error: signedErr } = await supabase.storage
          .from('employer-documents')
          .createSignedUrl(doc.file_path, 3600);
        if (signedErr) throw signedErr;
        url = signedData?.signedUrl;
      }

      // External docs: route through document-proxy for reliable access
      if (url && !doc.file_path) {
        const proxyAction = action === 'view' ? 'stream' : 'download';
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const proxyUrl = `https://${projectId}.supabase.co/functions/v1/document-proxy`;
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        if (token) {
          const proxyResp = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              action: proxyAction,
              documentUrl: url,
              fileName: doc.file_name || doc.name || 'document',
            }),
          });

          if (proxyResp.ok) {
            const blob = await proxyResp.blob();
            const blobUrl = URL.createObjectURL(blob);

            logAuditTrail({
              action: action === 'view' ? 'DOCUMENT_VIEW' : 'DOCUMENT_DOWNLOAD',
              entityType: 'employer-application-document',
              entityId: docId,
              module: 'employer-applications',
              metadata: { file_name: doc.file_name || doc.name, application_id: data.id },
            });

            if (action === 'view') {
              window.open(blobUrl, '_blank');
            } else {
              const link = document.createElement('a');
              link.href = blobUrl;
              link.download = doc.file_name || doc.name || 'document';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }
            setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
            return;
          }
          // If proxy fails, fall through to direct URL
          console.warn('Document proxy failed, falling back to direct URL');
        }
      }

      if (!url) {
        toast.error('Document URL is not available');
        return;
      }
      logAuditTrail({
        action: action === 'view' ? 'DOCUMENT_VIEW' : 'DOCUMENT_DOWNLOAD',
        entityType: 'employer-application-document',
        entityId: docId,
        module: 'employer-applications',
        metadata: { file_name: doc.file_name || doc.name, application_id: data.id },
      });
      if (action === 'view') {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.download = doc.file_name || doc.name || 'document';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Document action failed:', err);
      toast.error('Failed to access document');
    } finally {
      setDocActionLoading(null);
    }
  };

  // Helper to render tab trigger with error badge
  const renderTabTrigger = (value: string, icon: React.ElementType, label: string, shortLabel?: string) => {
    const Icon = icon;
    const errorCount = tabErrorCounts[value] || 0;
    return (
      <TabsTrigger value={value} className="gap-1.5 text-xs px-2 py-2 relative">
        <Icon className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{label}</span>
        {shortLabel && <span className="sm:hidden">{shortLabel}</span>}
        {!shortLabel && <span className="sm:hidden">{label}</span>}
        {errorCount > 0 && (
          <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
            {errorCount}
          </span>
        )}
      </TabsTrigger>
    );
  };

  return (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-4 lg:grid-cols-8 h-auto gap-0">
          {renderTabTrigger('employer-profile', Factory, 'Employer Profile', 'Profile')}
          {renderTabTrigger('basic-details', Building2, 'Basic Details', 'Basic')}
          {renderTabTrigger('contact-reach', Phone, 'Contact & Reach', 'Contact')}
          {renderTabTrigger('tech-finance', Monitor, 'Tech & Finance', 'Tech')}
          <TabsTrigger value="owners" className="gap-1.5 text-xs px-2 py-2">
            <UserCircle className="h-3.5 w-3.5" />
            Owners
          </TabsTrigger>
          <TabsTrigger value="locations" className="gap-1.5 text-xs px-2 py-2">
            <Globe className="h-3.5 w-3.5" />
            Locations
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5 text-xs px-2 py-2">
            <FileText className="h-3.5 w-3.5" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-1.5 text-xs px-2 py-2">
            <ClipboardCheck className="h-3.5 w-3.5" />
            Notes
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Employer Profile */}
        <TabsContent value="employer-profile">
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <SectionHeader icon={Users} title="Previous Owner Information" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <EditField label="Previous Owner" value={data.previous_owner} onChange={(v) => handleFieldChange('previous_owner', v)} maxLength={40} />
                  <EditField label="Previous Owner Address" value={data.prev_owner_address1} onChange={(v) => handleFieldChange('prev_owner_address1', v)} maxLength={25} />
                  <EditField label="Previous Owner Address 2" value={data.prev_owner_address2} onChange={(v) => handleFieldChange('prev_owner_address2', v)} maxLength={25} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <SectionHeader icon={Factory} title="Acquisition / Incorporation" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Acquired Company</Label>
                    <div className="flex items-center gap-2 h-9">
                      <Switch
                        checked={data.is_acquired === true || data.is_acquired === 'Y'}
                        onCheckedChange={(checked) => handleFieldChange('is_acquired', checked)}
                      />
                      <Badge variant={data.is_acquired ? 'default' : 'secondary'}>
                        {data.is_acquired ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                  </div>
                  <EditField label="Acquisition Date" value={formatDate(data.date_acquired)} onChange={(v) => handleFieldChange('date_acquired', v)} type="date" />
                  <EditField label="Incorporated Date" value={formatDate(data.incorporated_date)} onChange={(v) => handleFieldChange('incorporated_date', v)} type="date" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <SectionHeader icon={Shield} title="Organization Classification" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SelectField label="Ownership Type" value={data.ownership_code || ''} onChange={(v) => handleFieldChange('ownership_code', v)} options={ownershipCodes} placeholder="Select Ownership Type" isRequired error={validationErrors.ownership_code} />
                  <SelectField label="Sector" value={data.sector_code || ''} onChange={(v) => handleFieldChange('sector_code', v)} options={sectorCodes} placeholder="Select Sector" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <SectionHeader icon={Building2} title="Organization Details" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <EditField label="Parent Registration Number" value={data.parent_reg_no} onChange={(v) => handleFieldChange('parent_reg_no', v)} maxLength={6} />
                  <SelectField label="Office" value={data.office_code || ''} onChange={(v) => handleFieldChange('office_code', v)} options={officeCodes} placeholder="Select Office" />
                  <SelectField label="Industry" value={data.industrial_code || data.industry_code || ''} onChange={(v) => handleFieldChange('industrial_code', v)} options={industrialCodes} placeholder="Select Industry" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Basic Details */}
        <TabsContent value="basic-details">
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <SectionHeader icon={Building2} title="Business Identity" subtitle="Core employer information" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <EditField label="Employer Name" value={data.employer_name} onChange={(v) => handleFieldChange('employer_name', v)} maxLength={40} isRequired error={validationErrors.employer_name} />
                  <EditField label="Trade Name" value={data.trade_name} onChange={(v) => handleFieldChange('trade_name', v)} maxLength={40} />
                  <EditField label="E-Mail Address" value={data.business_email || data.email} onChange={(v) => handleFieldChange('business_email', v)} type="email" maxLength={40} />
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardContent className="p-6">
                  <SectionHeader icon={MapPin} title="HQ Address" subtitle="Headquarters / Physical address" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <EditField label="HQ Address 1" value={data.hq_address1} onChange={(v) => handleFieldChange('hq_address1', v)} maxLength={25} />
                    <EditField label="HQ Address 2" value={data.hq_address2} onChange={(v) => handleFieldChange('hq_address2', v)} maxLength={25} />
                    <EditField label="City" value={data.hq_city} onChange={(v) => handleFieldChange('hq_city', v)} maxLength={50} />
                    <EditField label="State" value={data.hq_state} onChange={(v) => handleFieldChange('hq_state', v)} maxLength={50} />
                    <SelectField
                      label="Country"
                      value={data.hq_country || ''}
                      onChange={(v) => handleFieldChange('hq_country', v)}
                      options={countryOptions}
                      placeholder="Select Country"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <SectionHeader icon={Mail} title="Mailing Address" subtitle="Postal / Mailing address" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <EditField label="Mailing Address 1" value={data.mailing_address1} onChange={(v) => handleFieldChange('mailing_address1', v)} maxLength={25} />
                    <EditField label="Mailing Address 2" value={data.mailing_address2} onChange={(v) => handleFieldChange('mailing_address2', v)} maxLength={25} />
                    <EditField label="City" value={data.mailing_city} onChange={(v) => handleFieldChange('mailing_city', v)} maxLength={50} />
                    <EditField label="State" value={data.mailing_state} onChange={(v) => handleFieldChange('mailing_state', v)} maxLength={50} />
                    <SelectField
                      label="Country"
                      value={data.mailing_country || ''}
                      onChange={(v) => handleFieldChange('mailing_country', v)}
                      options={countryOptions}
                      placeholder="Select Country"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="p-6">
                <SectionHeader icon={Calendar} title="Dates & Employees" subtitle="Important dates and workforce information" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <EditField label="Date of Application" value={formatDate(data.application_date)} onChange={(v) => handleFieldChange('application_date', v)} type="date" />
                  <EditField label="Date Wages First Paid" value={formatDate(data.wages_first_paid_date)} onChange={(v) => handleFieldChange('wages_first_paid_date', v)} type="date" />
                  <div /> {/* spacer */}
                  <EditField label="Male Employees" value={data.male_count} onChange={(v) => handleFieldChange('male_count', v)} type="number" />
                  <EditField label="Female Employees" value={data.female_count} onChange={(v) => handleFieldChange('female_count', v)} type="number" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 3: Contact & Reach */}
        <TabsContent value="contact-reach">
          <div className="space-y-6">
            {/* Show contact_method composite error at top */}
            {validationErrors.contact_method && (
              <div className="rounded-md border border-destructive bg-destructive/5 p-3">
                <p className="text-sm text-destructive font-medium">{validationErrors.contact_method}</p>
              </div>
            )}
            <Card>
              <CardContent className="p-6">
                <SectionHeader icon={Phone} title="Contact Information" subtitle="Business telephone and fax" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EditField label="Contact Telephone" value={data.contact_telephone} onChange={(v) => handleFieldChange('contact_telephone', v)} maxLength={10} isRequired error={validationErrors.contact_telephone} />
                  <EditField label="Contact Fax" value={data.contact_fax} onChange={(v) => handleFieldChange('contact_fax', v)} maxLength={10} />
                  <EditField label="Contact Name" value={data.contact_name} onChange={(v) => handleFieldChange('contact_name', v)} maxLength={40} />
                  <EditField label="Mobile" value={data.mobile} onChange={(v) => handleFieldChange('mobile', v)} maxLength={10} isRequired />
                  <EditField label="Email" value={data.email} onChange={(v) => handleFieldChange('email', v)} type="email" maxLength={40} isRequired />
                  <EditField label="Country" value={data.country} onChange={(v) => handleFieldChange('country', v)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <SectionHeader icon={MapPin} title="Location Information" subtitle="Business location and activity" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <SelectField label="Village" value={data.village_code || ''} onChange={(v) => handleFieldChange('village_code', v)} options={villageCodes} placeholder="Select Village" isRequired error={validationErrors.village_code} />
                  <SelectField label="Activity Type" value={data.activity_type || ''} onChange={(v) => handleFieldChange('activity_type', v)} options={activityTypes} placeholder="Select Activity Type" isRequired error={validationErrors.activity_type} />
                  <SelectField label="Inspector" value={data.inspector_code || ''} onChange={(v) => handleFieldChange('inspector_code', v)} options={inspectorCodes} placeholder="Select Inspector" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 4: Tech & Finance */}
        <TabsContent value="tech-finance">
          <Card>
            <CardContent className="p-6">
              <SectionHeader icon={Monitor} title="Computer Payroll Information" subtitle="Technology and payroll processing details" />
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Computer Payroll</Label>
                  <div className="flex items-center gap-2 h-9">
                    <Switch
                      checked={data.computer_payroll === true || data.computer_payroll === 'Y' || data.computer_payroll === 'Yes'}
                      onCheckedChange={(checked) => handleFieldChange('computer_payroll', checked)}
                    />
                    <Badge variant={data.computer_payroll ? 'default' : 'secondary'}>
                      {data.computer_payroll ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </div>
                {(data.computer_payroll === true || data.computer_payroll === 'Y' || data.computer_payroll === 'Yes') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <EditField label="Application/Software" value={data.make_model} onChange={(v) => handleFieldChange('make_model', v)} maxLength={30} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Owners */}
        <TabsContent value="owners">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <UserCircle className="h-5 w-5" />
                    Owners / Partners / Directors
                  </CardTitle>
                  <CardDescription>Business ownership information ({owners.length} records)</CardDescription>
                </div>
                <Button size="sm" onClick={openAddOwner} className="gap-1">
                  <Plus className="h-3.5 w-3.5" />
                  Add Owner
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {owners.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Name</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>SSN</TableHead>
                      <TableHead className="text-right w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {owners.map((owner, idx) => (
                      <TableRow key={owner.id || idx}>
                        <TableCell className="font-medium">{owner.name || '—'}</TableCell>
                        <TableCell>{owner.title || '—'}</TableCell>
                        <TableCell>{formatPhone(owner.phone, owner.phone_dial_code) || '—'}</TableCell>
                        <TableCell>{owner.email || '—'}</TableCell>
                        <TableCell>{owner.ssn || '—'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditOwner(idx)} title="Edit">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setOwnerDeleteIndex(idx)} title="Delete" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <UserCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No owners / partners / directors listed</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 6: Locations */}
        <TabsContent value="locations">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Globe className="h-5 w-5" />
                    Places of Business
                  </CardTitle>
                  <CardDescription>All business locations ({locations.length} records)</CardDescription>
                </div>
                <Button size="sm" onClick={openAddLocation} className="gap-1">
                  <Plus className="h-3.5 w-3.5" />
                  Add Location
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {locations.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Trade Name</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Activity Type</TableHead>
                      <TableHead className="text-right w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locations.map((loc, idx) => (
                      <TableRow key={loc.id || idx}>
                        <TableCell className="font-medium">{loc.trade_name || '—'}</TableCell>
                        <TableCell>{[loc.address1, loc.address2].filter(Boolean).join(', ') || '—'}</TableCell>
                        <TableCell>{loc.city || '—'}</TableCell>
                        <TableCell>{loc.state || '—'}</TableCell>
                        <TableCell>{loc.country ? (countries.find(c => c.code?.trim() === loc.country?.trim())?.description?.trim() || loc.country) : '—'}</TableCell>
                        <TableCell>{loc.activity_type || '—'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditLocation(idx)} title="Edit">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setLocDeleteIndex(idx)} title="Delete" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No additional locations listed</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 7: Documents — upload-capable when meetingId is available */}
        <TabsContent value="documents">
          {meetingId && applicationReference ? (
            <EmployerMeetingDocumentsTabComponent
              documents={documents}
              meetingId={meetingId}
              applicationReference={applicationReference}
            />
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-5 w-5" />
                  Uploaded Documents
                </CardTitle>
                <CardDescription>Supporting documents ({documents.length} files)</CardDescription>
              </CardHeader>
              <CardContent>
                {documents.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">#</TableHead>
                        <TableHead>Document Type</TableHead>
                        <TableHead>File Name</TableHead>
                        <TableHead>Upload Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map((doc, idx) => (
                        <TableRow key={doc.id || idx}>
                          <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="font-medium">{doc.document_type || doc.type || '—'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="truncate max-w-[300px]">{doc.file_name || doc.name || 'Document'}</span>
                            </div>
                          </TableCell>
                          <TableCell>{doc.uploaded_at ? format(new Date(doc.uploaded_at), 'dd/MM/yyyy') : '—'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleDocAction(doc, 'view')} title="View">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDocAction(doc, 'download')} title="Download">
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No documents uploaded</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 8: Notes (read-only) */}
        <TabsContent value="notes">
          <Card>
            <CardContent className="p-6">
              <SectionHeader icon={StickyNote} title="Notes" subtitle="Additional notes about the registration" />
              {remarks.length > 0 ? (
                <div className="space-y-3">
                  {remarks.map((remark, idx) => (
                    <div key={remark.id || idx} className="rounded-lg bg-muted/50 border p-4 space-y-1">
                      <p className="text-sm whitespace-pre-wrap">{remark.note}</p>
                      <p className="text-xs text-muted-foreground">
                        {remark.note_date ? new Date(remark.note_date).toLocaleDateString() : ''}
                        {remark.created_by ? ` · By: ${remark.created_by}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <StickyNote className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No notes added</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Owner Dialog ───────────────────────────────────────────────────── */}
      <Dialog open={ownerDialogOpen} onOpenChange={setOwnerDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{ownerEditIndex !== null ? 'Edit Owner' : 'Add Owner'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <EditField label="Name *" value={ownerForm.name} onChange={(v) => handleOwnerFieldChange('name', v)} maxLength={ER_FIELD_LIMITS.owner_name} error={ownerErrors.name} />
            <EditField label="Title" value={ownerForm.title} onChange={(v) => handleOwnerFieldChange('title', v)} maxLength={ER_FIELD_LIMITS.owner_title} error={ownerErrors.title} />
            <EditField label="Phone" value={ownerForm.phone} onChange={(v) => handleOwnerFieldChange('phone', v)} maxLength={ER_FIELD_LIMITS.owner_phone} error={ownerErrors.phone} />
            <EditField label="Mobile" value={ownerForm.mobile} onChange={(v) => handleOwnerFieldChange('mobile', v)} maxLength={ER_FIELD_LIMITS.owner_mobile} error={ownerErrors.mobile} />
            <EditField label="Email" value={ownerForm.email} onChange={(v) => handleOwnerFieldChange('email', v)} type="email" maxLength={ER_FIELD_LIMITS.owner_email} error={ownerErrors.email} />
            <EditField label="SSN *" value={ownerForm.ssn} onChange={(v) => handleOwnerFieldChange('ssn', v)} maxLength={ER_FIELD_LIMITS.owner_ssn} error={ownerErrors.ssn} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOwnerDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveOwner}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Owner Delete Confirmation */}
      <Dialog open={ownerDeleteIndex !== null} onOpenChange={() => setOwnerDeleteIndex(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Owner</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to remove this owner?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOwnerDeleteIndex(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeleteOwner}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Location Dialog ────────────────────────────────────────────────── */}
      <Dialog open={locDialogOpen} onOpenChange={setLocDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{locEditIndex !== null ? 'Edit Location' : 'Add Location'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <EditField label="Trade Name *" value={locForm.trade_name} onChange={(v) => handleLocFieldChange('trade_name', v)} maxLength={ER_FIELD_LIMITS.loc_trade_name} className="col-span-2" error={locErrors.trade_name} />
            <EditField label="Address Line 1" value={locForm.address1} onChange={(v) => handleLocFieldChange('address1', v)} maxLength={ER_FIELD_LIMITS.loc_addr1} error={locErrors.address1} />
            <EditField label="Address Line 2" value={locForm.address2} onChange={(v) => handleLocFieldChange('address2', v)} maxLength={ER_FIELD_LIMITS.loc_addr2} error={locErrors.address2} />
            <EditField label="City" value={locForm.city} onChange={(v) => handleLocFieldChange('city', v)} maxLength={50} />
            <EditField label="State" value={locForm.state} onChange={(v) => handleLocFieldChange('state', v)} maxLength={50} />
            <SelectField
              label="Country"
              value={locForm.country || ''}
              onChange={(v) => handleLocFieldChange('country', v)}
              options={countryOptions}
              placeholder="Select Country"
            />
            <EditField label="Activity Type" value={locForm.activity_type} onChange={(v) => handleLocFieldChange('activity_type', v)} maxLength={ER_FIELD_LIMITS.loc_activity_type} className="col-span-2" error={locErrors.activity_type} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLocDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveLocation}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Location Delete Confirmation */}
      <Dialog open={locDeleteIndex !== null} onOpenChange={() => setLocDeleteIndex(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Location</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to remove this location?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLocDeleteIndex(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeleteLocation}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});
