import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2 } from 'lucide-react';
import { useSelfEmployed } from '@/hooks/useSelfEmployed';

interface BusinessLocationsTabProps {
  ssn: string;
  selfEmployed: ReturnType<typeof useSelfEmployed>;
}

export const BusinessLocationsTab: React.FC<BusinessLocationsTabProps> = ({ ssn, selfEmployed }) => {
  const { activities, selectedActivity, locations, addLocation, deleteLocation, loading } = selfEmployed;
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [form, setForm] = useState({ location: '', activity_type: '' });

  const selfRefNo = activities.length > 0 ? activities[0].self_ref_no : null;
  const isEditable = selectedActivity && ['P', 'V', 'A'].includes(selectedActivity.status || '');

  const handleAdd = async () => {
    if (!selectedActivity || !selfRefNo || !form.location) return;
    await addLocation({
      ssn,
      self_ref_no: selfRefNo,
      activity_seq_no: selectedActivity.activity_seq_no,
      location: form.location,
      activity_type: form.activity_type || null,
    });
    setShowAddDialog(false);
    setForm({ location: '', activity_type: '' });
  };

  const handleDelete = async (seqNo: number) => {
    if (!selfRefNo || !selectedActivity) return;
    await deleteLocation(selfRefNo, selectedActivity.activity_seq_no, seqNo);
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
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing locations for Activity Seq: <strong>{selectedActivity?.activity_seq_no || '-'}</strong>
        </div>
        {isEditable && (
          <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Location
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SSN</TableHead>
                <TableHead>SREF</TableHead>
                <TableHead>Activity Seq</TableHead>
                <TableHead>Seq No</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Activity Type</TableHead>
                {isEditable && <TableHead></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((loc) => (
                <TableRow key={`${loc.ssn}-${loc.self_ref_no}-${loc.activity_seq_no}-${loc.seq_no}`}>
                  <TableCell className="font-mono">{loc.ssn}</TableCell>
                  <TableCell className="font-mono">{loc.self_ref_no}</TableCell>
                  <TableCell className="font-mono">{loc.activity_seq_no}</TableCell>
                  <TableCell className="font-mono">{loc.seq_no}</TableCell>
                  <TableCell>{loc.location || '-'}</TableCell>
                  <TableCell>{loc.activity_type || '-'}</TableCell>
                  {isEditable && (
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => loc.seq_no && handleDelete(loc.seq_no)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {locations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isEditable ? 7 : 6} className="text-center text-muted-foreground py-8">
                    No business locations
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Business Location</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.location || loading}>Add Location</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
