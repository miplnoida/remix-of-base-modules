import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, AlertCircle } from 'lucide-react';
import { useSelfEmployed } from '@/hooks/useSelfEmployed';
import { SelfEmployLocation } from '@/services/selfEmployedService';

interface BusinessLocationsTabProps {
  ssn: string;
  selfEmployed: ReturnType<typeof useSelfEmployed>;
}

export const BusinessLocationsTab: React.FC<BusinessLocationsTabProps> = ({ ssn, selfEmployed }) => {
  const { activities, selectedActivity, locations, addLocation, updateLocation, deleteLocation, loading } = selfEmployed;
  const [showDialog, setShowDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SelfEmployLocation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SelfEmployLocation | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    selected_activity_seq: '',
    location: '',
    activity_type: '',
  });

  const selfRefNo = activities.length > 0 ? activities[0].self_ref_no : null;
  const isEditable = selectedActivity && ['P', 'V', 'A'].includes(selectedActivity.status || '');

  const groupedLocations = useMemo(() => {
    const groups: Record<string, typeof locations> = {};
    for (const loc of locations) {
      const key = loc.activity_seq_no;
      if (!groups[key]) groups[key] = [];
      groups[key].push(loc);
    }
    return groups;
  }, [locations]);

  const openAddDialog = () => {
    setEditingRecord(null);
    setForm({ selected_activity_seq: '', location: '', activity_type: '' });
    setFormError(null);
    setShowDialog(true);
  };

  const openEditDialog = (loc: SelfEmployLocation) => {
    setEditingRecord(loc);
    setForm({
      selected_activity_seq: loc.activity_seq_no,
      location: loc.location || '',
      activity_type: loc.activity_type || '',
    });
    setFormError(null);
    setShowDialog(true);
  };

  const handleSave = async () => {
    setFormError(null);
    if (!selfRefNo || !form.selected_activity_seq || !form.location) {
      setFormError('Activity and Location are required.');
      return;
    }

    if (editingRecord && editingRecord.seq_no != null) {
      await updateLocation(
        editingRecord.self_ref_no,
        editingRecord.activity_seq_no,
        editingRecord.seq_no,
        {
          location: form.location,
          activity_type: form.activity_type || null,
          activity_seq_no: form.selected_activity_seq,
        }
      );
    } else {
      await addLocation({
        ssn,
        self_ref_no: selfRefNo,
        activity_seq_no: form.selected_activity_seq,
        location: form.location,
        activity_type: form.activity_type || null,
      });
    }
    setShowDialog(false);
    setEditingRecord(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget || !deleteTarget.self_ref_no || !deleteTarget.activity_seq_no || !deleteTarget.seq_no) return;
    await deleteLocation(deleteTarget.self_ref_no, deleteTarget.activity_seq_no, deleteTarget.seq_no);
    setDeleteTarget(null);
  };

  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Register as self-employed first to manage business locations.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        {isEditable && (
          <Button variant="outline" size="sm" onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-1" /> Add Location
          </Button>
        )}
      </div>

      {Object.keys(groupedLocations).length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No business locations
          </CardContent>
        </Card>
      )}

      {Object.entries(groupedLocations).map(([seqNo, locs]) => {
        const matchedActivity = activities.find(a => a.activity_seq_no === seqNo);
        const groupLabel = matchedActivity
          ? `Seq. ${seqNo} - ${matchedActivity.activity_type || 'N/A'}`
          : `Seq. ${seqNo}`;

        return (
          <Card key={seqNo}>
            <CardContent className="p-0">
              <div className="px-4 py-2 bg-muted/50 border-b text-sm font-medium text-foreground">
                {groupLabel}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Self Ref. No.</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Activity Type</TableHead>
                    {isEditable && <TableHead className="w-24">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locs.map((loc) => (
                    <TableRow key={`${loc.ssn}-${loc.self_ref_no}-${loc.activity_seq_no}-${loc.seq_no}`}>
                      <TableCell className="font-mono">{loc.self_ref_no}</TableCell>
                      <TableCell>{loc.location || '-'}</TableCell>
                      <TableCell>{loc.activity_type || '-'}</TableCell>
                      {isEditable && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEditDialog(loc)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(loc)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRecord ? 'Edit Business Location' : 'Add Business Location'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {formError && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded p-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {formError}
              </div>
            )}
            <div>
              <Label>Activity *</Label>
              <Select
                value={form.selected_activity_seq}
                onValueChange={(val) => setForm({ ...form, selected_activity_seq: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select activity" />
                </SelectTrigger>
                <SelectContent>
                  {activities.map((act) => (
                    <SelectItem key={act.activity_seq_no} value={act.activity_seq_no}>
                      Seq {act.activity_seq_no} — {act.activity_type || 'N/A'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Location *</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Enter location" maxLength={20} />
            </div>
            <div>
              <Label>Activity Type</Label>
              <Input value={form.activity_type} onChange={(e) => setForm({ ...form, activity_type: e.target.value })} placeholder="Activity at this location" maxLength={50} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.selected_activity_seq || !form.location || loading}>
              {loading ? 'Saving...' : editingRecord ? 'Update' : 'Add Location'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Business Location?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the location "{deleteTarget?.location}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={loading}>
              {loading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
