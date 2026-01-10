import { useState, useMemo } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Users, Plus, Search, Edit, Building2, Trash2, Check, ChevronsUpDown, UserCircle } from "lucide-react";
import { useOfficeLocations, useCreateDepartment, useUpdateDepartment, useDeleteDepartment, useUserProfiles } from "@/hooks/useAdminData";
import type { Department } from "@/hooks/useAdminData";
import { cn } from "@/lib/utils";

interface DepartmentWithOffice extends Omit<Department, 'department_head_user_id'> {
  officeName?: string;
  department_head_user_id?: string | null;
  departmentHeadName?: string;
}

const DepartmentManagement = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<DepartmentWithOffice | null>(null);
  const [selectedOfficeForCreate, setSelectedOfficeForCreate] = useState<string>("");
  const [form, setForm] = useState({ name: "", description: "", is_active: true, department_head_user_id: "" });
  const [headSearchOpen, setHeadSearchOpen] = useState(false);

  const { data: offices = [], isLoading: loadingOffices } = useOfficeLocations();
  const { data: users = [] } = useUserProfiles();
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();
  const deleteDepartment = useDeleteDepartment();

  // Filter only active users for department head selection
  const activeUsers = useMemo(() => 
    users.filter(u => u.is_active !== false), 
    [users]
  );

  // Get user name by ID
  const getUserName = (userId: string | undefined | null) => {
    if (!userId) return null;
    const user = users.find(u => u.id === userId);
    return user ? (user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email) : null;
  };

  // Flatten departments from offices
  const departments: DepartmentWithOffice[] = selectedOfficeId === "all" 
    ? offices.flatMap(o => (o.departments || []).map(d => ({ ...d, officeName: o.branch_name })))
    : (offices.find(o => o.id === selectedOfficeId)?.departments || []).map(d => ({ 
        ...d, 
        officeName: offices.find(o => o.id === selectedOfficeId)?.branch_name || '' 
      }));

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dept.officeName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenDialog = (dept?: DepartmentWithOffice) => {
    if (dept) {
      setEditingDepartment(dept);
      setSelectedOfficeForCreate(dept.office_id);
      setForm({ 
        name: dept.name, 
        description: dept.description || "", 
        is_active: dept.is_active,
        department_head_user_id: dept.department_head_user_id || ""
      });
    } else {
      setEditingDepartment(null);
      setSelectedOfficeForCreate(offices[0]?.id || "");
      setForm({ name: "", description: "", is_active: true, department_head_user_id: "" });
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (editingDepartment) {
      await updateDepartment.mutateAsync({
        id: editingDepartment.id,
        name: form.name,
        description: form.description,
        is_active: form.is_active,
        department_head_user_id: form.department_head_user_id || null,
      });
    } else {
      if (!selectedOfficeForCreate) return;
      await createDepartment.mutateAsync({
        office_id: selectedOfficeForCreate,
        name: form.name,
        description: form.description,
        is_active: form.is_active,
        department_head_user_id: form.department_head_user_id || null,
      });
    }
    setShowDialog(false);
    setEditingDepartment(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this department?")) {
      await deleteDepartment.mutateAsync(id);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Department Management</h1>
          <p className="text-muted-foreground mt-1">Manage departments across office locations</p>
        </div>
        <Button onClick={() => handleOpenDialog()} disabled={offices.length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          Add Department
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Departments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {departments.filter(d => d.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Offices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{offices.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Departments Directory</CardTitle>
          <CardDescription>All departments organized by office location</CardDescription>
          <div className="flex items-center gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search departments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedOfficeId} onValueChange={setSelectedOfficeId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by office" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Offices</SelectItem>
                {offices.map(office => (
                  <SelectItem key={office.id} value={office.id}>{office.branch_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loadingOffices ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department Name</TableHead>
                  <TableHead>Office Location</TableHead>
                  <TableHead>Department Head</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDepartments.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell className="font-medium">{dept.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {dept.officeName}
                      </div>
                    </TableCell>
                    <TableCell>
                      {dept.department_head_user_id ? (
                        <div className="flex items-center gap-2">
                          <UserCircle className="h-4 w-4 text-muted-foreground" />
                          <span>{getUserName(dept.department_head_user_id) || 'Unknown'}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
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
                          onClick={() => handleOpenDialog(dept)}
                          title="Edit Department"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDelete(dept.id)}
                          disabled={deleteDepartment.isPending}
                          title="Delete Department"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredDepartments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No departments found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Department Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingDepartment ? "Edit Department" : "Add Department"}</DialogTitle>
            <DialogDescription>
              {editingDepartment ? "Update department details" : "Create a new department for an office location"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="office">Office Location *</Label>
              <Select 
                value={selectedOfficeForCreate} 
                onValueChange={setSelectedOfficeForCreate}
                disabled={!!editingDepartment}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select office" />
                </SelectTrigger>
                <SelectContent>
                  {offices.map(office => (
                    <SelectItem key={office.id} value={office.id}>{office.branch_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Department Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="IT Department"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Department Head</Label>
              <Popover open={headSearchOpen} onOpenChange={setHeadSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={headSearchOpen}
                    className="w-full justify-between"
                  >
                    {form.department_head_user_id
                      ? getUserName(form.department_head_user_id) || "Select user..."
                      : "Select department head..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search users..." />
                    <CommandList>
                      <CommandEmpty>No user found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value=""
                          onSelect={() => {
                            setForm({ ...form, department_head_user_id: "" });
                            setHeadSearchOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              !form.department_head_user_id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          No department head
                        </CommandItem>
                        {activeUsers.map((user) => (
                          <CommandItem
                            key={user.id}
                            value={user.full_name || user.email || user.id}
                            onSelect={() => {
                              setForm({ ...form, department_head_user_id: user.id });
                              setHeadSearchOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                form.department_head_user_id === user.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                The department head will be used for workflow approvals when "Department Head" approver type is selected.
              </p>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Active</Label>
              <Switch
                id="is_active"
                checked={form.is_active}
                onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleSave} 
              disabled={!form.name || (!editingDepartment && !selectedOfficeForCreate) || createDepartment.isPending || updateDepartment.isPending}
            >
              {editingDepartment ? "Update" : "Create"} Department
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DepartmentManagement;