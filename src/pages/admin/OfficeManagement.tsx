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
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Building2, Plus, Search, Edit, MapPin, Users, Trash2 } from "lucide-react";
import { useOfficeLocations, useCreateOfficeLocation, useUpdateOfficeLocation, useDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment } from "@/hooks/useAdminData";
import { useOfficeDepartments } from "@/hooks/useOfficeDepartments";
import type { OfficeLocation, Department } from "@/hooks/useAdminData";

const OfficeManagement = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showOfficeDialog, setShowOfficeDialog] = useState(false);
  const [showDepartmentDialog, setShowDepartmentDialog] = useState(false);
  const [selectedOffice, setSelectedOffice] = useState<OfficeLocation | null>(null);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [officeForm, setOfficeForm] = useState({
    branch_name: "",
    address: "",
    city: "",
    state: "",
    country: "",
    is_active: true,
  });
  const [departmentForm, setDepartmentForm] = useState({
    name: "",
    description: "",
    is_active: true,
  });

  const { data: offices = [], isLoading } = useOfficeLocations();
  // Get departments for selected office (for accordion display)
  const { data: selectedOfficeDepts = [] } = useOfficeDepartments(selectedOffice?.id);
  const createOffice = useCreateOfficeLocation();
  const updateOffice = useUpdateOfficeLocation();
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();
  const deleteDepartment = useDeleteDepartment();
  
  // We need to fetch departments for each office for display
  // Using useDepartments with undefined fetches all departments
  const { data: allDepartments = [] } = useDepartments(undefined);
  
  // Group departments by office_code
  const getDepartmentsForOffice = (officeId: string) => {
    // Note: office_locations use uuid id, but tb_office_departments use office_code
    // For now, departments are linked to tb_office, not office_locations
    return allDepartments;
  };

  const filteredOffices = offices.filter((office) =>
    office.branch_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    office.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenOfficeDialog = (office?: OfficeLocation) => {
    if (office) {
      setSelectedOffice(office);
      setOfficeForm({
        branch_name: office.branch_name,
        address: office.address || "",
        city: office.city || "",
        state: office.state || "",
        country: office.country || "",
        is_active: office.is_active,
      });
    } else {
      setSelectedOffice(null);
      setOfficeForm({ branch_name: "", address: "", city: "", state: "", country: "", is_active: true });
    }
    setShowOfficeDialog(true);
  };

  const handleSaveOffice = async () => {
    if (selectedOffice) {
      await updateOffice.mutateAsync({ id: selectedOffice.id, ...officeForm });
    } else {
      await createOffice.mutateAsync(officeForm);
    }
    setShowOfficeDialog(false);
  };

  const handleOpenDepartmentDialog = (dept?: Department) => {
    if (dept) {
      setEditingDepartment(dept);
      setDepartmentForm({ name: dept.name, description: dept.description || "", is_active: dept.is_active });
    } else {
      setEditingDepartment(null);
      setDepartmentForm({ name: "", description: "", is_active: true });
    }
    setShowDepartmentDialog(true);
  };

  const handleSaveDepartment = async () => {
    if (editingDepartment) {
      await updateDepartment.mutateAsync({ 
        id: editingDepartment.id, 
        name: departmentForm.name,
        description: departmentForm.description,
        is_active: departmentForm.is_active,
      });
    } else {
      // Default to first office code - this page manages office_locations, not tb_office
      // Departments are now managed via DepartmentManagement page
      return;
    }
    setShowDepartmentDialog(false);
    setEditingDepartment(null);
  };

  const handleDeleteDepartment = async (deptId: string) => {
    if (confirm("Are you sure you want to delete this department?")) {
      await deleteDepartment.mutateAsync(deptId);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Office Management</h1>
          <p className="text-muted-foreground mt-1">Manage office locations</p>
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
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Departments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allDepartments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Offices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {offices.filter((o) => o.is_active).length}
            </div>
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
                placeholder="Search offices..."
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
                  <TableHead>Branch Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOffices.map((office) => (
                  <TableRow key={office.id}>
                    <TableCell className="font-medium">{office.branch_name}</TableCell>
                    <TableCell className="text-muted-foreground">{office.address || '-'}</TableCell>
                    <TableCell>{[office.city, office.state].filter(Boolean).join(", ") || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={office.is_active ? "default" : "secondary"}>
                        {office.is_active ? "Active" : "Inactive"}
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
            <DialogTitle>{selectedOffice ? "Edit Office" : "Add Office Location"}</DialogTitle>
            <DialogDescription>
              {selectedOffice ? "Update office details" : "Create a new office location"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="branch_name">Branch Name *</Label>
              <Input
                id="branch_name"
                value={officeForm.branch_name}
                onChange={(e) => setOfficeForm({ ...officeForm, branch_name: e.target.value })}
                placeholder="Head Office"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={officeForm.address}
                onChange={(e) => setOfficeForm({ ...officeForm, address: e.target.value })}
                placeholder="Street address"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={officeForm.city}
                  onChange={(e) => setOfficeForm({ ...officeForm, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State/Province</Label>
                <Input
                  id="state"
                  value={officeForm.state}
                  onChange={(e) => setOfficeForm({ ...officeForm, state: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={officeForm.country}
                onChange={(e) => setOfficeForm({ ...officeForm, country: e.target.value })}
              />
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
            <Button onClick={handleSaveOffice} disabled={!officeForm.branch_name || createOffice.isPending || updateOffice.isPending}>
              {selectedOffice ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OfficeManagement;
