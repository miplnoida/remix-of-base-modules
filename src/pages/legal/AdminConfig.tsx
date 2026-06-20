import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign as DollarSignIcon, Workflow as WorkflowIcon, ShieldCheck as ShieldCheckIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LgDataGrid, LgStatusBadge, buildLgRowActions, type LgColumnDef } from '@/components/legal/grid';
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BackNavigation } from '@/components/ui/back-navigation';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Code, FileText, Clock, Shield, Plug, History, Plus, Edit, Trash2, ArrowUp, ArrowDown,
  Eye, Save, Check, X, AlertTriangle, Settings, Building2
} from 'lucide-react';

// Mock data for code sets
const mockCodeSets = [
  { id: '1', category: 'caseTypes', code: 'PROSECUTION', label: 'Prosecution', usageCount: 45, isActive: true },
  { id: '2', category: 'caseTypes', code: 'APPEAL', label: 'Appeal', usageCount: 32, isActive: true },
  { id: '3', category: 'caseTypes', code: 'RECOVERY', label: 'Recovery', usageCount: 28, isActive: true },
  { id: '4', category: 'statuses', code: 'DRAFT', label: 'Draft', usageCount: 15, isActive: true },
  { id: '5', category: 'statuses', code: 'FILED', label: 'Filed', usageCount: 42, isActive: true },
  { id: '6', category: 'hearingTypes', code: 'PRELIMINARY', label: 'Preliminary Hearing', usageCount: 18, isActive: true },
];

// Mock data for templates
const mockTemplates = [
  { id: '1', name: 'Summons Notice', type: 'Summons', status: 'Published', version: 2, lastUpdated: '2025-10-01' },
  { id: '2', name: 'Payment Order', type: 'Order', status: 'Published', version: 1, lastUpdated: '2025-09-28' },
  { id: '3', name: 'Compliance Notice', type: 'Notice', status: 'Draft', version: 1, lastUpdated: '2025-10-02' },
];

// Mock data for SLA rules
const mockSLARules = [
  { id: '1', name: 'Prosecution Review', caseType: 'Prosecution', slaDays: 5, status: 'Active', autoAssign: 'round-robin' },
  { id: '2', name: 'Appeal Processing', caseType: 'Appeal', slaDays: 10, status: 'Active', autoAssign: 'by-workload' },
  { id: '3', name: 'Recovery Action', caseType: 'Recovery', slaDays: 7, status: 'Draft', autoAssign: 'manual' },
];

// Mock integrations
const mockIntegrations = [
  { id: '1', name: 'Single Sign-On (SSO)', type: 'SSO', isActive: true, lastSync: '2025-10-03 14:30' },
  { id: '2', name: 'Document Store', type: 'DocumentStore', isActive: true, lastSync: '2025-10-03 15:00' },
  { id: '3', name: 'Email/SMS Gateway', type: 'Notifications', isActive: false, lastSync: null },
  { id: '4', name: 'eSign Provider', type: 'eSign', isActive: true, lastSync: '2025-10-02 11:20' },
];

export default function AdminConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState('caseTypes');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
  const [complainantData, setComplainantData] = useState({
    name: "Social Security Board",
    address: "123 Main Street\nBelmopan, Belize",
    contactPerson: "John Doe",
    email: "legal@ssb.gov.bz",
    phone: "+501-222-4444",
    defaultOfficer: "",
    defaultPriority: "Medium"
  });

  const categories = [
    { value: 'caseTypes', label: 'Case Types' },
    { value: 'statuses', label: 'Statuses' },
    { value: 'flags', label: 'Flags' },
    { value: 'hearingTypes', label: 'Hearing Types' },
    { value: 'outcomes', label: 'Outcomes' },
    { value: 'penaltyTypes', label: 'Penalty Types' },
    { value: 'serviceMethods', label: 'Service Methods' },
    { value: 'confidentialityLevels', label: 'Confidentiality Levels' },
  ];

  const handleSave = () => {
    toast({
      title: "Changes Saved",
      description: "Configuration has been updated successfully",
    });
  };

  const handleDelete = (item: string) => {
    toast({
      title: "Item Deleted",
      description: `${item} has been removed`,
      variant: "destructive",
    });
  };

  const filteredCodeSets = mockCodeSets.filter(cs => cs.category === selectedCategory);

  // Fetch existing complainant settings
  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['complainant-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('legal_complainant_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    }
  });

  // Update form when settings are loaded
  useEffect(() => {
    if (settings) {
      setComplainantData({
        name: settings.name || "Social Security Board",
        address: settings.address || "",
        contactPerson: settings.contact_person || "",
        email: settings.email || "legal@ssb.gov.bz",
        phone: settings.phone || "",
        defaultOfficer: settings.default_officer || "",
        defaultPriority: settings.default_priority || "Medium"
      });
    }
  }, [settings]);

  // Save mutation for complainant settings
  const saveMutation = useMutation({
    mutationFn: async (data: typeof complainantData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const payload = {
        name: data.name,
        address: data.address,
        contact_person: data.contactPerson,
        email: data.email,
        phone: data.phone,
        default_officer: data.defaultOfficer,
        default_priority: data.defaultPriority,
        created_by: user.id
      };

      if (settings?.id) {
        const { error } = await supabase
          .from('legal_complainant_settings')
          .update(payload)
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('legal_complainant_settings')
          .insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complainant-settings'] });
      toast({
        title: "Settings Saved",
        description: "Complainant settings updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save settings: " + error.message,
        variant: "destructive",
      });
    }
  });

  const handleSaveComplainant = () => {
    if (!complainantData.name || !complainantData.email) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    saveMutation.mutate(complainantData);
  };

  const handleCancelComplainant = () => {
    if (settings) {
      setComplainantData({
        name: settings.name || "Social Security Board",
        address: settings.address || "",
        contactPerson: settings.contact_person || "",
        email: settings.email || "legal@ssb.gov.bz",
        phone: settings.phone || "",
        defaultOfficer: settings.default_officer || "",
        defaultPriority: settings.default_priority || "Medium"
      });
    }
    toast({
      title: "Changes Discarded",
      description: "Form reset to saved values",
    });
  };

    const codesetColumns: LgColumnDef<any>[] = useMemo(() => [
    { accessorKey: "code", header: "Code", meta: { label: "Code", pinLeft: true } },
    { accessorKey: "label", header: "Label", meta: { label: "Label" } },
    { 
      accessorKey: "usageCount", 
      header: "Usage", 
      meta: { label: "Usage", align: "right" },
      cell: ({ getValue }) => <Badge variant="outline">{getValue() as number} uses</Badge>
    },
    { 
      accessorKey: "isActive", 
      header: "Status", 
      meta: { label: "Status" },
      cell: ({ getValue }) => <LgStatusBadge status={getValue() ? "ACTIVE" : "INACTIVE"} />
    },
  ], []);
  const templateColumns: LgColumnDef<any>[] = useMemo(() => [
    { accessorKey: "name", header: "Template Name", meta: { label: "Template Name", pinLeft: true } },
    { accessorKey: "type", header: "Type", meta: { label: "Type" } },
    { 
      accessorKey: "status", 
      header: "Status", 
      meta: { label: "Status" },
      cell: ({ getValue }) => <Badge variant={getValue() === "Published" ? "default" : "secondary"}>{getValue() as string}</Badge>
    },
    { accessorKey: "version", header: "Version", meta: { label: "Version" } },
    { accessorKey: "lastUpdated", header: "Last Updated", meta: { label: "Last Updated" } },
  ], []);

  return (
    <div className="p-6 space-y-6">
    
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Legal Administration</h1>
          <p className="text-muted-foreground mt-1">
            Configure code sets and document templates
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <History className="mr-2 h-4 w-4" />
            Audit Log
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Save All
          </Button>
      </div>

      {/* Quick links to dedicated admin areas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link to="/legal/admin/fees" className="block">
          <Card className="hover:border-primary transition-colors h-full">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0">
              <DollarSignIcon className="h-6 w-6 text-primary" />
              <div>
                <CardTitle className="text-base">Fee Configuration</CardTitle>
                <CardDescription>Rules, bundles, charges (lg_fee_rule, lg_fee_bundle)</CardDescription>
              </div>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/legal/admin/policy" className="block">
          <Card className="hover:border-primary transition-colors h-full">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0">
              <WorkflowIcon className="h-6 w-6 text-primary" />
              <div>
                <CardTitle className="text-base">Workflow &amp; Role Policy</CardTitle>
                <CardDescription>Department profile, role mapping, per-action approvals</CardDescription>
              </div>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/legal/admin/waiver-policies" className="block">
          <Card className="hover:border-primary transition-colors h-full">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0">
              <ShieldCheckIcon className="h-6 w-6 text-primary" />
              <div>
                <CardTitle className="text-base">Waiver Policies</CardTitle>
                <CardDescription>Auto-approve thresholds + tiered waiver approval routing</CardDescription>
              </div>
            </CardHeader>
          </Card>
        </Link>
      </div>

      </div>

      <Tabs defaultValue="codesets" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="codesets">
            <Code className="mr-2 h-4 w-4" />
            Code Sets
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileText className="mr-2 h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="complainant">
            <Building2 className="mr-2 h-4 w-4" />
            Complainant Settings
          </TabsTrigger>
        </TabsList>

        {/* Code Sets Tab */}
        <TabsContent value="codesets" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Code Sets Management</CardTitle>
                  <CardDescription>
                    Manage dropdown values and reference data used throughout the legal module
                  </CardDescription>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Code
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Code</DialogTitle>
                      <DialogDescription>
                        Create a new code value for the selected category
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="code-category">Category</Label>
                        <Select defaultValue={selectedCategory}>
                          <SelectTrigger id="code-category">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="code-value">Code</Label>
                        <Input id="code-value" placeholder="e.g., PROSECUTION" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="code-label">Label</Label>
                        <Input id="code-label" placeholder="e.g., Prosecution" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="code-description">Description</Label>
                        <Textarea id="code-description" placeholder="Optional description" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                      <Button onClick={() => {
                        handleSave();
                        setIsAddDialogOpen(false);
                      }}>Save Code</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Label htmlFor="category-filter">Category:</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger id="category-filter" className="w-[250px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <LgDataGrid id="lg.admin.codesets" columns={codesetColumns} data={filteredCodeSets} rowActions={buildLgRowActions({ onEdit: () => {}, onDelete: (r) => handleDelete(r.label), canDelete: (r) => r.usageCount === 0 })} exportFilename="legal-codesets" />{/*
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Usage Count</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCodeSets.map((code) => (
                    <TableRow key={code.id}>
                      <TableCell className="font-mono text-sm">{code.code}</TableCell>
                      <TableCell>{code.label}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{code.usageCount} uses</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="success">
                          {code.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm">
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(code.label)}
                            disabled={code.usageCount > 0}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              */}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab — uses the central Core Template framework, locked to LEGAL */}
        <TabsContent value="templates" className="space-y-4">
          <LegalCoreTemplates />
          <div className="text-xs text-muted-foreground">
            Tip: this is the same screen as <Link to="/legal/admin/templates" className="underline">Legal Templates</Link> in the sidebar — managed in one place via the Core Template framework.
          </div>
        </TabsContent>

        {/* Complainant Settings Tab */}
        <TabsContent value="complainant" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Default Complainant Information</CardTitle>
              <CardDescription>
                Configure the Social Security Board's information used as default complainant in new cases
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="complainant-name">
                    Complainant Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="complainant-name"
                    value={complainantData.name}
                    onChange={(e) => setComplainantData({ ...complainantData, name: e.target.value })}
                    placeholder="Enter complainant name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact-person">Contact Person</Label>
                  <Input
                    id="contact-person"
                    value={complainantData.contactPerson}
                    onChange={(e) => setComplainantData({ ...complainantData, contactPerson: e.target.value })}
                    placeholder="Enter contact person name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={complainantData.address}
                  onChange={(e) => setComplainantData({ ...complainantData, address: e.target.value })}
                  placeholder="Enter full address"
                  rows={3}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={complainantData.email}
                    onChange={(e) => setComplainantData({ ...complainantData, email: e.target.value })}
                    placeholder="legal@example.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={complainantData.phone}
                    onChange={(e) => setComplainantData({ ...complainantData, phone: e.target.value })}
                    placeholder="+501-XXX-XXXX"
                  />
                </div>
              </div>

              <div className="border-t pt-4 mt-6">
                <h3 className="text-lg font-semibold mb-4">Case Default Settings</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="default-officer">Default Assigned Officer</Label>
                    <Input
                      id="default-officer"
                      value={complainantData.defaultOfficer}
                      onChange={(e) => setComplainantData({ ...complainantData, defaultOfficer: e.target.value })}
                      placeholder="Optional: Officer name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="default-priority">Default Priority</Label>
                    <Input
                      id="default-priority"
                      value={complainantData.defaultPriority}
                      onChange={(e) => setComplainantData({ ...complainantData, defaultPriority: e.target.value })}
                      placeholder="e.g., High, Medium, Low"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={handleSaveComplainant} 
                  className="gap-2"
                  disabled={saveMutation.isPending || isLoadingSettings}
                >
                  <Save className="h-4 w-4" />
                  {saveMutation.isPending ? "Saving..." : "Save Settings"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleCancelComplainant} 
                  className="gap-2"
                  disabled={saveMutation.isPending || isLoadingSettings}
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
