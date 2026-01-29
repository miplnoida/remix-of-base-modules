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
  const [locationForm, setLocationForm] = useState({ trade_name: '', loc_addr1: '', loc_addr2: '', activity_type: '' });

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
    if (!ownerForm.name.trim()) { toast.error('Owner name is required'); return; }
    await addOwner(ownerForm);
    setOwnerForm({ name: '', title: '', phone: '', mobile: '', email: '', ssn: '', location_id: 0 });
    setShowOwnerDialog(false);
  };

  const handleAddLocation = async () => {
    if (!locationForm.trade_name.trim()) { toast.error('Trade name is required'); return; }
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/employer-registration')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isNewMode ? 'Register New Employer' : isViewMode ? 'View Employer' : 'Edit Employer'}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              {formData.regno && <span className="text-muted-foreground">Reg. No: {formData.regno}</span>}
              {getStatusBadge()}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {/* Submit button for Draft status */}
          {showSubmitButton && (
            <Button onClick={() => setShowSubmitConfirm(true)} disabled={isSaving || isSubmitting}>
              <Send className="h-4 w-4 mr-2" />
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="details"><Building2 className="h-4 w-4 mr-2" />Form Detail</TabsTrigger>
          <TabsTrigger value="owners"><Users className="h-4 w-4 mr-2" />Owners</TabsTrigger>
          <TabsTrigger value="locations"><MapPin className="h-4 w-4 mr-2" />Locations</TabsTrigger>
          <TabsTrigger value="notes"><FileText className="h-4 w-4 mr-2" />Notes</TabsTrigger>
          <TabsTrigger value="commence"><Calendar className="h-4 w-4 mr-2" />Commence Date</TabsTrigger>
          <TabsTrigger value="visits"><ClipboardList className="h-4 w-4 mr-2" />Visits</TabsTrigger>
          <TabsTrigger value="suits"><Scale className="h-4 w-4 mr-2" />Suits</TabsTrigger>
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
                        <TableCell>{c.date_commenced ? new Date(c.date_commenced).toLocaleDateString() : '-'}</TableCell>
                        <TableCell>{c.date_ceased ? new Date(c.date_ceased).toLocaleDateString() : '-'}</TableCell>
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

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Submit for Verification?</AlertDialogTitle><AlertDialogDescription>Once submitted, the employer will be reviewed by a compliance officer.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleSubmit}>Submit</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Owner Dialog */}
      <Dialog open={showOwnerDialog} onOpenChange={setShowOwnerDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Owner</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div><Label>Name *</Label><Input value={ownerForm.name} onChange={e => setOwnerForm({ ...ownerForm, name: e.target.value })} /></div>
            <div><Label>Title</Label><Input value={ownerForm.title} onChange={e => setOwnerForm({ ...ownerForm, title: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={ownerForm.phone} onChange={e => setOwnerForm({ ...ownerForm, phone: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={ownerForm.email} onChange={e => setOwnerForm({ ...ownerForm, email: e.target.value })} /></div>
            <div><Label>SSN</Label><Input value={ownerForm.ssn} onChange={e => setOwnerForm({ ...ownerForm, ssn: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowOwnerDialog(false)}>Cancel</Button><Button onClick={handleAddOwner}>Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Location Dialog */}
      <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Location</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div><Label>Trade Name *</Label><Input value={locationForm.trade_name} onChange={e => setLocationForm({ ...locationForm, trade_name: e.target.value })} /></div>
            <div><Label>Address 1</Label><Input value={locationForm.loc_addr1} onChange={e => setLocationForm({ ...locationForm, loc_addr1: e.target.value })} /></div>
            <div><Label>Address 2</Label><Input value={locationForm.loc_addr2} onChange={e => setLocationForm({ ...locationForm, loc_addr2: e.target.value })} /></div>
            <div><Label>Activity Type</Label><Input value={locationForm.activity_type} onChange={e => setLocationForm({ ...locationForm, activity_type: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowLocationDialog(false)}>Cancel</Button><Button onClick={handleAddLocation}>Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
