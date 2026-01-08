import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Building2, Plus, Search, Edit, MapPin, Users, Trash2 } from "lucide-react";
import { useOfficeLocations, useCreateOfficeLocation, useUpdateOfficeLocation, useCreateDepartment, useUpdateDepartment, useDeleteDepartment, useDepartments } from "@/hooks/useAdminData";
import { useOfficeDepartments, useSetOfficeDepartments } from "@/hooks/useOfficeDepartments";
import type { OfficeLocation, Department } from "@/hooks/useAdminData";
import { MultiSelectCheckbox } from "@/components/ui/multi-select-checkbox";

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
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<string[]>([]);
  const [departmentForm, setDepartmentForm] = useState({
    name: "",
    description: "",
    is_active: true,
  });
  const { data: offices = [], isLoading } = useOfficeLocations();
  const { data: allDepartments = [] } = useDepartments(undefined);
  const { data: officeDepts = [] } = useOfficeDepartments(selectedOffice?.id);
  const setOfficeDepartments = useSetOfficeDepartments();
  const createOffice = useCreateOfficeLocation();
  const updateOffice = useUpdateOfficeLocation();
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();
  const deleteDepartment = useDeleteDepartment();

  // Load selected departments when editing an office
  useEffect(() => {
    if (selectedOffice && officeDepts) {
      setSelectedDepartmentIds(officeDepts.map((od: any) => od.department_id));
    }
  }, [selectedOffice, officeDepts]);

  const filteredOffices = offices.filter((office) =>
    office.branch_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    office.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get unique departments for multi-select (from department master)
  const departmentOptions = allDepartments
    .filter(d => d.is_active)
    .map(d => ({ value: d.id, label: d.name }));

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
      // Department IDs will be loaded via useEffect when officeDepts changes
    } else {
      setSelectedOffice(null);
      setSelectedDepartmentIds([]);
      setOfficeForm({ branch_name: "", address: "", city: "", state: "", country: "", is_active: true });
    }
    setShowOfficeDialog(true);
  };

  const handleSaveOffice = async () => {
    let officeId = selectedOffice?.id;
    if (selectedOffice) {
      await updateOffice.mutateAsync({ id: selectedOffice.id, ...officeForm });
    } else {
      const newOffice = await createOffice.mutateAsync(officeForm);
      officeId = newOffice.id;
    }
    
    // Save department associations
    if (officeId) {
      await setOfficeDepartments.mutateAsync({ 
        officeId, 
        departmentIds: selectedDepartmentIds 
      });
    }
    
    setShowOfficeDialog(false);
    setSelectedDepartmentIds([]);
  };

  const handleOpenDepartmentDialog = (office: OfficeLocation, dept?: Department) => {
    setSelectedOffice(office);
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
    if (!selectedOffice) return;
    
    if (editingDepartment) {
      await updateDepartment.mutateAsync({ 
        id: editingDepartment.id, 
        name: departmentForm.name,
        description: departmentForm.description,
        is_active: departmentForm.is_active,
      });
    } else {
      await createDepartment.mutateAsync({ 
        office_id: selectedOffice.id, 
        ...departmentForm 
      });
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
          <h1 className="text-3xl font-bold text-foreground">Office & Department Management</h1>
          <p className="text-muted-foreground mt-1">Manage office locations and their departments</p>
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
            <div className="text-2xl font-bold">
              {offices.reduce((sum, o) => sum + (o.departments?.length || 0), 0)}
            </div>
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
          <CardDescription>Manage all office locations and their departments</CardDescription>
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
            <Accordion type="multiple" className="w-full">
              {filteredOffices.map((office) => (
                <AccordionItem key={office.id} value={office.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-primary" />
                        <div className="text-left">
                          <p className="font-medium">{office.branch_name}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {[office.city, office.state, office.country].filter(Boolean).join(", ") || "No address"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={office.is_active ? "default" : "secondary"}>
                          {office.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline">{office.departments?.length || 0} Departments</Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pl-8 space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">{office.address}</p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleOpenOfficeDialog(office)}>
                            <Edit className="h-4 w-4 mr-1" />
                            Edit Office
                          </Button>
                          <Button size="sm" onClick={() => handleOpenDepartmentDialog(office)}>
                            <Plus className="h-4 w-4 mr-1" />
                            Add Department
                          </Button>
                        </div>
                      </div>
                      
                      {office.departments && office.departments.length > 0 && (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Department Name</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {office.departments.map((dept) => (
                              <TableRow key={dept.id}>
                                <TableCell className="font-medium">{dept.name}</TableCell>
                                <TableCell className="text-muted-foreground">{dept.description || "-"}</TableCell>
                                <TableCell>
                                  <Badge variant={dept.is_active ? "default" : "secondary"}>
                                    {dept.is_active ? "Active" : "Inactive"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-1">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      onClick={() => handleOpenDepartmentDialog(office, dept)}
                                      title="Edit Department"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => handleDeleteDepartment(dept.id)}
                                      disabled={deleteDepartment.isPending}
                                      title="Delete Department"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
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
            <div className="space-y-2">
              <Label>Associated Departments</Label>
              <MultiSelectCheckbox
                options={departmentOptions}
                selected={selectedDepartmentIds}
                onChange={setSelectedDepartmentIds}
                placeholder="Select departments..."
              />
              <p className="text-xs text-muted-foreground">
                Select departments from the master list to associate with this office
              </p>
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

      {/* Department Dialog */}
      <Dialog open={showDepartmentDialog} onOpenChange={setShowDepartmentDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingDepartment ? "Edit Department" : "Add Department"}</DialogTitle>
            <DialogDescription>
              {editingDepartment ? "Update department details" : `Add a new department to ${selectedOffice?.branch_name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dept_name">Department Name *</Label>
              <Input
                id="dept_name"
                value={departmentForm.name}
                onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })}
                placeholder="IT Department"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept_description">Description</Label>
              <Textarea
                id="dept_description"
                value={departmentForm.description}
                onChange={(e) => setDepartmentForm({ ...departmentForm, description: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="dept_active">Active</Label>
              <Switch
                id="dept_active"
                checked={departmentForm.is_active}
                onCheckedChange={(checked) => setDepartmentForm({ ...departmentForm, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDepartmentDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveDepartment} disabled={!departmentForm.name || createDepartment.isPending || updateDepartment.isPending}>
              {editingDepartment ? "Update" : "Create"} Department
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OfficeManagement;