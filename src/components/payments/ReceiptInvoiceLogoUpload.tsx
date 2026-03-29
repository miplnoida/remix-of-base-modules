import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ImageIcon, Upload, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePaymentConfig, useUpdatePaymentConfig } from '@/hooks/usePaymentModuleConfig';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from 'sonner';
import { logAuditTrail } from '@/services/auditService';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
const MAX_SIZE_MB = 2;
const DEFAULT_LOGO = '/images/ssb-logo.png';

const ReceiptInvoiceLogoUpload: React.FC = () => {
  const { data: config, isLoading } = usePaymentConfig('receipt_invoice_logo_url');
  const updateConfig = useUpdatePaymentConfig();
  const { profile, user } = useSupabaseAuth();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const currentUrl = (typeof config?.config_value === 'string' ? config.config_value : DEFAULT_LOGO);

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
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('folder', 'logos');

      const { data: uploadData, error: invokeErr } = await supabase.functions.invoke('upload-app-asset', {
        body: uploadFormData,
      });
      if (invokeErr) throw invokeErr;
      if (!uploadData?.publicUrl) throw new Error('Upload did not return a public URL');
      const publicUrl = uploadData.publicUrl;

      const beforeUrl = currentUrl;

      await updateConfig.mutateAsync({ key: 'receipt_invoice_logo_url', value: publicUrl });

      await logAuditTrail({
        action: 'update',
        entityType: 'payment_module_config',
        entityId: 'receipt_invoice_logo_url',
        module: 'Payment Module Configuration',
        beforeValue: { logo_url: beforeUrl },
        afterValue: { logo_url: publicUrl },
        userCode: profile?.user_code || undefined,
        userId: user?.id,
        metadata: { route: '/cashier/payment-module-config', section: 'Receipt & Invoice Logo' },
      });

      toast.success('Receipt/Invoice logo updated');
    } catch (err: any) {
      toast.error('Failed to upload logo', { description: err.message });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleReset = async () => {
    try {
      await updateConfig.mutateAsync({ key: 'receipt_invoice_logo_url', value: DEFAULT_LOGO });
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
          Receipt & Invoice Logo
        </CardTitle>
        <CardDescription>
          Upload a logo for use in receipt and invoice templates. Use the <Badge variant="secondary" className="text-xs font-mono">{'{{logo_url}}'}</Badge> placeholder in your templates.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-6">
          <div className="flex-shrink-0 h-20 w-20 border rounded-lg flex items-center justify-center bg-muted/50 overflow-hidden">
            <img
              src={currentUrl}
              alt="Receipt/Invoice Logo"
              className="max-h-16 max-w-16 object-contain"
              onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_LOGO; }}
            />
          </div>
          <div className="space-y-2 flex-1">
            <Label className="text-xs text-muted-foreground">Current Logo URL</Label>
            <Input value={currentUrl} readOnly className="text-xs font-mono bg-muted" />
            <p className="text-xs text-muted-foreground">
              Use <code className="bg-muted px-1 py-0.5 rounded font-mono text-primary">{'{{logo_url}}'}</code> in receipt/invoice HTML templates to render this logo.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
            {uploading ? 'Uploading…' : 'Upload Logo'}
          </Button>
          <input ref={fileRef} type="file" accept=".png,.jpg,.jpeg,.svg,.webp" onChange={handleUpload} className="hidden" />
          {currentUrl !== DEFAULT_LOGO && (
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

export default ReceiptInvoiceLogoUpload;
