import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BackNavigation } from '@/components/ui/back-navigation';
import { useToast } from '@/hooks/use-toast';
import {
  Code, FileText, Clock, Shield, Plug, History, Plus, Edit, Trash2, ArrowUp, ArrowDown,
  Eye, Save, Check, X, AlertTriangle, Settings
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
  const [selectedCategory, setSelectedCategory] = useState('caseTypes');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);

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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <BackNavigation to="/legal" backText="Back to Legal Dashboard" />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Legal Administration</h1>
          <p className="text-muted-foreground mt-1">
            Configure code sets, templates, SLAs, permissions, and integrations
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
      </div>

      <Tabs defaultValue="codesets" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="codesets">
            <Code className="mr-2 h-4 w-4" />
            Code Sets
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileText className="mr-2 h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="sla">
            <Clock className="mr-2 h-4 w-4" />
            SLA & Routing
          </TabsTrigger>
          <TabsTrigger value="permissions">
            <Shield className="mr-2 h-4 w-4" />
            Permissions
          </TabsTrigger>
          <TabsTrigger value="integrations">
            <Plug className="mr-2 h-4 w-4" />
            Integrations
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

              <Table>
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
                        <Badge variant="secondary">{code.usageCount} uses</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={code.isActive ? "default" : "secondary"}>
                          {code.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
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
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Document Templates</CardTitle>
                  <CardDescription>
                    Create and manage templates for legal documents with merge fields
                  </CardDescription>
                </div>
                <Dialog open={isTemplateEditorOpen} onOpenChange={setIsTemplateEditorOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      New Template
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>Template Editor</DialogTitle>
                      <DialogDescription>
                        Create a new template with merge fields for dynamic content
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="template-name">Template Name</Label>
                          <Input id="template-name" placeholder="e.g., Payment Order" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="template-type">Type</Label>
                          <Select>
                            <SelectTrigger id="template-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="notice">Notice</SelectItem>
                              <SelectItem value="order">Order</SelectItem>
                              <SelectItem value="decision">Decision</SelectItem>
                              <SelectItem value="summons">Summons</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="template-content">Content</Label>
                        <Textarea
                          id="template-content"
                          rows={10}
                          placeholder="Enter template content with merge fields like {{case.number}}, {{party.primary.name}}, {{hearing.date}}, {{order.number}}, {{officer.name}}"
                          className="font-mono text-sm"
                        />
                      </div>
                      <div className="rounded-lg bg-muted p-4">
                        <h4 className="font-semibold mb-2">Available Merge Fields:</h4>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <code className="text-xs">{'{{case.number}}'}</code>
                          <code className="text-xs">{'{{case.title}}'}</code>
                          <code className="text-xs">{'{{case.type}}'}</code>
                          <code className="text-xs">{'{{party.primary.name}}'}</code>
                          <code className="text-xs">{'{{hearing.date}}'}</code>
                          <code className="text-xs">{'{{order.number}}'}</code>
                          <code className="text-xs">{'{{officer.name}}'}</code>
                          <code className="text-xs">{'{{penalty.amount}}'}</code>
                          <code className="text-xs">{'{{today}}'}</code>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline">
                        <Eye className="mr-2 h-4 w-4" />
                        Preview
                      </Button>
                      <Button variant="outline" onClick={() => setIsTemplateEditorOpen(false)}>Cancel</Button>
                      <Button onClick={() => {
                        handleSave();
                        setIsTemplateEditorOpen(false);
                      }}>Save Template</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockTemplates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell>{template.type}</TableCell>
                      <TableCell>
                        <Badge variant={template.status === 'Published' ? 'default' : 'secondary'}>
                          {template.status}
                        </Badge>
                      </TableCell>
                      <TableCell>v{template.version}</TableCell>
                      <TableCell>{template.lastUpdated}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <History className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SLA & Routing Tab */}
        <TabsContent value="sla" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>SLA Rules</CardTitle>
                <CardDescription>
                  Define service level agreements for case processing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rule Name</TableHead>
                      <TableHead>Case Type</TableHead>
                      <TableHead>SLA Days</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockSLARules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-medium">{rule.name}</TableCell>
                        <TableCell>{rule.caseType}</TableCell>
                        <TableCell>{rule.slaDays} days</TableCell>
                        <TableCell>
                          <Badge variant={rule.status === 'Active' ? 'default' : 'secondary'}>
                            {rule.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Auto-Assignment Rules</CardTitle>
                <CardDescription>
                  Configure automatic case assignment strategies
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {mockSLARules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{rule.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Strategy: <Badge variant="outline">{rule.autoAssign}</Badge>
                      </p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Role Permissions</CardTitle>
              <CardDescription>
                Configure permissions for each role in the legal module
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-7 gap-4 p-4 border-b font-medium">
                  <div>Action</div>
                  <div className="text-center">Clerk</div>
                  <div className="text-center">Legal Officer</div>
                  <div className="text-center">Supervisor</div>
                  <div className="text-center">Finance</div>
                  <div className="text-center">Read Only</div>
                  <div className="text-center">Admin</div>
                </div>
                {['Create Case', 'Assign Case', 'Change Status', 'Publish Order', 'Read Confidential', 'Delete Case', 'Manage Templates'].map((action) => (
                  <div key={action} className="grid grid-cols-7 gap-4 p-4 border-b items-center">
                    <div className="font-medium">{action}</div>
                    <div className="flex justify-center"><Switch /></div>
                    <div className="flex justify-center"><Switch defaultChecked /></div>
                    <div className="flex justify-center"><Switch defaultChecked /></div>
                    <div className="flex justify-center"><Switch /></div>
                    <div className="flex justify-center"><Switch /></div>
                    <div className="flex justify-center"><Switch defaultChecked /></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>External Integrations</CardTitle>
              <CardDescription>
                Configure connections to external systems and services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockIntegrations.map((integration) => (
                  <div key={integration.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                        integration.isActive ? 'bg-primary/10' : 'bg-muted'
                      }`}>
                        <Plug className={`h-5 w-5 ${integration.isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <p className="font-medium">{integration.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Type: {integration.type}
                          {integration.lastSync && ` • Last sync: ${integration.lastSync}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant={integration.isActive ? 'default' : 'secondary'}>
                        {integration.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <Switch checked={integration.isActive} />
                      <Button variant="ghost" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
