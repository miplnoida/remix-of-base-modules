import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { useSelfEmployed } from '@/hooks/useSelfEmployed';

interface BusinessLocationsTabProps {
  ssn: string;
  selfEmployed: ReturnType<typeof useSelfEmployed>;
}

export const BusinessLocationsTab: React.FC<BusinessLocationsTabProps> = ({ ssn, selfEmployed }) => {
  const { activities, selectedActivity, locations, addLocation, deleteLocation, loading } = selfEmployed;
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    selected_activity_seq: '',
    location: '',
    activity_type: '',
  });

  const selfRefNo = activities.length > 0 ? activities[0].self_ref_no : null;
  const isEditable = selectedActivity && ['P', 'V', 'A'].includes(selectedActivity.status || '');

  // Group locations by activity_seq_no
  const groupedLocations = useMemo(() => {
    const groups: Record<string, typeof locations> = {};
    for (const loc of locations) {
      const key = loc.activity_seq_no;
      if (!groups[key]) groups[key] = [];
      groups[key].push(loc);
    }
    return groups;
  }, [locations]);

  const handleAdd = async () => {
    setFormError(null);
    if (!selfRefNo || !form.selected_activity_seq || !form.location) {
      setFormError('Activity and Location are required.');
      return;
    }

    await addLocation({
      ssn,
      self_ref_no: selfRefNo,
      activity_seq_no: form.selected_activity_seq,
      location: form.location,
      activity_type: form.activity_type || null,
    });
    setShowAddDialog(false);
    setForm({ selected_activity_seq: '', location: '', activity_type: '' });
  };

  const handleDelete = async (loc: typeof locations[0]) => {
    if (!loc.self_ref_no || !loc.activity_seq_no || !loc.seq_no) return;
    await deleteLocation(loc.self_ref_no, loc.activity_seq_no, loc.seq_no);
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
          <Button variant="outline" size="sm" onClick={() => { setShowAddDialog(true); setFormError(null); }}>
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
                    {isEditable && <TableHead></TableHead>}
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
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(loc)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Business Location</DialogTitle>
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
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.selected_activity_seq || !form.location || loading}>
              {loading ? 'Saving...' : 'Add Location'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
