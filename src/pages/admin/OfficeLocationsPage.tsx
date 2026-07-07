import { useState } from 'react';
import {
  useOfficeLocations,
  useCreateOfficeLocation,
  useDeactivateOfficeLocation,
  useReactivateOfficeLocation,
} from '@/platform/organization/useOrganization';
import { LOCATION_TYPES } from '@/platform/organization/organizationTypes';
import type { LocationType } from '@/platform/organization/organizationTypes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';

export default function OfficeLocationsPage() {
  const [search, setSearch] = useState('');
  const { data: locations = [], isLoading } = useOfficeLocations({ search });
  const create = useCreateOfficeLocation();
  const deactivate = useDeactivateOfficeLocation();
  const reactivate = useReactivateOfficeLocation();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    officeCode: '',
    locationName: '',
    locationType: 'OFFICE' as LocationType,
    locationCode: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    district: '',
    country: '',
    phone: '',
    email: '',
    isPrimary: false,
    isActive: true,
    latitude: null,
    longitude: null,
  });

  const handleCreate = async () => {
    if (!form.officeCode || !form.locationName) {
      toast.error('Office and Location Name are required');
      return;
    }
    try {
      await create.mutateAsync({
        officeCode: form.officeCode,
        locationCode: form.locationCode || null,
        locationName: form.locationName,
        locationType: form.locationType,
        addressLine1: form.addressLine1 || null,
        addressLine2: form.addressLine2 || null,
        city: form.city || null,
        district: form.district || null,
        country: form.country || null,
        latitude: null,
        longitude: null,
        phone: form.phone || null,
        email: form.email || null,
        isPrimary: form.isPrimary,
        isActive: form.isActive,
      });
      toast.success('Location added');
      setOpen(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to add location');
    }
  };

  return (
    <PermissionWrapper moduleName="system_administration">
      <div className="container mx-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Office Locations</h1>
            <p className="text-sm text-muted-foreground">
              Branches, service centres and other physical locations for each office.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>Add Location</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Add Location</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Office Code</Label>
                  <Input value={form.officeCode} onChange={(e) => setForm({ ...form, officeCode: e.target.value })} />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={form.locationType} onValueChange={(v) => setForm({ ...form, locationType: v as LocationType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LOCATION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Location Name</Label>
                  <Input value={form.locationName} onChange={(e) => setForm({ ...form, locationName: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Label>Address Line 1</Label>
                  <Input value={form.addressLine1} onChange={(e) => setForm({ ...form, addressLine1: e.target.value })} />
                </div>
                <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                <div><Label>District</Label><Input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} /></div>
                <div><Label>Country</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div className="col-span-2"><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div className="col-span-2 flex items-center gap-2">
                  <Checkbox checked={form.isPrimary} onCheckedChange={(v) => setForm({ ...form, isPrimary: !!v })} />
                  <Label>Primary location</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={create.isPending}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Input placeholder="Search locations…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Office</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Primary</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={9}>Loading…</TableCell></TableRow>}
            {!isLoading && locations.length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-muted-foreground">No locations yet.</TableCell></TableRow>
            )}
            {locations.map((l) => (
              <TableRow key={l.id}>
                <TableCell>{l.locationName}</TableCell>
                <TableCell>{l.officeCode}</TableCell>
                <TableCell><Badge variant="outline">{l.locationType}</Badge></TableCell>
                <TableCell>{[l.addressLine1, l.city, l.country].filter(Boolean).join(', ') || '—'}</TableCell>
                <TableCell>{l.phone ?? '—'}</TableCell>
                <TableCell>{l.email ?? '—'}</TableCell>
                <TableCell>{l.isPrimary ? 'Yes' : 'No'}</TableCell>
                <TableCell><Badge variant={l.isActive ? 'default' : 'secondary'}>{l.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                <TableCell>
                  {l.isActive
                    ? <Button size="sm" variant="outline" onClick={() => deactivate.mutate(l.id)}>Deactivate</Button>
                    : <Button size="sm" variant="outline" onClick={() => reactivate.mutate(l.id)}>Reactivate</Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </PermissionWrapper>
  );
}
