import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Eye, 
  Mail, 
  MessageSquare, 
  Smartphone, 
  Bell,
  Search
} from 'lucide-react';
import { notificationService } from '@/services/notificationService';
import { NotificationTemplate } from '@/types/notifications';
import { useToast } from '@/hooks/use-toast';

export default function TemplateManagement() {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'Email' as NotificationTemplate['type'],
    subject: '',
    content: '',
    isActive: true
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const data = await notificationService.getTemplates();
      setTemplates(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    try {
      const placeholders = extractPlaceholders(formData.content);
      const newTemplate = await notificationService.createTemplate({
        ...formData,
        placeholders,
        createdBy: 'Current User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      setTemplates([...templates, newTemplate]);
      setIsCreateModalOpen(false);
      resetForm();
      
      toast({
        title: "Success",
        description: "Template created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create template",
        variant: "destructive",
      });
    }
  };

  const handleEditTemplate = async () => {
    if (!selectedTemplate) return;
    
    try {
      const placeholders = extractPlaceholders(formData.content);
      const updatedTemplate = await notificationService.updateTemplate(selectedTemplate.id, {
        ...formData,
        placeholders,
        updatedAt: new Date().toISOString()
      });
      
      setTemplates(templates.map(t => t.id === selectedTemplate.id ? updatedTemplate : t));
      setIsEditModalOpen(false);
      setSelectedTemplate(null);
      resetForm();
      
      toast({
        title: "Success",
        description: "Template updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update template",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTemplate = async (template: NotificationTemplate) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    try {
      await notificationService.deleteTemplate(template.id);
      setTemplates(templates.filter(t => t.id !== template.id));
      
      toast({
        title: "Success",
        description: "Template deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
    }
  };

  const extractPlaceholders = (content: string): string[] => {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = content.match(regex);
    return matches ? [...new Set(matches)] : [];
  };

  const openEditModal = (template: NotificationTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      type: template.type,
      subject: template.subject || '',
      content: template.content,
      isActive: template.isActive
    });
    setIsEditModalOpen(true);
  };

  const openPreviewModal = (template: NotificationTemplate) => {
    setSelectedTemplate(template);
    setIsPreviewModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'Email',
      subject: '',
      content: '',
      isActive: true
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Email': return <Mail className="h-4 w-4" />;
      case 'SMS': return <MessageSquare className="h-4 w-4" />;
      case 'Push': return <Smartphone className="h-4 w-4" />;
      case 'Web In-app':
      case 'Mobile In-app': return <Bell className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || template.type === selectedType;
    return matchesSearch && matchesType;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading templates...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Template Management</h1>
        <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Template
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="search">Search Templates</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by name or content..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="type-filter">Type Filter</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Email">Email</SelectItem>
                  <SelectItem value="SMS">SMS</SelectItem>
                  <SelectItem value="Push">Push</SelectItem>
                  <SelectItem value="Web In-app">Web In-app</SelectItem>
                  <SelectItem value="Mobile In-app">Mobile In-app</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="group hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  {getTypeIcon(template.type)}
                  {template.name}
                </CardTitle>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => openPreviewModal(template)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => openEditModal(template)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDeleteTemplate(template)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={template.isActive ? "default" : "secondary"}>
                  {template.isActive ? 'Active' : 'Inactive'}
                </Badge>
                <Badge variant="outline">{template.type}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm text-gray-600 mb-3">
                {template.subject && (
                  <div className="font-medium mb-1">Subject: {template.subject}</div>
                )}
                {template.content.substring(0, 100)}
                {template.content.length > 100 && '...'}
              </CardDescription>
              <div className="text-xs text-gray-500">
                <div>Placeholders: {template.placeholders.length}</div>
                <div>Updated: {new Date(template.updatedAt).toLocaleDateString()}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
            <p className="text-gray-500 mb-4">Create your first notification template to get started.</p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={isCreateModalOpen || isEditModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
          setSelectedTemplate(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isCreateModalOpen ? 'Create New Template' : 'Edit Template'}
            </DialogTitle>
            <DialogDescription>
              {isCreateModalOpen 
                ? 'Create a new notification template with placeholders for dynamic content.'
                : 'Update the template details and content.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter template name"
                />
              </div>
              <div>
                <Label htmlFor="template-type">Type</Label>
                <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Email">Email</SelectItem>
                    <SelectItem value="SMS">SMS</SelectItem>
                    <SelectItem value="Push">Push</SelectItem>
                    <SelectItem value="Web In-app">Web In-app</SelectItem>
                    <SelectItem value="Mobile In-app">Mobile In-app</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(formData.type === 'Email' || formData.type === 'Push') && (
              <div>
                <Label htmlFor="template-subject">Subject</Label>
                <Input
                  id="template-subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Enter subject line"
                />
              </div>
            )}

            <div>
              <Label htmlFor="template-content">Content</Label>
              <Textarea
                id="template-content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter template content. Use {{PlaceholderName}} for dynamic values."
                rows={6}
              />
                <p className="text-xs text-gray-500 mt-1">
                Use double curly braces to create placeholders (e.g., UserName or Amount)
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="template-active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="template-active">Active</Label>
            </div>

            {formData.content && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Detected Placeholders:</h4>
                <div className="flex flex-wrap gap-1">
                  {extractPlaceholders(formData.content).map((placeholder, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {placeholder}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsCreateModalOpen(false);
                setIsEditModalOpen(false);
                setSelectedTemplate(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={isCreateModalOpen ? handleCreateTemplate : handleEditTemplate}
              disabled={!formData.name || !formData.content}
            >
              {isCreateModalOpen ? 'Create Template' : 'Update Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTemplate && getTypeIcon(selectedTemplate.type)}
              Template Preview
            </DialogTitle>
            <DialogDescription>
              Preview of "{selectedTemplate?.name}" template
            </DialogDescription>
          </DialogHeader>
          
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant={selectedTemplate.isActive ? "default" : "secondary"}>
                  {selectedTemplate.isActive ? 'Active' : 'Inactive'}
                </Badge>
                <Badge variant="outline">{selectedTemplate.type}</Badge>
              </div>

              {selectedTemplate.subject && (
                <div>
                  <Label className="text-sm font-medium">Subject</Label>
                  <div className="p-3 bg-gray-50 rounded border">
                    {selectedTemplate.subject}
                  </div>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium">Content</Label>
                <div className="p-3 bg-gray-50 rounded border whitespace-pre-wrap">
                  {selectedTemplate.content}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Placeholders</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedTemplate.placeholders.map((placeholder, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {placeholder}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="text-xs text-gray-500">
                <div>Created by: {selectedTemplate.createdBy}</div>
                <div>Created: {new Date(selectedTemplate.createdAt).toLocaleDateString()}</div>
                <div>Last updated: {new Date(selectedTemplate.updatedAt).toLocaleDateString()}</div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewModalOpen(false)}>
              Close
            </Button>
            {selectedTemplate && (
              <Button onClick={() => {
                setIsPreviewModalOpen(false);
                openEditModal(selectedTemplate);
              }}>
                Edit Template
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}