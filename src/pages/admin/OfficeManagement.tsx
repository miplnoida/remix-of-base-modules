import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Building2, Plus, Search, Edit, MapPin } from "lucide-react";
import { useTbOffices, useCreateTbOffice, useUpdateTbOffice } from "@/hooks/useAdminData";
import type { TbOffice } from "@/hooks/useAdminData";

const OfficeManagement = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showOfficeDialog, setShowOfficeDialog] = useState(false);
  const [selectedOffice, setSelectedOffice] = useState<TbOffice | null>(null);
  const [officeForm, setOfficeForm] = useState({
    code: "",
    description: "",
    address1: "",
    address2: "",
    office_email: "",
    office_phone: "",
    is_active: true,
  });

  const { data: offices = [], isLoading } = useTbOffices();
  const createOffice = useCreateTbOffice();
  const updateOffice = useUpdateTbOffice();

  const filteredOffices = offices.filter((office) =>
    office.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    office.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    office.address1?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenOfficeDialog = (office?: TbOffice) => {
    if (office) {
      setSelectedOffice(office);
      setOfficeForm({
        code: office.code,
        description: office.description || "",
        address1: office.address1 || "",
        address2: office.address2 || "",
        office_email: (office as any).office_email || "",
        office_phone: (office as any).office_phone || "",
        is_active: office.is_active ?? true,
      });
    } else {
      setSelectedOffice(null);
      setOfficeForm({ code: "", description: "", address1: "", address2: "", office_email: "", office_phone: "", is_active: true });
    }
    setShowOfficeDialog(true);
  };

  const handleSaveOffice = async () => {
    if (selectedOffice) {
      const { code, ...updateData } = officeForm;
      await updateOffice.mutateAsync({ code: selectedOffice.code, ...updateData });
    } else {
      await createOffice.mutateAsync(officeForm);
    }
    setShowOfficeDialog(false);
  };

  const activeCount = offices.filter((o) => o.is_active !== false).length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Office Management</h1>
          <p className="text-muted-foreground mt-1">Manage office locations (tb_office)</p>
        </div>
        <Button onClick={() => handleOpenOfficeDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Office
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Total Offices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{offices.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Offices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Inactive Offices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{offices.length - activeCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Office Directory</CardTitle>
          <CardDescription>Manage all office locations</CardDescription>
          <div className="flex items-center gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by code, name or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOffices.map((office) => (
                  <TableRow key={office.code}>
                    <TableCell className="font-medium">{office.code}</TableCell>
                    <TableCell>{office.description || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {[office.address1, office.address2].filter(Boolean).join(", ") || '-'}
                    </TableCell>
                    <TableCell>{(office as any).office_email || '-'}</TableCell>
                    <TableCell>{(office as any).office_phone || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={office.is_active !== false ? "default" : "secondary"}>
                        {office.is_active !== false ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => handleOpenOfficeDialog(office)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Office Dialog */}
      <Dialog open={showOfficeDialog} onOpenChange={setShowOfficeDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedOffice ? "Edit Office" : "Add Office"}</DialogTitle>
            <DialogDescription>
              {selectedOffice ? "Update office details" : "Create a new office location"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">Office Code *</Label>
              <Input
                id="code"
                value={officeForm.code}
                onChange={(e) => setOfficeForm({ ...officeForm, code: e.target.value.toUpperCase() })}
                placeholder="e.g. HQ, SKB, NEV"
                disabled={!!selectedOffice}
                maxLength={10}
              />
              {selectedOffice && (
                <p className="text-xs text-muted-foreground">Code cannot be changed after creation</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description / Name *</Label>
              <Input
                id="description"
                value={officeForm.description}
                onChange={(e) => setOfficeForm({ ...officeForm, description: e.target.value })}
                placeholder="Head Office"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address1">Address Line 1</Label>
              <Textarea
                id="address1"
                value={officeForm.address1}
                onChange={(e) => setOfficeForm({ ...officeForm, address1: e.target.value })}
                placeholder="Street address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address2">Address Line 2</Label>
              <Input
                id="address2"
                value={officeForm.address2}
                onChange={(e) => setOfficeForm({ ...officeForm, address2: e.target.value })}
                placeholder="City, State, Country"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="office_email">Email</Label>
                <Input
                  id="office_email"
                  type="email"
                  value={officeForm.office_email}
                  onChange={(e) => setOfficeForm({ ...officeForm, office_email: e.target.value })}
                  placeholder="office@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="office_phone">Phone</Label>
                <Input
                  id="office_phone"
                  value={officeForm.office_phone}
                  onChange={(e) => setOfficeForm({ ...officeForm, office_phone: e.target.value })}
                  placeholder="+1-869-XXX-XXXX"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Active</Label>
              <Switch
                id="is_active"
                checked={officeForm.is_active}
                onCheckedChange={(checked) => setOfficeForm({ ...officeForm, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOfficeDialog(false)}>Cancel</Button>
            <Button
              onClick={handleSaveOffice}
              disabled={!officeForm.code || !officeForm.description || createOffice.isPending || updateOffice.isPending}
            >
              {createOffice.isPending || updateOffice.isPending ? "Saving..." : selectedOffice ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OfficeManagement;
