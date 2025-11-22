import { useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Copy, Eye, Send, FileText, Mail, MessageSquare, Bell } from "lucide-react";
import { comprehensiveTemplates } from "@/services/mockData/comprehensiveTemplates";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SourceModule, NotificationChannel } from "@/types/notification";
import TemplateEditor from "@/components/templates/TemplateEditor";
import TemplatePreview from "@/components/templates/TemplatePreview";
import SendTestDialog from "@/components/templates/SendTestDialog";

interface ModuleTemplatesProps {
  module?: SourceModule;
}

export default function ModuleTemplates({ module }: ModuleTemplatesProps) {
  const { toast } = useToast();
  const params = useParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [channelFilter, setChannelFilter] = useState<string>("All");
  const [editorOpen, setEditorOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sendTestOpen, setSendTestOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [templates, setTemplates] = useState(comprehensiveTemplates);

  // Determine which module's templates to show
  const currentModule = module || (params.module as SourceModule);
  const showAll = !currentModule || currentModule === 'System';

  const filteredTemplates = comprehensiveTemplates.filter(template => {
    const matchesSearch = 
      template.templateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.bodyText.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesModule = showAll || template.module === currentModule;
    const matchesChannel = channelFilter === "All" || template.channel === channelFilter;
    return matchesSearch && matchesModule && matchesChannel;
  });

  const getChannelIcon = (channel: NotificationChannel) => {
    switch (channel) {
      case 'Email': return <Mail className="h-4 w-4" />;
      case 'SMS': return <MessageSquare className="h-4 w-4" />;
      case 'Push': return <Bell className="h-4 w-4" />;
      case 'Letter': return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getChannelColor = (channel: NotificationChannel) => {
    switch (channel) {
      case 'Email': return 'bg-blue-100 text-blue-800';
      case 'SMS': return 'bg-green-100 text-green-800';
      case 'Push': return 'bg-purple-100 text-purple-800';
      case 'Letter': return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleEdit = (templateId: string) => {
    const template = templates.find(t => t.templateId === templateId);
    if (template) {
      setSelectedTemplate(template);
      setEditorOpen(true);
    }
  };

  const handleDuplicate = (templateId: string) => {
    const template = templates.find(t => t.templateId === templateId);
    if (template) {
      const newTemplate = {
        ...template,
        templateId: `TPL-${Date.now()}`,
        templateName: `${template.templateName} (Copy)`,
        createdAt: new Date().toISOString(),
      };
      setTemplates([...templates, newTemplate]);
      toast({ title: "Template Duplicated", description: `Created copy of "${template.templateName}"` });
    }
  };

  const handlePreview = (templateId: string) => {
    const template = templates.find(t => t.templateId === templateId);
    if (template) {
      setSelectedTemplate(template);
      setPreviewOpen(true);
    }
  };

  const handleSendTest = (templateId: string) => {
    const template = templates.find(t => t.templateId === templateId);
    if (template) {
      setSelectedTemplate(template);
      setSendTestOpen(true);
    }
  };

  const handleSaveTemplate = (template: any) => {
    const existingIndex = templates.findIndex(t => t.templateId === template.templateId);
    if (existingIndex >= 0) {
      const updatedTemplates = [...templates];
      updatedTemplates[existingIndex] = template;
      setTemplates(updatedTemplates);
      toast({ title: "Template Updated", description: `"${template.templateName}" has been saved successfully` });
    } else {
      setTemplates([...templates, template]);
      toast({ title: "Template Created", description: `"${template.templateName}" has been created successfully` });
    }
  };

  const handleCreateNew = () => {
    setSelectedTemplate(null);
    setEditorOpen(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">
            {showAll ? 'All Notification Templates' : `${currentModule} Templates`}
          </h1>
          <p className="text-muted-foreground">
            {showAll 
              ? 'Manage all notification templates across all modules'
              : `Manage ${currentModule}-specific notification templates`
            }
          </p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="mr-2 h-4 w-4" />
          Create Template
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{filteredTemplates.length}</div>
            <p className="text-sm text-muted-foreground">
              {showAll ? 'Total Templates' : `${currentModule} Templates`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {filteredTemplates.filter(t => t.channel === 'Email').length}
            </div>
            <p className="text-sm text-muted-foreground">Email</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-600">
              {filteredTemplates.filter(t => t.channel === 'Letter').length}
            </div>
            <p className="text-sm text-muted-foreground">Physical Letters</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {filteredTemplates.filter(t => t.channel === 'SMS').length}
            </div>
            <p className="text-sm text-muted-foreground">SMS</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4">
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Channels</SelectItem>
                <SelectItem value="Email">Email</SelectItem>
                <SelectItem value="SMS">SMS</SelectItem>
                <SelectItem value="Push">Push Notification</SelectItem>
                <SelectItem value="Letter">Physical Letter</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Channel</TableHead>
              <TableHead>Template Name</TableHead>
              <TableHead className="w-32">Module</TableHead>
              <TableHead>Subject / Summary</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-48 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTemplates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No templates found
                </TableCell>
              </TableRow>
            ) : (
              filteredTemplates.map((template) => (
                <TableRow key={template.templateId}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getChannelIcon(template.channel)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{template.templateName}</div>
                    <div className="text-sm text-muted-foreground">{template.description}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{template.module}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {template.subject || template.bodyText.substring(0, 50) + '...'}
                  </TableCell>
                  <TableCell>
                    <Badge className={template.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {template.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        title="Preview"
                        onClick={() => handlePreview(template.templateId)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        title="Edit"
                        onClick={() => handleEdit(template.templateId)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        title="Duplicate"
                        onClick={() => handleDuplicate(template.templateId)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        title="Send Test"
                        onClick={() => handleSendTest(template.templateId)}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Dialogs */}
      <TemplateEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        templateId={selectedTemplate?.templateId}
        initialData={selectedTemplate}
        onSave={handleSaveTemplate}
      />
      <TemplatePreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        template={selectedTemplate}
      />
      <SendTestDialog
        open={sendTestOpen}
        onOpenChange={setSendTestOpen}
        template={selectedTemplate}
      />
    </div>
  );
}
