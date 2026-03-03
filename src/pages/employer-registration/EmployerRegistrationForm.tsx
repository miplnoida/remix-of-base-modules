import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Send, Building2, Users, MapPin, FileText, Calendar, Scale, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployerRegistration } from '@/hooks/useEmployerRegistration';
import { useEmployerRegistrationSubmit } from '@/hooks/useEmployerRegistrationSubmit';
import { ERMasterFormData, ER_STATUS_CODES } from '@/types/employerRegistration';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Trash2, Plus } from 'lucide-react';
import FormDetailTab from './tabs/FormDetailTab';
import { WorkflowActionButtons } from '@/components/workflow/WorkflowActionButtons';
import { formatDisplayDate } from '@/lib/dateFormat';

export default function EmployerRegistrationForm() {
  const { regno } = useParams<{ regno: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const isViewMode = window.location.pathname.includes('/view/');
  const isNewMode = window.location.pathname.includes('/new');
  const action = searchParams.get('action');

  const {
    formData, setFormData, owners, locations, notes, commenceDates,
    isLoading, isSaving, isNewRecord, saveEmployer, submitForVerification,
    addOwner, deleteOwner, addLocation, deleteLocation, addNote, addCommenceDate
  } = useEmployerRegistration({ regno, mode: isNewMode ? 'create' : isViewMode ? 'view' : 'edit' });

  const { submitERRegistration, isSubmitting } = useEmployerRegistrationSubmit();

  const [activeTab, setActiveTab] = useState('details');
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [showOwnerDialog, setShowOwnerDialog] = useState(false);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [ownerForm, setOwnerForm] = useState({ name: '', title: '', phone: '', mobile: '', email: '', ssn: '', location_id: 0 });
  const [ownerErrors, setOwnerErrors] = useState<Record<string, string>>({});
  const [locationForm, setLocationForm] = useState({ trade_name: '', loc_addr1: '', loc_addr2: '', activity_type: '' });
  const [locationErrors, setLocationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (action === 'submit') setShowSubmitConfirm(true);
    // Approve/Reject actions are now handled by WorkflowActionButtons
  }, [action]);

  const handleFieldChange = useCallback((field: keyof ERMasterFormData, value: any) => {
    if (isViewMode) return;
    setFormData(prev => ({ ...prev, [field]: value }));
  }, [isViewMode, setFormData]);

  const handleSave = useCallback(async (): Promise<string | null> => {
    if (!formData.name?.trim()) {
      toast.error('Employer name is required');
      return null;
    }
    const result = await saveEmployer(formData);
    if (result && isNewRecord) {
      navigate(`/employer-registration/edit/${result}`, { replace: true });
    }
    return result;
  }, [formData, saveEmployer, isNewRecord, navigate]);

  const handleSubmit = async () => {
    setShowSubmitConfirm(false);
    
    // Save first if new record
    if (!formData.regno) {
      const result = await saveEmployer(formData);
      if (!result) return;
      
      // Use the new registration number for submission
      const submitResult = await submitERRegistration(result, user?.id);
      if (submitResult.success) {
        toast.success(submitResult.message || 'Registration submitted successfully');
        navigate('/employer-registration');
      } else {
        toast.error(submitResult.message || 'Submission failed');
      }
      return;
    }
    
    // Submit existing record
    const submitResult = await submitERRegistration(formData.regno, user?.id);
    if (submitResult.success) {
      toast.success(submitResult.message || 'Registration submitted successfully');
      navigate('/employer-registration');
    } else {
      toast.error(submitResult.message || 'Submission failed');
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    await addNote(newNote, user?.id || '');
    setNewNote('');
  };

  const handleAddOwner = async () => {
    const errors: Record<string, string> = {};
    if (!ownerForm.name.trim()) errors.name = 'Owner name is required';
    if (ownerForm.name.length > 40) errors.name = 'Max 40 characters';
    if (ownerForm.title.length > 25) errors.title = 'Max 25 characters';
    if (ownerForm.phone && (ownerForm.phone.length > 10 || !/^\+?\d*$/.test(ownerForm.phone))) errors.phone = 'Max 10 digits';
    if (ownerForm.mobile && (ownerForm.mobile.length > 10 || !/^\+?\d*$/.test(ownerForm.mobile))) errors.mobile = 'Max 10 digits';
    if (ownerForm.email && (ownerForm.email.length > 30 || (ownerForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerForm.email)))) errors.email = 'Invalid email (max 30 chars)';
    if (ownerForm.ssn && (ownerForm.ssn.length > 6 || !/^\d*$/.test(ownerForm.ssn))) errors.ssn = 'Max 6 digits only';
    if (Object.keys(errors).length > 0) { setOwnerErrors(errors); return; }
    setOwnerErrors({});
    await addOwner(ownerForm);
    setOwnerForm({ name: '', title: '', phone: '', mobile: '', email: '', ssn: '', location_id: 0 });
    setShowOwnerDialog(false);
  };

  const handleAddLocation = async () => {
    const errors: Record<string, string> = {};
    if (!locationForm.trade_name.trim()) errors.trade_name = 'Trade name is required';
    if (locationForm.trade_name.length > 40) errors.trade_name = 'Max 40 characters';
    if (locationForm.loc_addr1.length > 25) errors.loc_addr1 = 'Max 25 characters';
    if (locationForm.loc_addr2.length > 25) errors.loc_addr2 = 'Max 25 characters';
    if (locationForm.activity_type.length > 50) errors.activity_type = 'Max 50 characters';
    if (Object.keys(errors).length > 0) { setLocationErrors(errors); return; }
    setLocationErrors({});
    await addLocation(locationForm);
    setLocationForm({ trade_name: '', loc_addr1: '', loc_addr2: '', activity_type: '' });
    setShowLocationDialog(false);
  };

  const handleWorkflowActionComplete = (action: string, endState: string | null) => {
    navigate('/employer-registration');
  };

  const getStatusBadge = () => {
    const config = ER_STATUS_CODES[formData.status as keyof typeof ER_STATUS_CODES];
    return config ? <Badge variant={config.variant}>{config.label}</Badge> : null;
  };

  if (isLoading) {
    return <div className="container mx-auto p-4"><p>Loading...</p></div>;
  }

  // Show Submit button only for Draft status
  const showSubmitButton = !isViewMode && formData.status === 'Z';

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header - Matching IP Registration styling */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => navigate('/employer-registration')}
            className="flex items-center gap-2 border-0 border-l-2 border-l-primary shadow-md"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          <div className="h-6 w-px bg-border" />
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
              {isNewMode ? 'Register New Employer' : isViewMode ? 'View Employer' : 'Edit Employer'}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              {formData.regno && <span className="text-sm text-muted-foreground">Reg. No: {formData.regno}</span>}
              {getStatusBadge()}
            </div>
          </div>
        </div>
        <div className="flex gap-2 self-start lg:self-center">
          {/* Submit button for Draft status */}
          {showSubmitButton && (
            <Button 
              onClick={() => setShowSubmitConfirm(true)} 
              disabled={isSaving || isSubmitting}
              className="flex items-center gap-2 border-r-4 border-r-primary"
            >
              <Send className="h-4 w-4" />
              Submit
            </Button>
          )}
          
          {/* Workflow-driven action buttons (Approve/Reject) */}
          <WorkflowActionButtons
            sourceModule="employers"
            sourceRecordId={formData.regno || null}
            variant="default"
            onActionComplete={handleWorkflowActionComplete}
          />
        </div>
      </div>

      {/* Card wrapper matching IP Registration */}
      <Card>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="details" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Form Detail</span>
              </TabsTrigger>
              <TabsTrigger value="owners" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Owners</span>
              </TabsTrigger>
              <TabsTrigger value="locations" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span className="hidden sm:inline">Locations</span>
              </TabsTrigger>
              <TabsTrigger value="notes" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Notes</span>
              </TabsTrigger>
              <TabsTrigger value="commence" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Commence</span>
              </TabsTrigger>
              <TabsTrigger value="visits" className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">Visits</span>
              </TabsTrigger>
              <TabsTrigger value="suits" className="flex items-center gap-2">
                <Scale className="h-4 w-4" />
                <span className="hidden sm:inline">Suits</span>
              </TabsTrigger>
            </TabsList>

        {/* Form Detail Tab with Sub-Steps */}
        <TabsContent value="details">
          <FormDetailTab
            formData={formData}
            onChange={handleFieldChange}
            onSave={handleSave}
            isViewMode={isViewMode}
            isSaving={isSaving}
          />
        </TabsContent>

        {/* Owners Tab */}
        <TabsContent value="owners">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Owners / Partners</CardTitle>
              {!isViewMode && <Button onClick={() => setShowOwnerDialog(true)}><Plus className="h-4 w-4 mr-2" />Add Owner</Button>}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Title</TableHead><TableHead>Phone</TableHead><TableHead>Email</TableHead><TableHead>SSN</TableHead>{!isViewMode && <TableHead></TableHead>}</TableRow></TableHeader>
                <TableBody>
                  {owners.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No owners added</TableCell></TableRow> :
                    owners.map((owner, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{owner.name}</TableCell><TableCell>{owner.title}</TableCell><TableCell>{owner.phone}</TableCell><TableCell>{owner.email}</TableCell><TableCell>{owner.ssn}</TableCell>
                        {!isViewMode && <TableCell><Button variant="ghost" size="icon" onClick={() => owner.owner_id && deleteOwner(owner.owner_id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>}
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Locations Tab */}
        <TabsContent value="locations">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Business Locations</CardTitle>
              {!isViewMode && <Button onClick={() => setShowLocationDialog(true)}><Plus className="h-4 w-4 mr-2" />Add Location</Button>}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Trade Name</TableHead><TableHead>Address 1</TableHead><TableHead>Address 2</TableHead><TableHead>Activity Type</TableHead>{!isViewMode && <TableHead></TableHead>}</TableRow></TableHeader>
                <TableBody>
                  {locations.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No locations added</TableCell></TableRow> :
                    locations.map((loc, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{loc.trade_name}</TableCell><TableCell>{loc.loc_addr1}</TableCell><TableCell>{loc.loc_addr2}</TableCell><TableCell>{loc.activity_type}</TableCell>
                        {!isViewMode && <TableCell><Button variant="ghost" size="icon" onClick={() => loc.location_id && deleteLocation(loc.location_id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>}
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes">
          <Card>
            <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {!isViewMode && (
                <div className="flex gap-2">
                  <Input placeholder="Enter note..." value={newNote} onChange={e => setNewNote(e.target.value)} maxLength={100} />
                  <Button onClick={handleAddNote} disabled={!newNote.trim()}>Add Note</Button>
                </div>
              )}
              <div className="space-y-2">
                {notes.length === 0 ? <p className="text-muted-foreground">No notes</p> :
                  notes.map((note, idx) => (
                    <div key={idx} className="p-3 bg-muted rounded-lg">
                      <p>{note.note}</p>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(note.note_date).toLocaleString()}</p>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Commence Date Tab */}
        <TabsContent value="commence">
          <Card>
            <CardHeader><CardTitle>Commence Dates</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Date Commenced</TableHead><TableHead>Date Ceased</TableHead><TableHead>Modified By</TableHead></TableRow></TableHeader>
                <TableBody>
                  {commenceDates.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No commence dates</TableCell></TableRow> :
                    commenceDates.map((c, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{c.date_commenced ? formatDisplayDate(c.date_commenced) : '-'}</TableCell>
                        <TableCell>{c.date_ceased ? formatDisplayDate(c.date_ceased) : '-'}</TableCell>
                        <TableCell>{c.modified_by || '-'}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Visits Tab */}
        <TabsContent value="visits">
          <Card>
            <CardHeader><CardTitle>Inspection Visits</CardTitle></CardHeader>
            <CardContent>
              <p className="text-muted-foreground">No visits recorded yet.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suits Tab */}
        <TabsContent value="suits">
          <Card>
            <CardHeader><CardTitle>Legal Suits</CardTitle></CardHeader>
            <CardContent>
              <p className="text-muted-foreground">No legal suits recorded.</p>
            </CardContent>
          </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Submit for Verification?</AlertDialogTitle><AlertDialogDescription>Once submitted, the employer will be reviewed by a compliance officer.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleSubmit}>Submit</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Owner Dialog */}
      <Dialog open={showOwnerDialog} onOpenChange={(open) => { setShowOwnerDialog(open); if (!open) setOwnerErrors({}); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Owner</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label className={ownerErrors.name ? 'text-destructive' : ''}>Name * <span className="text-xs text-muted-foreground">(max 40)</span></Label>
              <Input value={ownerForm.name} onChange={e => { setOwnerForm({ ...ownerForm, name: e.target.value }); setOwnerErrors(prev => ({ ...prev, name: '' })); }} maxLength={40} className={ownerErrors.name ? 'border-destructive' : ''} />
              {ownerErrors.name && <p className="text-xs text-destructive mt-1">{ownerErrors.name}</p>}
            </div>
            <div>
              <Label className={ownerErrors.title ? 'text-destructive' : ''}>Title <span className="text-xs text-muted-foreground">(max 25)</span></Label>
              <Input value={ownerForm.title} onChange={e => { setOwnerForm({ ...ownerForm, title: e.target.value }); setOwnerErrors(prev => ({ ...prev, title: '' })); }} maxLength={25} className={ownerErrors.title ? 'border-destructive' : ''} />
              {ownerErrors.title && <p className="text-xs text-destructive mt-1">{ownerErrors.title}</p>}
            </div>
            <div>
              <Label className={ownerErrors.phone ? 'text-destructive' : ''}>Phone <span className="text-xs text-muted-foreground">(max 10 digits)</span></Label>
              <Input value={ownerForm.phone} onChange={e => { const v = e.target.value.replace(/[^\d+]/g, ''); setOwnerForm({ ...ownerForm, phone: v }); setOwnerErrors(prev => ({ ...prev, phone: '' })); }} maxLength={10} className={ownerErrors.phone ? 'border-destructive' : ''} />
              {ownerErrors.phone && <p className="text-xs text-destructive mt-1">{ownerErrors.phone}</p>}
            </div>
            <div>
              <Label className={ownerErrors.mobile ? 'text-destructive' : ''}>Mobile <span className="text-xs text-muted-foreground">(max 10 digits)</span></Label>
              <Input value={ownerForm.mobile} onChange={e => { const v = e.target.value.replace(/[^\d+]/g, ''); setOwnerForm({ ...ownerForm, mobile: v }); setOwnerErrors(prev => ({ ...prev, mobile: '' })); }} maxLength={10} className={ownerErrors.mobile ? 'border-destructive' : ''} />
              {ownerErrors.mobile && <p className="text-xs text-destructive mt-1">{ownerErrors.mobile}</p>}
            </div>
            <div>
              <Label className={ownerErrors.email ? 'text-destructive' : ''}>Email <span className="text-xs text-muted-foreground">(max 30)</span></Label>
              <Input value={ownerForm.email} onChange={e => { setOwnerForm({ ...ownerForm, email: e.target.value }); setOwnerErrors(prev => ({ ...prev, email: '' })); }} maxLength={30} className={ownerErrors.email ? 'border-destructive' : ''} />
              {ownerErrors.email && <p className="text-xs text-destructive mt-1">{ownerErrors.email}</p>}
            </div>
            <div>
              <Label className={ownerErrors.ssn ? 'text-destructive' : ''}>SSN <span className="text-xs text-muted-foreground">(max 6 digits)</span></Label>
              <Input value={ownerForm.ssn} onChange={e => { const v = e.target.value.replace(/\D/g, ''); setOwnerForm({ ...ownerForm, ssn: v }); setOwnerErrors(prev => ({ ...prev, ssn: '' })); }} maxLength={6} className={ownerErrors.ssn ? 'border-destructive' : ''} />
              {ownerErrors.ssn && <p className="text-xs text-destructive mt-1">{ownerErrors.ssn}</p>}
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowOwnerDialog(false)}>Cancel</Button><Button onClick={handleAddOwner}>Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Location Dialog */}
      <Dialog open={showLocationDialog} onOpenChange={(open) => { setShowLocationDialog(open); if (!open) setLocationErrors({}); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Location</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label className={locationErrors.trade_name ? 'text-destructive' : ''}>Trade Name * <span className="text-xs text-muted-foreground">(max 40)</span></Label>
              <Input value={locationForm.trade_name} onChange={e => { setLocationForm({ ...locationForm, trade_name: e.target.value }); setLocationErrors(prev => ({ ...prev, trade_name: '' })); }} maxLength={40} className={locationErrors.trade_name ? 'border-destructive' : ''} />
              {locationErrors.trade_name && <p className="text-xs text-destructive mt-1">{locationErrors.trade_name}</p>}
            </div>
            <div>
              <Label className={locationErrors.loc_addr1 ? 'text-destructive' : ''}>Address 1 <span className="text-xs text-muted-foreground">(max 25)</span></Label>
              <Input value={locationForm.loc_addr1} onChange={e => { setLocationForm({ ...locationForm, loc_addr1: e.target.value }); setLocationErrors(prev => ({ ...prev, loc_addr1: '' })); }} maxLength={25} className={locationErrors.loc_addr1 ? 'border-destructive' : ''} />
              {locationErrors.loc_addr1 && <p className="text-xs text-destructive mt-1">{locationErrors.loc_addr1}</p>}
            </div>
            <div>
              <Label className={locationErrors.loc_addr2 ? 'text-destructive' : ''}>Address 2 <span className="text-xs text-muted-foreground">(max 25)</span></Label>
              <Input value={locationForm.loc_addr2} onChange={e => { setLocationForm({ ...locationForm, loc_addr2: e.target.value }); setLocationErrors(prev => ({ ...prev, loc_addr2: '' })); }} maxLength={25} className={locationErrors.loc_addr2 ? 'border-destructive' : ''} />
              {locationErrors.loc_addr2 && <p className="text-xs text-destructive mt-1">{locationErrors.loc_addr2}</p>}
            </div>
            <div>
              <Label className={locationErrors.activity_type ? 'text-destructive' : ''}>Activity Type <span className="text-xs text-muted-foreground">(max 50)</span></Label>
              <Input value={locationForm.activity_type} onChange={e => { setLocationForm({ ...locationForm, activity_type: e.target.value }); setLocationErrors(prev => ({ ...prev, activity_type: '' })); }} maxLength={50} className={locationErrors.activity_type ? 'border-destructive' : ''} />
              {locationErrors.activity_type && <p className="text-xs text-destructive mt-1">{locationErrors.activity_type}</p>}
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowLocationDialog(false)}>Cancel</Button><Button onClick={handleAddLocation}>Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
