import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Plus, 
  Edit2, 
  Settings, 
  ArrowUp, 
  ArrowDown, 
  Mail, 
  MessageSquare, 
  Bell,
  Smartphone,
  Search
} from 'lucide-react';
import { notificationService } from '@/services/notificationService';
import type { ActionMapping, NotificationTemplate, NotificationChannel } from '@/types/notifications';
import { useToast } from '@/hooks/use-toast';

export default function ActionMapping() {
  const [mappings, setMappings] = useState<ActionMapping[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEventType, setSelectedEventType] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<ActionMapping | null>(null);
  const [formData, setFormData] = useState({
    eventName: '',
    eventType: 'User Signup' as ActionMapping['eventType'],
    templateId: '',
    channels: [] as NotificationChannel[],
    priority: 'Medium' as ActionMapping['priority'],
    isEnabled: true
  });
  const { toast } = useToast();

  const eventTypes = ['User Signup', 'Payment Success', 'Task Assigned', 'Reminder', 'System Alert'];
  const channelTypes = ['Email', 'SMS', 'Push', 'Web In-app', 'Mobile In-app'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [mappingsData, templatesData] = await Promise.all([
        notificationService.getActionMappings(),
        notificationService.getTemplates()
      ]);
      setMappings(mappingsData);
      setTemplates(templatesData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMapping = async () => {
    try {
      const selectedTemplate = templates.find(t => t.id === formData.templateId);
      if (!selectedTemplate) return;

      const newMapping = await notificationService.createActionMapping({
        ...formData,
        templateName: selectedTemplate.name,
        fallbackRules: generateFallbackRules(formData.channels)
      });
      
      setMappings([...mappings, newMapping]);
      setIsCreateModalOpen(false);
      resetForm();
      
      toast({
        title: "Success",
        description: "Action mapping created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create action mapping",
        variant: "destructive",
      });
    }
  };

  const handleEditMapping = async () => {
    if (!selectedMapping) return;
    
    try {
      const selectedTemplate = templates.find(t => t.id === formData.templateId);
      if (!selectedTemplate) return;

      const updatedMapping = await notificationService.updateActionMapping(selectedMapping.id, {
        ...formData,
        templateName: selectedTemplate.name,
        fallbackRules: generateFallbackRules(formData.channels)
      });
      
      setMappings(mappings.map(m => m.id === selectedMapping.id ? updatedMapping : m));
      setIsEditModalOpen(false);
      setSelectedMapping(null);
      resetForm();
      
      toast({
        title: "Success",
        description: "Action mapping updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update action mapping",
        variant: "destructive",
      });
    }
  };

  const toggleMappingStatus = async (mapping: ActionMapping) => {
    try {
      const updatedMapping = await notificationService.updateActionMapping(mapping.id, {
        isEnabled: !mapping.isEnabled
      });
      
      setMappings(mappings.map(m => m.id === mapping.id ? updatedMapping : m));
      
      toast({
        title: "Success",
        description: `Mapping ${updatedMapping.isEnabled ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update mapping status",
        variant: "destructive",
      });
    }
  };

  const generateFallbackRules = (channels: NotificationChannel[]): string[] => {
    const enabledChannels = channels.filter(c => c.isEnabled).sort((a, b) => a.priority - b.priority);
    const rules: string[] = [];
    
    for (let i = 0; i < enabledChannels.length - 1; i++) {
      rules.push(`${enabledChannels[i + 1].type} if ${enabledChannels[i].type} fails`);
    }
    
    return rules;
  };

  const openEditModal = (mapping: ActionMapping) => {
    setSelectedMapping(mapping);
    setFormData({
      eventName: mapping.eventName,
      eventType: mapping.eventType,
      templateId: mapping.templateId,
      channels: mapping.channels,
      priority: mapping.priority,
      isEnabled: mapping.isEnabled
    });
    setIsEditModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      eventName: '',
      eventType: 'User Signup',
      templateId: '',
      channels: [],
      priority: 'Medium',
      isEnabled: true
    });
  };

  const addChannel = (type: string) => {
    const maxPriority = Math.max(0, ...formData.channels.map(c => c.priority));
    const newChannel: NotificationChannel = {
      type: type as any,
      priority: maxPriority + 1,
      isEnabled: true
    };
    setFormData({
      ...formData,
      channels: [...formData.channels, newChannel]
    });
  };

  const removeChannel = (index: number) => {
    const newChannels = formData.channels.filter((_, i) => i !== index);
    setFormData({ ...formData, channels: newChannels });
  };

  const updateChannelPriority = (index: number, direction: 'up' | 'down') => {
    const newChannels = [...formData.channels];
    const currentChannel = newChannels[index];
    
    if (direction === 'up' && currentChannel.priority > 1) {
      const swapChannel = newChannels.find(c => c.priority === currentChannel.priority - 1);
      if (swapChannel) {
        swapChannel.priority = currentChannel.priority;
        currentChannel.priority = currentChannel.priority - 1;
      }
    } else if (direction === 'down' && currentChannel.priority < newChannels.length) {
      const swapChannel = newChannels.find(c => c.priority === currentChannel.priority + 1);
      if (swapChannel) {
        swapChannel.priority = currentChannel.priority;
        currentChannel.priority = currentChannel.priority + 1;
      }
    }
    
    setFormData({ ...formData, channels: newChannels });
  };

  const toggleChannelEnabled = (index: number) => {
    const newChannels = [...formData.channels];
    newChannels[index].isEnabled = !newChannels[index].isEnabled;
    setFormData({ ...formData, channels: newChannels });
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'Email': return <Mail className="h-4 w-4" />;
      case 'SMS': return <MessageSquare className="h-4 w-4" />;
      case 'Push': return <Smartphone className="h-4 w-4" />;
      case 'Web In-app':
      case 'Mobile In-app': return <Bell className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const filteredMappings = mappings.filter(mapping => {
    const matchesSearch = mapping.eventName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         mapping.templateName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedEventType === 'all' || mapping.eventType === selectedEventType;
    return matchesSearch && matchesType;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading action mappings...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Action Mapping</h1>
        <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Mapping
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="search">Search Mappings</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by event name or template..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="event-filter">Event Type Filter</Label>
              <Select value={selectedEventType} onValueChange={setSelectedEventType}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  {eventTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mappings List */}
      <div className="space-y-4">
        {filteredMappings.map((mapping) => (
          <Card key={mapping.id} className="group hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{mapping.eventName}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">{mapping.eventType}</Badge>
                    <Badge variant={mapping.priority === 'High' ? 'destructive' : mapping.priority === 'Medium' ? 'default' : 'secondary'}>
                      {mapping.priority} Priority
                    </Badge>
                    <Badge variant={mapping.isEnabled ? 'default' : 'secondary'}>
                      {mapping.isEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Switch
                    checked={mapping.isEnabled}
                    onCheckedChange={() => toggleMappingStatus(mapping)}
                    aria-label="Toggle mapping"
                  />
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => openEditModal(mapping)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Template</div>
                  <div className="text-sm text-gray-600">{mapping.templateName}</div>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Notification Channels</div>
                  <div className="flex flex-wrap gap-2">
                    {mapping.channels
                      .sort((a, b) => a.priority - b.priority)
                      .map((channel, index) => (
                        <div key={index} className="flex items-center gap-1">
                          <Badge 
                            variant={channel.isEnabled ? "default" : "secondary"}
                            className="flex items-center gap-1"
                          >
                            {getChannelIcon(channel.type)}
                            {channel.type}
                            <span className="text-xs ml-1">#{channel.priority}</span>
                          </Badge>
                        </div>
                      ))}
                  </div>
                </div>

                {mapping.fallbackRules.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-1">Fallback Rules</div>
                    <div className="text-xs text-gray-500">
                      {mapping.fallbackRules.join(', ')}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredMappings.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No action mappings found</h3>
            <p className="text-gray-500 mb-4">Create your first action mapping to link events with notification templates.</p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Mapping
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={isCreateModalOpen || isEditModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
          setSelectedMapping(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isCreateModalOpen ? 'Create Action Mapping' : 'Edit Action Mapping'}
            </DialogTitle>
            <DialogDescription>
              {isCreateModalOpen 
                ? 'Map events to notification templates and configure delivery channels.'
                : 'Update the action mapping configuration.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="event-name">Event Name</Label>
                <Input
                  id="event-name"
                  value={formData.eventName}
                  onChange={(e) => setFormData({ ...formData, eventName: e.target.value })}
                  placeholder="e.g., User Welcome"
                />
              </div>
              <div>
                <Label htmlFor="event-type">Event Type</Label>
                <Select value={formData.eventType} onValueChange={(value: any) => setFormData({ ...formData, eventType: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="template">Template</Label>
                <Select value={formData.templateId} onValueChange={(value) => setFormData({ ...formData, templateId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.filter(t => t.isActive).map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} ({template.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(value: any) => setFormData({ ...formData, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Notification Channels</Label>
              <div className="mt-2 space-y-3">
                {formData.channels
                  .sort((a, b) => a.priority - b.priority)
                  .map((channel, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="flex items-center gap-2 flex-1">
                        {getChannelIcon(channel.type)}
                        <span className="font-medium">{channel.type}</span>
                        <Badge variant="outline">Priority #{channel.priority}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={channel.isEnabled}
                          onCheckedChange={() => toggleChannelEnabled(index)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateChannelPriority(index, 'up')}
                          disabled={channel.priority === 1}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateChannelPriority(index, 'down')}
                          disabled={channel.priority === formData.channels.length}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeChannel(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  ))}
                
                <div>
                  <Label className="text-sm">Add Channel</Label>
                  <div className="flex gap-2 mt-1">
                    {channelTypes
                      .filter(type => !formData.channels.some(c => c.type === type))
                      .map(type => (
                        <Button
                          key={type}
                          variant="outline"
                          size="sm"
                          onClick={() => addChannel(type)}
                          className="flex items-center gap-1"
                        >
                          {getChannelIcon(type)}
                          {type}
                        </Button>
                      ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="mapping-enabled"
                checked={formData.isEnabled}
                onCheckedChange={(checked) => setFormData({ ...formData, isEnabled: checked })}
              />
              <Label htmlFor="mapping-enabled">Enabled</Label>
            </div>

            {formData.channels.length > 1 && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Generated Fallback Rules:</h4>
                <div className="text-xs text-gray-600">
                  {generateFallbackRules(formData.channels).map((rule, index) => (
                    <div key={index}>• {rule}</div>
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
                setSelectedMapping(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={isCreateModalOpen ? handleCreateMapping : handleEditMapping}
              disabled={!formData.eventName || !formData.templateId || formData.channels.length === 0}
            >
              {isCreateModalOpen ? 'Create Mapping' : 'Update Mapping'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}