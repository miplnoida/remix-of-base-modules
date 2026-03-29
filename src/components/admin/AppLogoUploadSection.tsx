import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ImageIcon, Upload, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSystemSettingsContext } from '@/contexts/SystemSettingsContext';
import { useUpdateSystemSetting } from '@/hooks/useSystemSettings';
import { useUserCode } from '@/hooks/useUserCode';
import { toast } from 'sonner';
import { logAuditTrail } from '@/services/auditService';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
const MAX_SIZE_MB = 2;

const AppLogoUploadSection: React.FC = () => {
  const { getSetting, refetch } = useSystemSettingsContext();
  const updateSetting = useUpdateSystemSetting();
  const { userCode } = useUserCode();
  const currentLogoUrl = getSetting('app_logo_url', '/images/ssb-logo.png');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Invalid file type', { description: 'Allowed: PNG, JPG, SVG, WebP' });
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error('File too large', { description: `Maximum size is ${MAX_SIZE_MB} MB` });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const filePath = `logos/app-logo-${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('app-assets')
        .upload(filePath, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('app-assets').getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;

      // Update system_settings directly (this key is not editable via normal form, so we use direct update)
      const { error: updateErr } = await supabase
        .from('system_settings')
        .update({
          setting_value: publicUrl,
          updated_at: new Date().toISOString(),
          updated_by: userCode || 'SYSTEM',
        })
        .eq('setting_key', 'app_logo_url');
      if (updateErr) throw updateErr;

      await logAuditTrail({
        action: 'update',
        entityType: 'system_setting',
        entityId: 'app_logo_url',
        module: 'Global Settings',
        beforeValue: { setting_value: currentLogoUrl },
        afterValue: { setting_value: publicUrl },
        userCode: userCode || 'SYSTEM',
        metadata: { route: '/admin/global-settings', section: 'Application Logo' },
      });

      // Invalidate and refetch so context updates immediately
      refetch();
      toast.success('Application logo updated successfully');
    } catch (err: any) {
      toast.error('Failed to upload logo', { description: err.message });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleReset = async () => {
    const defaultUrl = '/images/ssb-logo.png';
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({
          setting_value: defaultUrl,
          updated_at: new Date().toISOString(),
          updated_by: userCode || 'SYSTEM',
        })
        .eq('setting_key', 'app_logo_url');
      if (error) throw error;

      await logAuditTrail({
        action: 'update',
        entityType: 'system_setting',
        entityId: 'app_logo_url',
        module: 'Global Settings',
        beforeValue: { setting_value: currentLogoUrl },
        afterValue: { setting_value: defaultUrl },
        userCode: userCode || 'SYSTEM',
        metadata: { route: '/admin/global-settings', section: 'Application Logo', reason: 'Reset to default' },
      });

      refetch();
      toast.success('Logo reset to default');
    } catch (err: any) {
      toast.error('Failed to reset logo', { description: err.message });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ImageIcon className="h-4 w-4" />
          Application Logo
        </CardTitle>
        <CardDescription>
          Upload a custom logo that will appear in the sidebar and header. Accepted formats: PNG, JPG, SVG, WebP (max {MAX_SIZE_MB} MB).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-6">
          <div className="flex-shrink-0 h-20 w-20 border rounded-lg flex items-center justify-center bg-muted/50 overflow-hidden">
            <img
              src={currentLogoUrl}
              alt="Current App Logo"
              className="max-h-16 max-w-16 object-contain"
              onError={(e) => { (e.target as HTMLImageElement).src = '/images/ssb-logo.png'; }}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Current Logo URL</Label>
            <Input value={currentLogoUrl} readOnly className="text-xs font-mono bg-muted" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
            {uploading ? 'Uploading…' : 'Upload New Logo'}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".png,.jpg,.jpeg,.svg,.webp"
            onChange={handleUpload}
            className="hidden"
          />
          {currentLogoUrl !== '/images/ssb-logo.png' && (
            <Button variant="ghost" size="sm" onClick={handleReset}>
              <Trash2 className="h-4 w-4 mr-1" />
              Reset to Default
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AppLogoUploadSection;
