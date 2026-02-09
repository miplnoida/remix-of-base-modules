import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Save, X, Briefcase, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { SelfEmployActivity } from '@/services/selfEmployedService';
import { useSelfEmployed } from '@/hooks/useSelfEmployed';
import { useSEPLookups } from '@/hooks/useSEPLookups';
import { toast } from 'sonner';

interface SelfEmployDetailsTabProps {
  ssn: string;
  selfEmployed: ReturnType<typeof useSelfEmployed>;
  isRegistrationMode?: boolean;
  onRegistrationComplete?: () => void;
  onRegistrationCancel?: () => void;
}

const statusLabels: Record<string, string> = {
  P: 'Pending', V: 'Verified', A: 'Active', S: 'Suspended', C: 'Ceased',
};
const statusColors: Record<string, string> = {
  P: 'secondary', V: 'default', A: 'default', S: 'destructive', C: 'outline',
};

// Phone format helper: (869)-123-4567
const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)})-${digits.slice(3)}`;
  return `(${digits.slice(0, 3)})-${digits.slice(3, 6)}-${digits.slice(6)}`;
};
const stripPhone = (formatted: string): string => formatted.replace(/\D/g, '');

interface ActivityFormState {
  activity_type: string;
  date_commenced: string;
  date_ceased: string;
  phone: string;
  fax: string;
  arrears: string;
  legal_action: string;
  self_maddr1: string;
  self_maddr2: string;
  self_paddr1: string;
  self_paddr2: string;
  occupation_code: string;
  industrial_code: string;
  office_code: string;
  village_code: string;
  sector_code: string;
  inspector_code: string;
  persons_employed: string;
  date_of_application: string;
  date_of_entry: string;
  date_of_issue: string;
  date_educated: string;
  self_guide: string;
  self_edu: string;
}

const emptyForm: ActivityFormState = {
  activity_type: '', date_commenced: '', date_ceased: '', phone: '', fax: '',
  arrears: 'N', legal_action: 'N',
  self_maddr1: '', self_maddr2: '', self_paddr1: '', self_paddr2: '',
  occupation_code: '', industrial_code: '', office_code: '', village_code: '',
  sector_code: '', inspector_code: '',
  persons_employed: '', date_of_application: '', date_of_entry: new Date().toISOString().split('T')[0],
  date_of_issue: '', date_educated: '', self_guide: 'N', self_edu: 'N',
};

function activityToForm(act: SelfEmployActivity): ActivityFormState {
  return {
    activity_type: act.activity_type || '',
    date_commenced: act.date_commenced ? act.date_commenced.split('T')[0] : '',
    date_ceased: act.date_ceased ? act.date_ceased.split('T')[0] : '',
    phone: act.phone ? formatPhone(act.phone) : '',
    fax: act.fax ? formatPhone(act.fax) : '',
    arrears: act.arrears || 'N',
    legal_action: act.legal_action || 'N',
    self_maddr1: act.self_maddr1 || '',
    self_maddr2: act.self_maddr2 || '',
    self_paddr1: act.self_paddr1 || '',
    self_paddr2: act.self_paddr2 || '',
    occupation_code: act.occupation_code || '',
    industrial_code: act.industrial_code || '',
    office_code: act.office_code || '',
    village_code: act.village_code || '',
    sector_code: act.sector_code || '',
    inspector_code: act.inspector_code || '',
    persons_employed: act.persons_employed != null ? String(act.persons_employed) : '',
    date_of_application: act.date_of_application ? act.date_of_application.split('T')[0] : '',
    date_of_entry: act.date_of_entry ? act.date_of_entry.split('T')[0] : '',
    date_of_issue: act.date_of_issue ? act.date_of_issue.split('T')[0] : '',
    date_educated: act.date_educated ? act.date_educated.split('T')[0] : '',
    self_guide: act.self_guide || 'N',
    self_edu: act.self_edu || 'N',
  };
}

export const SelfEmployDetailsTab: React.FC<SelfEmployDetailsTabProps> = ({
  ssn, selfEmployed, isRegistrationMode, onRegistrationComplete, onRegistrationCancel,
}) => {
  const {
    eligibility, activities, loading,
    registerSelfEmployed, addActivity, updateActivity, loadActivities,
  } = selfEmployed;

  const lookups = useSEPLookups();
  const [editingSeq, setEditingSeq] = useState<string | null>(null);
  const [expandedSeq, setExpandedSeq] = useState<string | null>(null);
  const [form, setForm] = useState<ActivityFormState>({ ...emptyForm });
  const [addingNew, setAddingNew] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const selfRefNo = activities.length > 0 ? activities[0].self_ref_no : null;

  // Can add new row only if all existing rows have date_ceased
  const canAddNew = useMemo(() => {
    if (activities.length === 0) return true;
    return activities.every(a => !!a.date_ceased);
  }, [activities]);

  const validate = (f: ActivityFormState): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!f.activity_type.trim()) errs.activity_type = 'Activity Type is required';
    if (!f.date_commenced) errs.date_commenced = 'Date Commenced is required';
    return errs;
  };

  const handlePhoneChange = (field: 'phone' | 'fax', value: string) => {
    setForm(prev => ({ ...prev, [field]: formatPhone(value) }));
  };

  const startEdit = (act: SelfEmployActivity) => {
    setEditingSeq(act.activity_seq_no);
    setForm(activityToForm(act));
    setExpandedSeq(act.activity_seq_no);
    setAddingNew(false);
    setFormErrors({});
  };

  const startAddNew = () => {
    setAddingNew(true);
    setEditingSeq(null);
    setForm({ ...emptyForm });
    setExpandedSeq(null);
    setFormErrors({});
  };

  const cancelEdit = () => {
    setEditingSeq(null);
    setAddingNew(false);
    setForm({ ...emptyForm });
    setFormErrors({});
  };

  const buildPayload = (f: ActivityFormState) => ({
    activity_type: f.activity_type,
    date_commenced: f.date_commenced,
    date_ceased: f.date_ceased || null,
    phone: stripPhone(f.phone),
    fax: stripPhone(f.fax),
    arrears: f.arrears,
    legal_action: f.legal_action,
    self_maddr1: f.self_maddr1,
    self_maddr2: f.self_maddr2,
    self_paddr1: f.self_paddr1,
    self_paddr2: f.self_paddr2,
    occupation_code: f.occupation_code || null,
    industrial_code: f.industrial_code || null,
    office_code: f.office_code || null,
    village_code: f.village_code || null,
    sector_code: f.sector_code || null,
    inspector_code: f.inspector_code || null,
    persons_employed: f.persons_employed ? Number(f.persons_employed) : null,
    date_of_application: f.date_of_application || null,
    date_of_entry: f.date_of_entry || null,
    date_of_issue: f.date_of_issue || null,
    date_educated: f.date_educated || null,
    self_guide: f.self_guide,
    self_edu: f.self_edu,
  });

  const handleSaveNew = async () => {
    const errs = validate(form);
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }

    if (!selfRefNo) {
      // First ever registration - use registerSelfEmployed RPC
      const sref = await registerSelfEmployed({
        activity_type: form.activity_type,
        date_commenced: form.date_commenced,
        occupation_code: form.occupation_code || undefined,
        office_code: form.office_code || undefined,
        sector_code: form.sector_code || undefined,
      });
      if (sref) {
        // Reload activities to get the created record, then update remaining fields
        await loadActivities();
        const payload = buildPayload(form);
        const { activity_type, date_commenced, occupation_code, office_code, sector_code, ...remaining } = payload;
        const hasRemainingData = Object.values(remaining).some(v => v !== null && v !== '' && v !== 'N');
        if (hasRemainingData) {
          try {
            // Use the actual seq from newly loaded activities
            const newActivities = await import('@/services/selfEmployedService').then(m => m.SelfEmployedService.getActivities(ssn));
            const latestAct = newActivities.find(a => a.self_ref_no === sref);
            if (latestAct) {
              await updateActivity(sref, latestAct.activity_seq_no, remaining as any);
            }
          } catch { /* non-critical, basic fields already saved */ }
        }
        setAddingNew(false);
        setForm({ ...emptyForm });
        onRegistrationComplete?.();
      }
    } else {
      // Add activity to existing self_ref_no
      const seq = await addActivity({
        self_ref_no: selfRefNo,
        activity_type: form.activity_type,
        date_commenced: form.date_commenced,
        occupation_code: form.occupation_code || undefined,
        office_code: form.office_code || undefined,
        sector_code: form.sector_code || undefined,
      });
      if (seq) {
        const payload = buildPayload(form);
        const { activity_type, date_commenced, occupation_code, office_code, sector_code, ...remaining } = payload;
        const hasRemainingData = Object.values(remaining).some(v => v !== null && v !== '' && v !== 'N');
        if (hasRemainingData) {
          try {
            await updateActivity(selfRefNo, seq, remaining as any);
          } catch { /* non-critical */ }
        }
        setAddingNew(false);
        setForm({ ...emptyForm });
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!editingSeq || !selfRefNo) return;
    const errs = validate(form);
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }

    const payload = buildPayload(form);
    await updateActivity(selfRefNo, editingSeq, payload as any);
    setEditingSeq(null);
    setForm({ ...emptyForm });
    setFormErrors({});
  };

  // If no activities and in registration mode, show the add form directly
  const showNewForm = addingNew || (isRegistrationMode && activities.length === 0);

  // No SEP exists at all
  if (!eligibility?.sep_exists && activities.length === 0 && !isRegistrationMode) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Self-Employment Registration</h3>
          <p className="text-muted-foreground">This insured person has not been registered as self-employed.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {selfRefNo && (
            <div>
              <span className="text-sm text-muted-foreground">Self Ref No:</span>
              <span className="ml-2 font-mono font-bold text-lg">{selfRefNo}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={startAddNew}
            disabled={!canAddNew || addingNew || !!editingSeq || loading}
            title={!canAddNew ? 'All existing rows must have Date Ceased before adding a new row' : ''}
          >
            <Plus className="h-4 w-4 mr-1" /> Add New Activity
          </Button>
          {isRegistrationMode && activities.length === 0 && (
            <Button variant="outline" size="sm" onClick={onRegistrationCancel}>
              <X className="h-4 w-4 mr-1" /> Cancel Registration
            </Button>
          )}
        </div>
      </div>

      {!canAddNew && activities.length > 0 && (
        <p className="text-xs text-muted-foreground italic">
          All existing activities must have a Date Ceased before adding a new activity.
        </p>
      )}

      {/* New Activity Form */}
      {showNewForm && (
        <ActivityForm
          form={form}
          setForm={setForm}
          errors={formErrors}
          lookups={lookups}
          onSave={handleSaveNew}
          onCancel={() => {
            cancelEdit();
            if (isRegistrationMode && activities.length === 0) onRegistrationCancel?.();
          }}
          loading={loading}
          title={selfRefNo ? 'Add New Activity' : 'Register as Self-Employed'}
          onPhoneChange={handlePhoneChange}
        />
      )}

      {/* Existing Activities Table */}
      {activities.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Business Activities ({activities.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Seq</TableHead>
                  <TableHead>Activity Type</TableHead>
                  <TableHead>Date Commenced</TableHead>
                  <TableHead>Date Ceased</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Arrears</TableHead>
                  <TableHead>Legal</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((act) => (
                  <React.Fragment key={`${act.self_ref_no}-${act.activity_seq_no}`}>
                    <TableRow
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setExpandedSeq(prev => prev === act.activity_seq_no ? null : act.activity_seq_no)}
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
                      <TableCell>{act.phone ? formatPhone(act.phone) : '-'}</TableCell>
                      <TableCell>{act.arrears === 'Y' ? 'Yes' : 'No'}</TableCell>
                      <TableCell>{act.legal_action === 'Y' ? 'Yes' : 'No'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); startEdit(act); }}>
                            Edit
                          </Button>
                          {expandedSeq === act.activity_seq_no ? <ChevronUp className="h-4 w-4 mt-2" /> : <ChevronDown className="h-4 w-4 mt-2" />}
                        </div>
                      </TableCell>
                    </TableRow>
                    {/* Expanded detail row */}
                    {expandedSeq === act.activity_seq_no && editingSeq !== act.activity_seq_no && (
                      <TableRow>
                        <TableCell colSpan={9} className="bg-muted/30 p-4">
                          <ActivityDetailView act={act} lookups={lookups} />
                        </TableCell>
                      </TableRow>
                    )}
                    {/* Inline edit row */}
                    {editingSeq === act.activity_seq_no && (
                      <TableRow>
                        <TableCell colSpan={9} className="p-0">
                          <ActivityForm
                            form={form}
                            setForm={setForm}
                            errors={formErrors}
                            lookups={lookups}
                            onSave={handleSaveEdit}
                            onCancel={cancelEdit}
                            loading={loading}
                            title={`Edit Activity — Seq ${act.activity_seq_no}`}
                            onPhoneChange={handlePhoneChange}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

/* ========== Activity Form ========== */
function ActivityForm({
  form, setForm, errors, lookups, onSave, onCancel, loading, title, onPhoneChange,
}: {
  form: ActivityFormState;
  setForm: React.Dispatch<React.SetStateAction<ActivityFormState>>;
  errors: Record<string, string>;
  lookups: ReturnType<typeof useSEPLookups>;
  onSave: () => void;
  onCancel: () => void;
  loading: boolean;
  title: string;
  onPhoneChange: (field: 'phone' | 'fax', value: string) => void;
}) {
  const set = (field: keyof ActivityFormState, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  return (
    <Card className="border-primary/30">
      <CardHeader className="py-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Briefcase className="h-5 w-5" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Section: Basic Activity Info */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Basic Information</legend>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Activity Type <span className="text-destructive">*</span></Label>
              <Input value={form.activity_type} onChange={(e) => set('activity_type', e.target.value)} placeholder="e.g., Retail Shop" className={errors.activity_type ? 'border-destructive' : ''} />
              {errors.activity_type && <p className="text-xs text-destructive mt-1">{errors.activity_type}</p>}
            </div>
            <div>
              <Label>Date Commenced <span className="text-destructive">*</span></Label>
              <Input type="date" value={form.date_commenced} onChange={(e) => set('date_commenced', e.target.value)} className={errors.date_commenced ? 'border-destructive' : ''} />
              {errors.date_commenced && <p className="text-xs text-destructive mt-1">{errors.date_commenced}</p>}
            </div>
            <div>
              <Label>Date Ceased</Label>
              <Input type="date" value={form.date_ceased} onChange={(e) => set('date_ceased', e.target.value)} />
            </div>
            <div>
              <Label>Business Telephone</Label>
              <Input value={form.phone} onChange={(e) => onPhoneChange('phone', e.target.value)} placeholder="(869)-123-4567" maxLength={14} />
            </div>
            <div>
              <Label>Arrears</Label>
              <Select value={form.arrears} onValueChange={(v) => set('arrears', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="N">No</SelectItem>
                  <SelectItem value="Y">Yes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Legal Action</Label>
              <Select value={form.legal_action} onValueChange={(v) => set('legal_action', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="N">No</SelectItem>
                  <SelectItem value="Y">Yes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </fieldset>

        {/* Section: Address */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Address</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Mailing Address Line 1</Label>
              <Input value={form.self_maddr1} onChange={(e) => set('self_maddr1', e.target.value)} maxLength={60} />
            </div>
            <div>
              <Label>Mailing Address Line 2</Label>
              <Input value={form.self_maddr2} onChange={(e) => set('self_maddr2', e.target.value)} maxLength={60} />
            </div>
            <div>
              <Label>Physical Address Line 1</Label>
              <Input value={form.self_paddr1} onChange={(e) => set('self_paddr1', e.target.value)} maxLength={60} />
            </div>
            <div>
              <Label>Physical Address Line 2</Label>
              <Input value={form.self_paddr2} onChange={(e) => set('self_paddr2', e.target.value)} maxLength={60} />
            </div>
          </div>
        </fieldset>

        {/* Section: Activity Details (dropdowns) */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Activity Details</legend>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Occupational Code</Label>
              <Select value={form.occupation_code} onValueChange={(v) => set('occupation_code', v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {lookups.occupations.map(o => (
                    <SelectItem key={o.code} value={o.code}>{o.code} - {o.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Industrial Code</Label>
              <Select value={form.industrial_code} onValueChange={(v) => set('industrial_code', v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {lookups.industries.map(o => (
                    <SelectItem key={o.code} value={o.code}>{o.code} - {o.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Office Code</Label>
              <Select value={form.office_code} onValueChange={(v) => set('office_code', v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {lookups.offices.map(o => (
                    <SelectItem key={o.code} value={o.code}>{o.code} - {o.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Village Code</Label>
              <Select value={form.village_code} onValueChange={(v) => set('village_code', v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {lookups.villages.map(o => (
                    <SelectItem key={o.code} value={o.code}>{o.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sector Code</Label>
              <Select value={form.sector_code} onValueChange={(v) => set('sector_code', v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {lookups.sectors.map(o => (
                    <SelectItem key={o.code} value={o.code}>{o.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fax</Label>
              <Input value={form.fax} onChange={(e) => onPhoneChange('fax', e.target.value)} placeholder="(869)-123-4567" maxLength={14} />
            </div>
          </div>
        </fieldset>

        {/* Section: Other Information */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Other Information</legend>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Inspector</Label>
              <Select value={form.inspector_code} onValueChange={(v) => set('inspector_code', v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {lookups.inspectors.map(i => (
                    <SelectItem key={i.code} value={i.code}>{i.code} - {i.insp_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Persons Employed</Label>
              <Input type="number" min="0" value={form.persons_employed} onChange={(e) => set('persons_employed', e.target.value)} />
            </div>
            <div>
              <Label>Date of Application</Label>
              <Input type="date" value={form.date_of_application} onChange={(e) => set('date_of_application', e.target.value)} />
            </div>
            <div>
              <Label>Date of Entry</Label>
              <Input type="date" value={form.date_of_entry} onChange={(e) => set('date_of_entry', e.target.value)} />
            </div>
            <div>
              <Label>Date of Issue</Label>
              <Input type="date" value={form.date_of_issue} onChange={(e) => set('date_of_issue', e.target.value)} />
            </div>
            <div>
              <Label>Date Educated</Label>
              <Input type="date" value={form.date_educated} onChange={(e) => set('date_educated', e.target.value)} />
            </div>
            <div>
              <Label>Self Guide</Label>
              <Select value={form.self_guide} onValueChange={(v) => set('self_guide', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="N">No</SelectItem>
                  <SelectItem value="Y">Yes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Self Edu</Label>
              <Select value={form.self_edu} onValueChange={(v) => set('self_edu', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="N">No</SelectItem>
                  <SelectItem value="Y">Yes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </fieldset>

        {/* Buttons */}
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>
          <Button onClick={onSave} disabled={loading}>
            <Save className="h-4 w-4 mr-1" /> {loading ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ========== Read-Only Activity Detail ========== */
function ActivityDetailView({ act, lookups }: { act: SelfEmployActivity; lookups: ReturnType<typeof useSEPLookups> }) {
  const findLabel = (items: { code: string; description?: string; insp_name?: string }[], code: string | null) => {
    if (!code) return '-';
    const item = items.find(i => i.code === code);
    return item ? `${code} - ${'description' in item ? item.description : (item as any).insp_name}` : code;
  };

  const fields = [
    ['Mailing Address 1', act.self_maddr1],
    ['Mailing Address 2', act.self_maddr2],
    ['Physical Address 1', act.self_paddr1],
    ['Physical Address 2', act.self_paddr2],
    ['Phone', act.phone ? formatPhone(act.phone) : null],
    ['Fax', act.fax ? formatPhone(act.fax) : null],
    ['Occupation', findLabel(lookups.occupations, act.occupation_code)],
    ['Industrial Code', findLabel(lookups.industries, act.industrial_code)],
    ['Office', findLabel(lookups.offices, act.office_code)],
    ['Village', findLabel(lookups.villages, act.village_code)],
    ['Sector', findLabel(lookups.sectors, act.sector_code)],
    ['Inspector', findLabel(lookups.inspectors.map(i => ({ code: i.code, description: i.insp_name })), act.inspector_code)],
    ['Persons Employed', act.persons_employed != null ? String(act.persons_employed) : null],
    ['Arrears', act.arrears === 'Y' ? 'Yes' : 'No'],
    ['Legal Action', act.legal_action === 'Y' ? 'Yes' : 'No'],
    ['Date of Application', act.date_of_application ? format(new Date(act.date_of_application), 'dd/MM/yyyy') : null],
    ['Date of Entry', act.date_of_entry ? format(new Date(act.date_of_entry), 'dd/MM/yyyy') : null],
    ['Date of Issue', act.date_of_issue ? format(new Date(act.date_of_issue), 'dd/MM/yyyy') : null],
    ['Date Educated', act.date_educated ? format(new Date(act.date_educated), 'dd/MM/yyyy') : null],
    ['Self Guide', act.self_guide === 'Y' ? 'Yes' : 'No'],
    ['Self Edu', act.self_edu === 'Y' ? 'Yes' : 'No'],
    ['Entered By', act.entered_by],
    ['Verified By', act.verified_by],
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
      {fields.map(([label, value]) => (
        <div key={label as string}>
          <span className="text-muted-foreground text-xs">{label}</span>
          <p className="font-medium">{(value as string) || '-'}</p>
        </div>
      ))}
    </div>
  );
}
