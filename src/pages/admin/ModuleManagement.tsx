import { useState } from "react";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LayoutGrid, Plus, Search, Edit, Settings, Eye, Pencil, Trash2, Check } from "lucide-react";
import { useAppModules, useCreateAppModule, useUpdateAppModule, useCreateModuleAction } from "@/hooks/useAdminData";
import type { AppModule, ModuleAction } from "@/hooks/useAdminData";

const ModuleManagement = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showModuleDialog, setShowModuleDialog] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [selectedModule, setSelectedModule] = useState<AppModule | null>(null);
  const [moduleForm, setModuleForm] = useState({
    name: "",
    display_name: "",
    description: "",
    icon: "",
    route: "",
    parent_id: null as string | null,
    sort_order: 0,
    is_enabled: true,
  });
  const [actionForm, setActionForm] = useState({
    action_name: "",
    display_name: "",
    description: "",
    is_enabled: true,
  });

  const { data: modules = [], isLoading } = useAppModules();
  const createModule = useCreateAppModule();
  const updateModule = useUpdateAppModule();
  const createAction = useCreateModuleAction();

  const filteredModules = modules.filter((module) =>
    module.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    module.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const parentModules = modules.filter((m) => !m.parent_id);

  const handleOpenModuleDialog = (module?: AppModule) => {
    if (module) {
      setSelectedModule(module);
      setModuleForm({
        name: module.name,
        display_name: module.display_name,
        description: module.description || "",
        icon: module.icon || "",
        route: module.route || "",
        parent_id: module.parent_id,
        sort_order: module.sort_order,
        is_enabled: module.is_enabled,
      });
    } else {
      setSelectedModule(null);
      setModuleForm({
        name: "",
        display_name: "",
        description: "",
        icon: "",
        route: "",
        parent_id: null,
        sort_order: 0,
        is_enabled: true,
      });
    }
    setShowModuleDialog(true);
  };

  const handleSaveModule = async () => {
    if (selectedModule) {
      await updateModule.mutateAsync({ id: selectedModule.id, ...moduleForm });
    } else {
      await createModule.mutateAsync(moduleForm);
    }
    setShowModuleDialog(false);
  };

  const handleOpenActionDialog = (module: AppModule) => {
    setSelectedModule(module);
    setActionForm({ action_name: "", display_name: "", description: "", is_enabled: true });
    setShowActionDialog(true);
  };

  const handleSaveAction = async () => {
    if (selectedModule) {
      await createAction.mutateAsync({ module_id: selectedModule.id, ...actionForm });
      setShowActionDialog(false);
    }
  };

  const handleToggleModule = async (module: AppModule) => {
    await updateModule.mutateAsync({ id: module.id, is_enabled: !module.is_enabled });
  };

  const getDefaultActions = () => [
    { action_name: "view", display_name: "View" },
    { action_name: "add", display_name: "Add" },
    { action_name: "edit", display_name: "Edit" },
    { action_name: "delete", display_name: "Delete" },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Module Management</h1>
          <p className="text-muted-foreground mt-1">Manage application modules and their actions</p>
        </div>
        <Button onClick={() => handleOpenModuleDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Module
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              Total Modules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{modules.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Enabled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {modules.filter((m) => m.is_enabled).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Disabled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {modules.filter((m) => !m.is_enabled).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {modules.reduce((sum, m) => sum + (m.actions?.length || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Application Modules</CardTitle>
          <CardDescription>Configure modules that appear in the navigation menu</CardDescription>
          <div className="flex items-center gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search modules..."
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
              {filteredModules.map((module) => (
                <AccordionItem key={module.id} value={module.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        <LayoutGrid className="h-5 w-5 text-primary" />
                        <div className="text-left">
                          <p className="font-medium">{module.display_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {module.name} • {module.route || "No route"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={module.is_enabled ? "default" : "secondary"}>
                          {module.is_enabled ? "Enabled" : "Disabled"}
                        </Badge>
                        <Badge variant="outline">{module.actions?.length || 0} Actions</Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pl-8 space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">{module.description || "No description"}</p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleToggleModule(module)}>
                            {module.is_enabled ? "Disable" : "Enable"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleOpenModuleDialog(module)}>
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button size="sm" onClick={() => handleOpenActionDialog(module)}>
                            <Plus className="h-4 w-4 mr-1" />
                            Add Action
                          </Button>
                        </div>
                      </div>

                      {module.actions && module.actions.length > 0 && (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Action Name</TableHead>
                              <TableHead>Display Name</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {module.actions.map((action) => (
                              <TableRow key={action.id}>
                                <TableCell className="font-mono text-sm">{action.action_name}</TableCell>
                                <TableCell className="font-medium">{action.display_name}</TableCell>
                                <TableCell className="text-muted-foreground">{action.description || "-"}</TableCell>
                                <TableCell>
                                  <Badge variant={action.is_enabled ? "default" : "secondary"}>
                                    {action.is_enabled ? "Enabled" : "Disabled"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button variant="ghost" size="icon">
                                    <Edit className="h-4 w-4" />
                                  </Button>
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

      {/* Module Dialog */}
      <Dialog open={showModuleDialog} onOpenChange={setShowModuleDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedModule ? "Edit Module" : "Add Module"}</DialogTitle>
            <DialogDescription>
              {selectedModule ? "Update module configuration" : "Create a new application module"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">System Name *</Label>
                <Input
                  id="name"
                  value={moduleForm.name}
                  onChange={(e) => setModuleForm({ ...moduleForm, name: e.target.value })}
                  placeholder="user_management"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="display_name">Display Name *</Label>
                <Input
                  id="display_name"
                  value={moduleForm.display_name}
                  onChange={(e) => setModuleForm({ ...moduleForm, display_name: e.target.value })}
                  placeholder="User Management"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={moduleForm.description}
                onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="icon">Icon (Lucide name)</Label>
                <Input
                  id="icon"
                  value={moduleForm.icon}
                  onChange={(e) => setModuleForm({ ...moduleForm, icon: e.target.value })}
                  placeholder="Users"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="route">Route</Label>
                <Input
                  id="route"
                  value={moduleForm.route}
                  onChange={(e) => setModuleForm({ ...moduleForm, route: e.target.value })}
                  placeholder="/admin/users"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="parent">Parent Module</Label>
                <Select
                  value={moduleForm.parent_id || "none"}
                  onValueChange={(v) => setModuleForm({ ...moduleForm, parent_id: v === "none" ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None (top level)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (top level)</SelectItem>
                    {parentModules.filter((m) => m.id !== selectedModule?.id).map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.display_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sort_order">Sort Order</Label>
                <Input
                  id="sort_order"
                  type="number"
                  value={moduleForm.sort_order}
                  onChange={(e) => setModuleForm({ ...moduleForm, sort_order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="is_enabled">Enabled</Label>
              <Switch
                id="is_enabled"
                checked={moduleForm.is_enabled}
                onCheckedChange={(checked) => setModuleForm({ ...moduleForm, is_enabled: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModuleDialog(false)}>Cancel</Button>
            <Button
              onClick={handleSaveModule}
              disabled={!moduleForm.name || !moduleForm.display_name || createModule.isPending || updateModule.isPending}
            >
              {selectedModule ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Action</DialogTitle>
            <DialogDescription>
              Add an action to {selectedModule?.display_name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Quick Add</Label>
              <div className="flex flex-wrap gap-2">
                {getDefaultActions().map((action) => (
                  <Button
                    key={action.action_name}
                    size="sm"
                    variant="outline"
                    onClick={() => setActionForm({
                      ...actionForm,
                      action_name: action.action_name,
                      display_name: action.display_name,
                    })}
                  >
                    {action.display_name}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="action_name">Action Name *</Label>
                <Input
                  id="action_name"
                  value={actionForm.action_name}
                  onChange={(e) => setActionForm({ ...actionForm, action_name: e.target.value })}
                  placeholder="view"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="action_display_name">Display Name *</Label>
                <Input
                  id="action_display_name"
                  value={actionForm.display_name}
                  onChange={(e) => setActionForm({ ...actionForm, display_name: e.target.value })}
                  placeholder="View"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="action_description">Description</Label>
              <Textarea
                id="action_description"
                value={actionForm.description}
                onChange={(e) => setActionForm({ ...actionForm, description: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="action_enabled">Enabled</Label>
              <Switch
                id="action_enabled"
                checked={actionForm.is_enabled}
                onCheckedChange={(checked) => setActionForm({ ...actionForm, is_enabled: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActionDialog(false)}>Cancel</Button>
            <Button
              onClick={handleSaveAction}
              disabled={!actionForm.action_name || !actionForm.display_name || createAction.isPending}
            >
              Create Action
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ModuleManagement;
