import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Save, Loader2, Eye, Receipt, GripVertical } from 'lucide-react';
import { usePaymentConfig, useUpdatePaymentConfig } from '@/hooks/usePaymentModuleConfig';
import { toast } from 'sonner';

interface BodySection {
  key: string;
  label: string;
  enabled: boolean;
}

interface ReceiptTemplate {
  header: { org_name: string; show_org_name: boolean };
  body_sections: BodySection[];
  footer: { disclaimer: string; show_disclaimer: boolean };
  print_settings: { paper_width_mm: number; font_size_pt: number; font_family: string };
}

const SECTION_DESCRIPTIONS: Record<string, string> = {
  status_line: 'Receipt status (Original / Reprint / Cancelled)',
  cashier_line: 'Name of cashier who received payment',
  received_from: 'Payer name (employer or insured person)',
  payer_address: 'Payer mailing address lines',
  ssn_line: 'SSN / Registration number of the payer',
  date_line: 'Date payment was received',
  receipt_number: 'System-generated receipt number',
  total_amount: 'Total sum of the payment',
  fund_table: 'Table of funds (Social Security, Levy, etc.) and amounts',
  mop_table: 'Table of payment methods (Cash, Cheque, etc.) and amounts',
};

const PLACEHOLDER_LIST = [
  { placeholder: '{{status}}', description: 'Receipt status (Original/Reprint/Cancelled)' },
  { placeholder: '{{cashier_name}}', description: 'Full name of cashier' },
  { placeholder: '{{payer_name}}', description: 'Payer / company name' },
  { placeholder: '{{payer_address}}', description: 'Payer mailing address' },
  { placeholder: '{{payer_ssn}}', description: 'SSN or registration number' },
  { placeholder: '{{date_received}}', description: 'Date in dd-MMM-yyyy format' },
  { placeholder: '{{receipt_number}}', description: 'Receipt # (payer_id/receipt_id/timestamp)' },
  { placeholder: '{{receipt_total}}', description: 'Total payment amount' },
  { placeholder: '{{fund_table}}', description: 'Fund breakdown table (auto-generated)' },
  { placeholder: '{{mop_table}}', description: 'Method of payment table (auto-generated)' },
];

const ReceiptTemplateTab: React.FC = () => {
  const { data: config, isLoading } = usePaymentConfig('receipt_template');
  const updateConfig = useUpdatePaymentConfig();

  const [template, setTemplate] = useState<ReceiptTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (config?.config_value) {
      setTemplate(config.config_value as unknown as ReceiptTemplate);
    }
  }, [config]);

  const handleSave = useCallback(async () => {
    if (!template) return;
    await updateConfig.mutateAsync({ key: 'receipt_template', value: template });
  }, [template, updateConfig]);

  const updateHeader = (field: string, value: any) => {
    setTemplate(prev => prev ? { ...prev, header: { ...prev.header, [field]: value } } : prev);
  };

  const updateFooter = (field: string, value: any) => {
    setTemplate(prev => prev ? { ...prev, footer: { ...prev.footer, [field]: value } } : prev);
  };

  const updatePrintSetting = (field: string, value: any) => {
    setTemplate(prev => prev ? { ...prev, print_settings: { ...prev.print_settings, [field]: value } } : prev);
  };

  const toggleSection = (key: string) => {
    setTemplate(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        body_sections: prev.body_sections.map(s =>
          s.key === key ? { ...s, enabled: !s.enabled } : s
        ),
      };
    });
  };

  const updateSectionLabel = (key: string, label: string) => {
    setTemplate(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        body_sections: prev.body_sections.map(s =>
          s.key === key ? { ...s, label } : s
        ),
      };
    });
  };

  if (isLoading || !template) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="h-4 w-4" />
            Receipt Header
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Organization name and branding shown at the top of the receipt.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              checked={template.header.show_org_name}
              onCheckedChange={(v) => updateHeader('show_org_name', v)}
            />
            <Label>Show organization name</Label>
          </div>
          {template.header.show_org_name && (
            <div className="space-y-1">
              <Label className="text-xs">Organization Name (use line breaks for multi-line)</Label>
              <Textarea
                value={template.header.org_name.replace(/\\n/g, '\n')}
                onChange={(e) => updateHeader('org_name', e.target.value)}
                rows={3}
                className="font-mono text-sm"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Body Sections Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Receipt Body Sections</CardTitle>
          <p className="text-xs text-muted-foreground">
            Enable/disable and customize labels for each section of the receipt. Sections appear in the order shown.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {template.body_sections.map((section) => (
              <div
                key={section.key}
                className="flex items-center gap-4 p-3 rounded-lg border bg-card"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <Switch
                  checked={section.enabled}
                  onCheckedChange={() => toggleSection(section.key)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Input
                      value={section.label}
                      onChange={(e) => updateSectionLabel(section.key, e.target.value)}
                      className="h-8 text-sm max-w-[200px]"
                      placeholder="Label..."
                    />
                    <Badge variant="outline" className="text-xs whitespace-nowrap shrink-0">
                      {section.key}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {SECTION_DESCRIPTIONS[section.key] || ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Footer Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Receipt Footer / Disclaimer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              checked={template.footer.show_disclaimer}
              onCheckedChange={(v) => updateFooter('show_disclaimer', v)}
            />
            <Label>Show disclaimer text</Label>
          </div>
          {template.footer.show_disclaimer && (
            <div className="space-y-1">
              <Label className="text-xs">Disclaimer Text</Label>
              <Textarea
                value={template.footer.disclaimer.replace(/\\n/g, '\n')}
                onChange={(e) => updateFooter('disclaimer', e.target.value)}
                rows={4}
                className="text-sm"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Print Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Print Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Paper Width (mm)</Label>
              <Input
                type="number"
                value={template.print_settings.paper_width_mm}
                onChange={(e) => updatePrintSetting('paper_width_mm', Number(e.target.value))}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Font Size (pt)</Label>
              <Input
                type="number"
                value={template.print_settings.font_size_pt}
                onChange={(e) => updatePrintSetting('font_size_pt', Number(e.target.value))}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Font Family</Label>
              <Input
                value={template.print_settings.font_family}
                onChange={(e) => updatePrintSetting('font_family', e.target.value)}
                className="h-8"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Placeholders Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Available Placeholders</CardTitle>
          <p className="text-xs text-muted-foreground">
            These dynamic values are automatically resolved from payment data when printing.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {PLACEHOLDER_LIST.map((p) => (
              <div key={p.placeholder} className="flex items-start gap-2 text-xs p-2 bg-muted/50 rounded">
                <code className="font-mono text-primary whitespace-nowrap">{p.placeholder}</code>
                <span className="text-muted-foreground">{p.description}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-2">
        <Button size="sm" onClick={handleSave} disabled={updateConfig.isPending}>
          {updateConfig.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          Save Receipt Template
        </Button>
      </div>
    </div>
  );
};

export default ReceiptTemplateTab;
