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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Clock, 
  Calendar, 
  Send, 
  Pause, 
  Play, 
  Settings, 
  RefreshCw,
  Users,
  Timer,
  Zap,
  Plus
} from 'lucide-react';
import { notificationService } from '@/services/notificationService';
import { DeliverySettings } from '@/types/notifications';
import { useToast } from '@/hooks/use-toast';

export default function DeliveryManagement() {
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSetting, setSelectedSetting] = useState<DeliverySettings | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    scheduleType: 'Immediate' as DeliverySettings['scheduleType'],
    delay: 0,
    scheduledTime: '',
    retryAttempts: 3,
    batchSize: 100,
    isActive: true
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchDeliverySettings();
  }, []);

  const fetchDeliverySettings = async () => {
    try {
      const data = await notificationService.getDeliverySettings();
      setDeliverySettings(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch delivery settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSetting = async () => {
    try {
      const newSetting: DeliverySettings = {
        id: Date.now().toString(),
        ...formData
      };
      
      setDeliverySettings([...deliverySettings, newSetting]);
      setIsCreateModalOpen(false);
      resetForm();
      
      toast({
        title: "Success",
        description: "Delivery setting created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create delivery setting",
        variant: "destructive",
      });
    }
  };

  const handleEditSetting = async () => {
    if (!selectedSetting) return;
    
    try {
      const updatedSetting = await notificationService.updateDeliverySettings(selectedSetting.id, formData);
      
      setDeliverySettings(deliverySettings.map(s => s.id === selectedSetting.id ? updatedSetting : s));
      setIsEditModalOpen(false);
      setSelectedSetting(null);
      resetForm();
      
      toast({
        title: "Success",
        description: "Delivery setting updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update delivery setting",
        variant: "destructive",
      });
    }
  };

  const toggleSettingStatus = async (setting: DeliverySettings) => {
    try {
      const updatedSetting = await notificationService.updateDeliverySettings(setting.id, {
        isActive: !setting.isActive
      });
      
      setDeliverySettings(deliverySettings.map(s => s.id === setting.id ? updatedSetting : s));
      
      toast({
        title: "Success",
        description: `Setting ${updatedSetting.isActive ? 'activated' : 'deactivated'}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update setting status",
        variant: "destructive",
      });
    }
  };

  const openEditModal = (setting: DeliverySettings) => {
    setSelectedSetting(setting);
    setFormData({
      name: setting.name,
      scheduleType: setting.scheduleType,
      delay: setting.delay || 0,
      scheduledTime: setting.scheduledTime || '',
      retryAttempts: setting.retryAttempts,
      batchSize: setting.batchSize,
      isActive: setting.isActive
    });
    setIsEditModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      scheduleType: 'Immediate',
      delay: 0,
      scheduledTime: '',
      retryAttempts: 3,
      batchSize: 100,
      isActive: true
    });
  };

  const getScheduleIcon = (type: string) => {
    switch (type) {
      case 'Immediate': return <Zap className="h-4 w-4" />;
      case 'Scheduled': return <Calendar className="h-4 w-4" />;
      case 'Delayed': return <Timer className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getScheduleColor = (type: string) => {
    switch (type) {
      case 'Immediate': return 'bg-green-100 text-green-800';
      case 'Scheduled': return 'bg-blue-100 text-blue-800';
      case 'Delayed': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading delivery settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Delivery Management</h1>
        <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Setting
        </Button>
      </div>

      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="settings">Delivery Settings</TabsTrigger>
          <TabsTrigger value="queue">Queue Management</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          {/* Delivery Settings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {deliverySettings.map((setting) => (
              <Card key={setting.id} className="group hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {getScheduleIcon(setting.scheduleType)}
                      {setting.name}
                    </CardTitle>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Switch
                        checked={setting.isActive}
                        onCheckedChange={() => toggleSettingStatus(setting)}
                      />
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => openEditModal(setting)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={setting.isActive ? "default" : "secondary"}>
                      {setting.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge className={getScheduleColor(setting.scheduleType)}>
                      {setting.scheduleType}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {setting.scheduleType === 'Delayed' && setting.delay && (
                      <div>
                        <div className="text-gray-500">Delay</div>
                        <div className="font-medium">{setting.delay} min</div>
                      </div>
                    )}
                    {setting.scheduleType === 'Scheduled' && setting.scheduledTime && (
                      <div>
                        <div className="text-gray-500">Time</div>
                        <div className="font-medium">{setting.scheduledTime}</div>
                      </div>
                    )}
                    <div>
                      <div className="text-gray-500">Retry Attempts</div>
                      <div className="font-medium">{setting.retryAttempts}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Batch Size</div>
                      <div className="font-medium">{setting.batchSize}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {deliverySettings.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No delivery settings found</h3>
                <p className="text-gray-500 mb-4">Create your first delivery setting to manage notification scheduling.</p>
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Setting
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="queue" className="space-y-6">
          {/* Queue Management */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  Pending
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-900">234</div>
                <p className="text-sm text-blue-600">Notifications waiting</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Send className="h-5 w-5 text-green-600" />
                  Processing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-900">12</div>
                <p className="text-sm text-green-600">Currently sending</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-orange-600" />
                  Retrying
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-900">8</div>
                <p className="text-sm text-orange-600">Failed attempts</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Pause className="h-5 w-5 text-gray-600" />
                  Paused
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">3</div>
                <p className="text-sm text-gray-600">On hold</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Queue Controls</CardTitle>
              <CardDescription>Manage notification queue processing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button className="flex items-center gap-2">
                  <Play className="h-4 w-4" />
                  Resume Queue
                </Button>
                <Button variant="outline" className="flex items-center gap-2">
                  <Pause className="h-4 w-4" />
                  Pause Queue
                </Button>
                <Button variant="outline" className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Retry Failed
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          {/* Monitoring Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Delivery Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Success Rate</span>
                  <span className="font-bold text-green-600">98.5%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '98.5%' }}></div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">Average Delivery Time</span>
                  <span className="font-bold">2.3 sec</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">Retry Rate</span>
                  <span className="font-bold text-orange-600">3.2%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-orange-500 h-2 rounded-full" style={{ width: '15%' }}></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Batch #1247 completed</p>
                    <p className="text-xs text-gray-500">500 emails sent successfully • 2 min ago</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">3 notifications failed</p>
                    <p className="text-xs text-gray-500">SMS delivery issues • 5 min ago</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Scheduled batch queued</p>
                    <p className="text-xs text-gray-500">Next run in 4 hours • 10 min ago</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Modal */}
      <Dialog open={isCreateModalOpen || isEditModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
          setSelectedSetting(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isCreateModalOpen ? 'Create Delivery Setting' : 'Edit Delivery Setting'}
            </DialogTitle>
            <DialogDescription>
              {isCreateModalOpen 
                ? 'Configure how and when notifications should be delivered.'
                : 'Update the delivery setting configuration.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="setting-name">Setting Name</Label>
              <Input
                id="setting-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter setting name"
              />
            </div>

            <div>
              <Label htmlFor="schedule-type">Schedule Type</Label>
              <Select value={formData.scheduleType} onValueChange={(value: any) => setFormData({ ...formData, scheduleType: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Immediate">Immediate</SelectItem>
                  <SelectItem value="Scheduled">Scheduled</SelectItem>
                  <SelectItem value="Delayed">Delayed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.scheduleType === 'Delayed' && (
              <div>
                <Label htmlFor="delay">Delay (minutes)</Label>
                <Input
                  id="delay"
                  type="number"
                  min="1"
                  value={formData.delay}
                  onChange={(e) => setFormData({ ...formData, delay: parseInt(e.target.value) || 0 })}
                  placeholder="Enter delay in minutes"
                />
              </div>
            )}

            {formData.scheduleType === 'Scheduled' && (
              <div>
                <Label htmlFor="scheduled-time">Scheduled Time</Label>
                <Input
                  id="scheduled-time"
                  type="time"
                  value={formData.scheduledTime}
                  onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="retry-attempts">Retry Attempts</Label>
                <Input
                  id="retry-attempts"
                  type="number"
                  min="0"
                  max="10"
                  value={formData.retryAttempts}
                  onChange={(e) => setFormData({ ...formData, retryAttempts: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="batch-size">Batch Size</Label>
                <Input
                  id="batch-size"
                  type="number"
                  min="1"
                  value={formData.batchSize}
                  onChange={(e) => setFormData({ ...formData, batchSize: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="setting-active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="setting-active">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsCreateModalOpen(false);
                setIsEditModalOpen(false);
                setSelectedSetting(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={isCreateModalOpen ? handleCreateSetting : handleEditSetting}
              disabled={!formData.name}
            >
              {isCreateModalOpen ? 'Create Setting' : 'Update Setting'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}