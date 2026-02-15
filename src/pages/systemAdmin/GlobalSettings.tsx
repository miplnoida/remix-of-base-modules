import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import CloudflareSettingsSection from '@/components/admin/CloudflareSettingsSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Settings, Save, RefreshCw, Clock, User, Info, Calendar, Eye, Globe } from 'lucide-react';
import { useSystemSettings, useUpdateSystemSetting, SystemSetting } from '@/hooks/useSystemSettings';
import { useUserCode } from '@/hooks/useUserCode';
import { formatDisplayDate } from '@/lib/dateFormat';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

const GlobalSettings = () => {
  const { data: settings = [], isLoading, refetch } = useSystemSettings();
  const updateSetting = useUpdateSystemSetting();
  const { userCode } = useUserCode();
  
  const [editingSetting, setEditingSetting] = useState<SystemSetting | null>(null);
  const [editValue, setEditValue] = useState('');
  const [previewDate] = useState(new Date());
  
  // Group settings by category
  const groupedSettings = React.useMemo(() => {
    const groups: Record<string, SystemSetting[]> = {};
    settings.forEach(setting => {
      const category = setting.category || 'General';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(setting);
    });
    return groups;
  }, [settings]);
  
  const categories = Object.keys(groupedSettings).sort();
  
  const handleEdit = (setting: SystemSetting) => {
    setEditingSetting(setting);
    setEditValue(setting.setting_value);
  };
  
  const handleSave = async () => {
    if (!editingSetting) return;
    
    await updateSetting.mutateAsync({
      settingKey: editingSetting.setting_key,
      settingValue: editValue,
      userCode: userCode || undefined
    });
    
    setEditingSetting(null);
    setEditValue('');
  };
  
  // Format a date using a specific format string for preview
  const formatWithCustomFormat = (date: Date, formatStr: string): string => {
    try {
      return format(date, formatStr);
    } catch {
      return date.toLocaleDateString();
    }
  };
  
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const renderSettingInput = (setting: SystemSetting, value: string, onChange: (val: string) => void, showPreview = false) => {
    const allowedValues = setting.allowed_values as { value: string; label: string }[] | null;

    // Special checkbox UI for non_working_days
    if (setting.setting_key === 'non_working_days') {
      const selectedDays = value.split(',').map(d => d.trim()).filter(Boolean);
      const toggleDay = (dayVal: string) => {
        const newDays = selectedDays.includes(dayVal)
          ? selectedDays.filter(d => d !== dayVal)
          : [...selectedDays, dayVal].sort((a, b) => Number(a) - Number(b));
        onChange(newDays.join(','));
      };
      return (
        <div className="space-y-2">
          {DAY_NAMES.map((name, idx) => {
            const val = String(idx);
            return (
              <div key={val} className="flex items-center gap-2.5">
                <Checkbox
                  id={`nwd-${val}`}
                  checked={selectedDays.includes(val)}
                  onCheckedChange={() => toggleDay(val)}
                />
                <Label htmlFor={`nwd-${val}`} className="text-sm cursor-pointer">{name}</Label>
              </div>
            );
          })}
        </div>
      );
    }
    
    switch (setting.setting_type) {
      case 'select':
        return (
          <div className="space-y-3">
            <Select value={value} onValueChange={onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a value" />
              </SelectTrigger>
              <SelectContent>
                {allowedValues?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {showPreview && setting.setting_key === 'display_date_format' && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Preview:</span>
                <span className="font-mono font-medium">
                  {formatWithCustomFormat(previewDate, value)}
                </span>
              </div>
            )}
          </div>
        );
        
      case 'boolean':
        return (
          <Switch
            checked={value === 'true'}
            onCheckedChange={(checked) => onChange(checked ? 'true' : 'false')}
          />
        );
        
      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        );
        
      case 'json':
        return (
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="font-mono text-sm"
            rows={6}
          />
        );
        
      default:
        return (
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        );
    }
  };
  
  const renderSettingValue = (setting: SystemSetting) => {
    const allowedValues = setting.allowed_values as { value: string; label: string }[] | null;

    // Show day names for non_working_days
    if (setting.setting_key === 'non_working_days') {
      const days = setting.setting_value.split(',').map(d => d.trim()).filter(Boolean);
      if (days.length === 0) return 'None';
      return days.map(d => DAY_NAMES[Number(d)] || d).join(', ');
    }
    
    if (setting.setting_type === 'select' && allowedValues) {
      const option = allowedValues.find(o => o.value === setting.setting_value);
      return option?.label || setting.setting_value;
    }
    
    if (setting.setting_type === 'boolean') {
      return setting.setting_value === 'true' ? (
        <Badge variant="default" className="bg-green-500">Yes</Badge>
      ) : (
        <Badge variant="secondary">No</Badge>
      );
    }
    
    return setting.setting_value;
  };
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Globe className="h-8 w-8" />
              Global Settings
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage application-wide configuration settings that apply across all screens
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        
        {/* Cloudflare Human Verification Section - always shown */}
        <CloudflareSettingsSection />

        {categories.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Other Settings Configured</h3>
              <p className="text-muted-foreground">Additional system settings will appear here once configured.</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue={categories[0] || 'General'} className="w-full">
            <TabsList className="w-full justify-start flex-wrap h-auto gap-1 p-1">
              {categories.map(category => (
                <TabsTrigger key={category} value={category} className="px-4">
                  {category}
                  <Badge variant="secondary" className="ml-2">
                    {groupedSettings[category].length}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
            
            {categories.map(category => (
              <TabsContent key={category} value={category} className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>{category} Settings</CardTitle>
                    <CardDescription>
                      Configure {category.toLowerCase()} related settings for the application
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[300px]">Setting</TableHead>
                          <TableHead>Current Value</TableHead>
                          <TableHead className="w-[150px]">Last Updated</TableHead>
                          <TableHead className="w-[120px]">Updated By</TableHead>
                          <TableHead className="w-[100px] text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groupedSettings[category].map(setting => (
                          <TableRow key={setting.id}>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium">{setting.display_name}</div>
                                {setting.description && (
                                  <div className="text-xs text-muted-foreground flex items-start gap-1">
                                    <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                    <span className="line-clamp-2">{setting.description}</span>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {setting.setting_key === 'display_date_format' && (
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                )}
                                <span className="font-mono text-sm">
                                  {renderSettingValue(setting)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {formatDisplayDate(setting.updated_at)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <User className="h-3 w-3 text-muted-foreground" />
                                {setting.updated_by || 'System'}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {setting.is_editable ? (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleEdit(setting)}
                                >
                                  Edit
                                </Button>
                              ) : (
                                <Badge variant="secondary">Locked</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        )}
        
        {/* Edit Dialog */}
        <Dialog open={!!editingSetting} onOpenChange={() => setEditingSetting(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Setting</DialogTitle>
              <DialogDescription>
                {editingSetting?.description}
              </DialogDescription>
            </DialogHeader>
            
            {editingSetting && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>{editingSetting.display_name}</Label>
                  {renderSettingInput(editingSetting, editValue, setEditValue, true)}
                </div>
                
                <div className="text-xs text-muted-foreground border-t pt-3 space-y-1">
                  <p><strong>Setting Key:</strong> <code className="bg-muted px-1 rounded">{editingSetting.setting_key}</code></p>
                  <p><strong>Type:</strong> {editingSetting.setting_type}</p>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingSetting(null)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={updateSetting.isPending}
              >
                {updateSetting.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  );
};

export default GlobalSettings;
