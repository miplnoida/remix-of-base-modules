import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Edit, StopCircle, Eye, Briefcase } from 'lucide-react';
import { format } from 'date-fns';
import { SelfEmployActivity } from '@/services/selfEmployedService';
import { useSelfEmployed } from '@/hooks/useSelfEmployed';

interface SelfEmployDetailsTabProps {
  ssn: string;
  selfEmployed: ReturnType<typeof useSelfEmployed>;
  isRegistrationMode?: boolean;
  onRegistrationComplete?: () => void;
}

const statusLabels: Record<string, string> = {
  P: 'Pending',
  V: 'Verified',
  A: 'Active',
  S: 'Suspended',
  C: 'Ceased',
};

const statusColors: Record<string, string> = {
  P: 'secondary',
  V: 'default',
  A: 'default',
  S: 'destructive',
  C: 'outline',
};

const sectorLabels: Record<string, string> = {
  P: 'Private',
  G: 'Government',
  O: 'Other',
};

const officeLabels: Record<string, string> = {
  STK: 'St. Kitts',
  NEV: 'Nevis',
};

export const SelfEmployDetailsTab: React.FC<SelfEmployDetailsTabProps> = ({ ssn, selfEmployed, isRegistrationMode, onRegistrationComplete }) => {
  const {
    eligibility,
    activities,
    selectedActivity,
    setSelectedActivity,
    loading,
    registerSelfEmployed,
    addActivity,
    updateActivity,
    ceaseActivity,
  } = selfEmployed;

  const [showRegisterDialog, setShowRegisterDialog] = useState(isRegistrationMode || false);
  const [showAddActivityDialog, setShowAddActivityDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCeaseDialog, setShowCeaseDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // Registration form state
  const [regForm, setRegForm] = useState({
    activity_type: '',
    date_commenced: '',
    occupation_code: '',
    office_code: 'STK',
    sector_code: 'O',
  });

  // Cease form
  const [ceaseDate, setCeaseDate] = useState('');

  // Edit form
  const [editForm, setEditForm] = useState<Partial<SelfEmployActivity>>({});

  const isEditable = selectedActivity && ['P', 'V', 'A'].includes(selectedActivity.status || '');
  const selfRefNo = activities.length > 0 ? activities[0].self_ref_no : null;

  const handleRegister = async () => {
    if (!regForm.activity_type || !regForm.date_commenced) {
      return;
    }
    const sref = await registerSelfEmployed(regForm);
    if (sref) {
      setShowRegisterDialog(false);
      setRegForm({ activity_type: '', date_commenced: '', occupation_code: '', office_code: 'STK', sector_code: 'O' });
      onRegistrationComplete?.();
    }
  };

  const handleAddActivity = async () => {
    if (!selfRefNo || !regForm.activity_type || !regForm.date_commenced) return;
    await addActivity({ self_ref_no: selfRefNo, ...regForm });
    setShowAddActivityDialog(false);
    setRegForm({ activity_type: '', date_commenced: '', occupation_code: '', office_code: 'STK', sector_code: 'O' });
  };

  const handleCease = async () => {
    if (!selectedActivity || !ceaseDate) return;
    await ceaseActivity(selectedActivity.self_ref_no, selectedActivity.activity_seq_no, ceaseDate);
    setShowCeaseDialog(false);
    setCeaseDate('');
  };

  const handleSaveEdit = async () => {
    if (!selectedActivity) return;
    await updateActivity(selectedActivity.self_ref_no, selectedActivity.activity_seq_no, editForm);
    setShowEditDialog(false);
  };

  const openEditDialog = () => {
    if (!selectedActivity) return;
    setEditForm({
      activity_type: selectedActivity.activity_type || '',
      occupation_code: selectedActivity.occupation_code || '',
      office_code: selectedActivity.office_code || 'STK',
      sector_code: selectedActivity.sector_code || 'O',
      phone: selectedActivity.phone || '',
      fax: selectedActivity.fax || '',
      self_maddr1: selectedActivity.self_maddr1 || '',
      self_maddr2: selectedActivity.self_maddr2 || '',
      self_paddr1: selectedActivity.self_paddr1 || '',
      self_paddr2: selectedActivity.self_paddr2 || '',
      persons_employed: selectedActivity.persons_employed,
      industrial_code: selectedActivity.industrial_code || '',
      village_code: selectedActivity.village_code || '',
    });
    setShowEditDialog(true);
  };

  // No SEP registration yet
  if (!eligibility?.sep_exists && activities.length === 0) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-8 text-center">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Self-Employment Registration</h3>
            <p className="text-muted-foreground mb-4">
              This insured person has not been registered as self-employed.
            </p>
            {eligibility?.eligible ? (
              <Button onClick={() => setShowRegisterDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Register as Self-Employed
              </Button>
            ) : (
              <p className="text-sm text-destructive">{eligibility?.reason}</p>
            )}
          </CardContent>
        </Card>

        {/* Register Dialog */}
        <RegisterActivityDialog
          open={showRegisterDialog}
          onOpenChange={setShowRegisterDialog}
          title="Register as Self-Employed"
          form={regForm}
          setForm={setRegForm}
          onSubmit={handleRegister}
          loading={loading}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with SREF */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-sm text-muted-foreground">Self Ref No:</span>
            <span className="ml-2 font-mono font-bold text-lg">{selfRefNo}</span>
          </div>
          {selectedActivity && (
            <Badge variant={statusColors[selectedActivity.status || 'P'] as any}>
              {statusLabels[selectedActivity.status || 'P']}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          {isEditable && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowAddActivityDialog(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Activity
              </Button>
              <Button variant="outline" size="sm" onClick={openEditDialog}>
                <Edit className="h-4 w-4 mr-1" /> Edit
              </Button>
              {!selectedActivity?.date_ceased && (
                <Button variant="outline" size="sm" onClick={() => setShowCeaseDialog(true)}>
                  <StopCircle className="h-4 w-4 mr-1" /> Cease Activity
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Activity Grid */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Business Activities</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Seq</TableHead>
                <TableHead>Activity Type</TableHead>
                <TableHead>Date Commenced</TableHead>
                <TableHead>Date Ceased</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Office</TableHead>
                <TableHead>Sector</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.map((act) => (
                <TableRow
                  key={`${act.ssn}-${act.self_ref_no}-${act.activity_seq_no}`}
                  className={`cursor-pointer ${selectedActivity?.activity_seq_no === act.activity_seq_no ? 'bg-muted' : ''}`}
                  onClick={() => setSelectedActivity(act)}
                >
                  <TableCell className="font-mono">{act.activity_seq_no}</TableCell>
                  <TableCell>{act.activity_type || '-'}</TableCell>
                  <TableCell>{act.date_commenced ? format(new Date(act.date_commenced), 'dd/MM/yyyy') : '-'}</TableCell>
                  <TableCell>{act.date_ceased ? format(new Date(act.date_ceased), 'dd/MM/yyyy') : '-'}</TableCell>
                  <TableCell>
                    <Badge variant={statusColors[act.status || 'P'] as any} className="text-xs">
                      {statusLabels[act.status || 'P']}
                    </Badge>
                  </TableCell>
                  <TableCell>{officeLabels[act.office_code || ''] || act.office_code}</TableCell>
                  <TableCell>{sectorLabels[act.sector_code || ''] || act.sector_code}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedActivity(act); setShowDetailDialog(true); }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {activities.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No activities found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Selected Activity Detail */}
      {selectedActivity && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Activity Details — Seq {selectedActivity.activity_seq_no}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Mailing Address</span>
                <p className="font-medium">{selectedActivity.self_maddr1 || '-'}</p>
                {selectedActivity.self_maddr2 && <p className="font-medium">{selectedActivity.self_maddr2}</p>}
              </div>
              <div>
                <span className="text-muted-foreground">Physical Address</span>
                <p className="font-medium">{selectedActivity.self_paddr1 || '-'}</p>
                {selectedActivity.self_paddr2 && <p className="font-medium">{selectedActivity.self_paddr2}</p>}
              </div>
              <div>
                <span className="text-muted-foreground">Phone</span>
                <p className="font-medium">{selectedActivity.phone || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Fax</span>
                <p className="font-medium">{selectedActivity.fax || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Occupation Code</span>
                <p className="font-medium">{selectedActivity.occupation_code || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Industrial Code</span>
                <p className="font-medium">{selectedActivity.industrial_code || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Persons Employed</span>
                <p className="font-medium">{selectedActivity.persons_employed ?? '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Entered By</span>
                <p className="font-medium">{selectedActivity.entered_by || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <RegisterActivityDialog
        open={showAddActivityDialog}
        onOpenChange={setShowAddActivityDialog}
        title="Add New Activity"
        form={regForm}
        setForm={setRegForm}
        onSubmit={handleAddActivity}
        loading={loading}
      />

      {/* Cease Dialog */}
      <Dialog open={showCeaseDialog} onOpenChange={setShowCeaseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cease Activity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Cessation Date *</Label>
              <Input type="date" value={ceaseDate} onChange={(e) => setCeaseDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCeaseDialog(false)}>Cancel</Button>
            <Button onClick={handleCease} disabled={!ceaseDate || loading}>Cease Activity</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Activity Details</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Activity Type</Label>
              <Input value={editForm.activity_type || ''} onChange={(e) => setEditForm({ ...editForm, activity_type: e.target.value })} />
            </div>
            <div>
              <Label>Occupation Code</Label>
              <Input value={editForm.occupation_code || ''} onChange={(e) => setEditForm({ ...editForm, occupation_code: e.target.value })} maxLength={4} />
            </div>
            <div>
              <Label>Office</Label>
              <Select value={editForm.office_code || 'STK'} onValueChange={(v) => setEditForm({ ...editForm, office_code: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="STK">St. Kitts</SelectItem>
                  <SelectItem value="NEV">Nevis</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sector</Label>
              <Select value={editForm.sector_code || 'O'} onValueChange={(v) => setEditForm({ ...editForm, sector_code: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="P">Private</SelectItem>
                  <SelectItem value="G">Government</SelectItem>
                  <SelectItem value="O">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={editForm.phone || ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} maxLength={10} />
            </div>
            <div>
              <Label>Fax</Label>
              <Input value={editForm.fax || ''} onChange={(e) => setEditForm({ ...editForm, fax: e.target.value })} maxLength={10} />
            </div>
            <div>
              <Label>Industrial Code</Label>
              <Input value={editForm.industrial_code || ''} onChange={(e) => setEditForm({ ...editForm, industrial_code: e.target.value })} maxLength={4} />
            </div>
            <div>
              <Label>Village Code</Label>
              <Input value={editForm.village_code || ''} onChange={(e) => setEditForm({ ...editForm, village_code: e.target.value })} maxLength={3} />
            </div>
            <div className="col-span-2">
              <Label>Mailing Address Line 1</Label>
              <Input value={editForm.self_maddr1 || ''} onChange={(e) => setEditForm({ ...editForm, self_maddr1: e.target.value })} maxLength={60} />
            </div>
            <div className="col-span-2">
              <Label>Mailing Address Line 2</Label>
              <Input value={editForm.self_maddr2 || ''} onChange={(e) => setEditForm({ ...editForm, self_maddr2: e.target.value })} maxLength={60} />
            </div>
            <div className="col-span-2">
              <Label>Physical Address Line 1</Label>
              <Input value={editForm.self_paddr1 || ''} onChange={(e) => setEditForm({ ...editForm, self_paddr1: e.target.value })} maxLength={60} />
            </div>
            <div className="col-span-2">
              <Label>Physical Address Line 2</Label>
              <Input value={editForm.self_paddr2 || ''} onChange={(e) => setEditForm({ ...editForm, self_paddr2: e.target.value })} maxLength={60} />
            </div>
            <div>
              <Label>Persons Employed</Label>
              <Input type="number" value={editForm.persons_employed ?? ''} onChange={(e) => setEditForm({ ...editForm, persons_employed: e.target.value ? Number(e.target.value) : null })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={loading}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail View Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Activity Detail — Seq {selectedActivity?.activity_seq_no}</DialogTitle>
          </DialogHeader>
          {selectedActivity && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              {Object.entries({
                'SSN': selectedActivity.ssn,
                'Self Ref No': selectedActivity.self_ref_no,
                'Activity Seq': selectedActivity.activity_seq_no,
                'Activity Type': selectedActivity.activity_type,
                'Status': statusLabels[selectedActivity.status || 'P'],
                'Date Commenced': selectedActivity.date_commenced ? format(new Date(selectedActivity.date_commenced), 'dd/MM/yyyy') : '-',
                'Date Ceased': selectedActivity.date_ceased ? format(new Date(selectedActivity.date_ceased), 'dd/MM/yyyy') : '-',
                'Office': officeLabels[selectedActivity.office_code || ''] || selectedActivity.office_code,
                'Sector': sectorLabels[selectedActivity.sector_code || ''] || selectedActivity.sector_code,
                'Occupation Code': selectedActivity.occupation_code || '-',
                'Industrial Code': selectedActivity.industrial_code || '-',
                'Phone': selectedActivity.phone || '-',
                'Fax': selectedActivity.fax || '-',
                'Persons Employed': selectedActivity.persons_employed?.toString() || '-',
                'Entered By': selectedActivity.entered_by || '-',
                'Date of Entry': selectedActivity.date_of_entry ? format(new Date(selectedActivity.date_of_entry), 'dd/MM/yyyy') : '-',
              }).map(([label, value]) => (
                <div key={label}>
                  <span className="text-muted-foreground">{label}</span>
                  <p className="font-medium">{value || '-'}</p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Reusable dialog for register/add activity
function RegisterActivityDialog({
  open,
  onOpenChange,
  title,
  form,
  setForm,
  onSubmit,
  loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  form: { activity_type: string; date_commenced: string; occupation_code: string; office_code: string; sector_code: string };
  setForm: React.Dispatch<React.SetStateAction<typeof form>>;
  onSubmit: () => void;
  loading: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Activity Type *</Label>
            <Input value={form.activity_type} onChange={(e) => setForm({ ...form, activity_type: e.target.value })} placeholder="e.g., Retail Shop, Carpentry" />
          </div>
          <div>
            <Label>Date Commenced *</Label>
            <Input type="date" value={form.date_commenced} onChange={(e) => setForm({ ...form, date_commenced: e.target.value })} />
          </div>
          <div>
            <Label>Occupation Code</Label>
            <Input value={form.occupation_code} onChange={(e) => setForm({ ...form, occupation_code: e.target.value })} maxLength={4} />
          </div>
          <div>
            <Label>Office</Label>
            <Select value={form.office_code} onValueChange={(v) => setForm({ ...form, office_code: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="STK">St. Kitts</SelectItem>
                <SelectItem value="NEV">Nevis</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Sector</Label>
            <Select value={form.sector_code} onValueChange={(v) => setForm({ ...form, sector_code: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="P">Private</SelectItem>
                <SelectItem value="G">Government</SelectItem>
                <SelectItem value="O">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={!form.activity_type || !form.date_commenced || loading}>
            {loading ? 'Processing...' : 'Submit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
