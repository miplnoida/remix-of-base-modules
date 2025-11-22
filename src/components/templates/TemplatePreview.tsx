import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Mail, MessageSquare, Bell, FileText } from "lucide-react";
import { NotificationChannel } from "@/types/notification";

interface TemplatePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: any;
}

const getChannelIcon = (channel: NotificationChannel) => {
  switch (channel) {
    case 'Email': return <Mail className="h-4 w-4" />;
    case 'SMS': return <MessageSquare className="h-4 w-4" />;
    case 'Push': return <Bell className="h-4 w-4" />;
    case 'Letter': return <FileText className="h-4 w-4" />;
    default: return <FileText className="h-4 w-4" />;
  }
};

const renderPreviewWithSampleData = (text: string) => {
  const sampleData: Record<string, string> = {
    '{{EMPLOYER_NAME}}': 'ABC Construction Ltd.',
    '{{EMPLOYER_ID}}': 'EMP-12345',
    '{{INSURED_NAME}}': 'John Michael Smith',
    '{{SSN}}': '123-456-789',
    '{{AMOUNT}}': 'XCD 2,500.00',
    '{{DUE_DATE}}': 'January 31, 2025',
    '{{PERIOD}}': 'December 2024',
    '{{CASE_NUMBER}}': 'CASE-2024-001',
    '{{PENALTY_AMOUNT}}': 'XCD 125.00',
    '{{ARREARS_AMOUNT}}': 'XCD 15,000.00',
    '{{INSPECTOR_NAME}}': 'Inspector Jane Doe',
    '{{VISIT_DATE}}': 'January 15, 2025',
    '{{BENEFIT_TYPE}}': 'Sickness Benefit',
    '{{CLAIM_NUMBER}}': 'CLM-2024-567',
    '{{PAYMENT_DATE}}': 'January 20, 2025',
    '{{PHONE}}': '(869) 465-2333',
    '{{EMAIL}}': 'info@socialsecurity.kn',
    '{{ADDRESS}}': 'Bay Road, Basseterre, St. Kitts',
    '{{TODAY}}': new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    '{{SIGNATURE}}': '\n\n_________________________\nAuthorized Officer\nSocial Security Board',
  };

  let preview = text;
  Object.entries(sampleData).forEach(([key, value]) => {
    preview = preview.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
  });
  
  return preview;
};

export default function TemplatePreview({ open, onOpenChange, template }: TemplatePreviewProps) {
  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {getChannelIcon(template.channel)}
            Preview: {template.templateName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Info */}
          <div className="flex gap-2">
            <Badge variant="outline">{template.module}</Badge>
            <Badge variant="outline">{template.channel}</Badge>
            <Badge className={template.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
              {template.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          {/* Preview Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="space-y-2">
                {template.subject && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Subject / Title:</p>
                    <p className="font-semibold">{renderPreviewWithSampleData(template.subject)}</p>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 p-4 rounded-md">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                  {renderPreviewWithSampleData(template.bodyText)}
                </pre>
              </div>

              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> This preview shows sample data. Actual messages will use real values from the system.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Template Description */}
          {template.description && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Usage Guidelines:</p>
              <p className="text-sm text-muted-foreground">{template.description}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
