import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Loader2, Bell } from 'lucide-react';
import { useSystemSettingsContext } from '@/contexts/SystemSettingsContext';
import { useUpdateSystemSetting } from '@/hooks/useSystemSettings';
import { useUserCode } from '@/hooks/useUserCode';
import { toast } from 'sonner';

const POSITIONS = [
  { value: 'top-right', label: 'Top Right' },
  { value: 'top-left', label: 'Top Left' },
  { value: 'bottom-right', label: 'Bottom Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'top-center', label: 'Top Center' },
  { value: 'bottom-center', label: 'Bottom Center' },
];

const TOAST_TYPES = [
  { key: 'success', label: 'Success', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  { key: 'error', label: 'Error', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  { key: 'warning', label: 'Warning', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  { key: 'info', label: 'Info', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
];

const ToastConfigSection: React.FC = () => {
  const { getSetting, refetch } = useSystemSettingsContext();
  const updateSetting = useUpdateSystemSetting();
  const { userCode } = useUserCode();
  const [saving, setSaving] = useState<string | null>(null);

  // Local state for each type
  const [config, setConfig] = useState<Record<string, { position: string; duration: string }>>({});

  useEffect(() => {
    const c: Record<string, { position: string; duration: string }> = {};
    TOAST_TYPES.forEach(t => {
      c[t.key] = {
        position: getSetting(`toast_position_${t.key}`, 'top-right'),
        duration: getSetting(`toast_duration_${t.key}`, t.key === 'error' ? '6' : t.key === 'warning' ? '5' : '4'),
      };
    });
    setConfig(c);
  }, [getSetting]);

  const handleSave = async (typeKey: string) => {
    const cfg = config[typeKey];
    if (!cfg) return;
    setSaving(typeKey);
    try {
      await updateSetting.mutateAsync({
        settingKey: `toast_position_${typeKey}`,
        settingValue: cfg.position,
        userCode: userCode || undefined,
      });
      await updateSetting.mutateAsync({
        settingKey: `toast_duration_${typeKey}`,
        settingValue: cfg.duration,
        userCode: userCode || undefined,
      });
      refetch();
      toast.success(`${typeKey.charAt(0).toUpperCase() + typeKey.slice(1)} toast configuration saved`);
    } catch (err: any) {
      toast.error('Failed to save configuration', { description: err.message });
    } finally {
      setSaving(null);
    }
  };

  const handleTest = (typeKey: string) => {
    const cfg = config[typeKey];
    const durationMs = (parseInt(cfg?.duration || '4', 10) || 4) * 1000;
    const testMsg = `This is a test ${typeKey} toast message`;
    const toastFn = typeKey === 'error' ? toast.error : typeKey === 'warning' ? toast.warning : typeKey === 'info' ? toast.info : toast.success;
    toastFn(testMsg, { duration: durationMs });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4" />
          Toast Message Configuration
        </CardTitle>
        <CardDescription>
          Configure the position and duration for each type of toast notification across the application.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TOAST_TYPES.map(t => (
            <div key={t.key} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold px-2 py-1 rounded ${t.color}`}>
                  {t.label}
                </span>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => handleTest(t.key)}>
                  Test
                </Button>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Position</Label>
                <Select
                  value={config[t.key]?.position || 'top-right'}
                  onValueChange={(v) => setConfig(prev => ({ ...prev, [t.key]: { ...prev[t.key], position: v } }))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POSITIONS.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Duration (seconds)</Label>
                <Input
                  type="number"
                  min="1"
                  max="120"
                  className="h-8 text-xs"
                  value={config[t.key]?.duration || '4'}
                  onChange={(e) => setConfig(prev => ({ ...prev, [t.key]: { ...prev[t.key], duration: e.target.value } }))}
                />
              </div>

              <Button
                size="sm"
                className="w-full"
                disabled={saving === t.key}
                onClick={() => handleSave(t.key)}
              >
                {saving === t.key ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                Save {t.label}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ToastConfigSection;
