import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { NotificationChannel, SourceModule } from "@/types/notification";

interface TemplateEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId?: string;
  onSave: (template: any) => void;
  initialData?: any;
}

const AVAILABLE_PARAMETERS = [
  { name: "{{EMPLOYER_NAME}}", description: "Employer's company name" },
  { name: "{{EMPLOYER_ID}}", description: "Employer registration number" },
  { name: "{{INSURED_NAME}}", description: "Insured person's full name" },
  { name: "{{SSN}}", description: "Social Security Number" },
  { name: "{{AMOUNT}}", description: "Financial amount" },
  { name: "{{DUE_DATE}}", description: "Payment/submission due date" },
  { name: "{{PERIOD}}", description: "Contribution period" },
  { name: "{{CASE_NUMBER}}", description: "Case reference number" },
  { name: "{{PENALTY_AMOUNT}}", description: "Penalty amount" },
  { name: "{{ARREARS_AMOUNT}}", description: "Outstanding arrears" },
  { name: "{{INSPECTOR_NAME}}", description: "Inspector's name" },
  { name: "{{VISIT_DATE}}", description: "Inspection visit date" },
  { name: "{{BENEFIT_TYPE}}", description: "Type of benefit" },
  { name: "{{CLAIM_NUMBER}}", description: "Benefit claim number" },
  { name: "{{PAYMENT_DATE}}", description: "Payment processing date" },
  { name: "{{PHONE}}", description: "Contact phone number" },
  { name: "{{EMAIL}}", description: "Email address" },
  { name: "{{ADDRESS}}", description: "Physical address" },
  { name: "{{TODAY}}", description: "Current date" },
  { name: "{{SIGNATURE}}", description: "Officer signature block" },
];

export default function TemplateEditor({ open, onOpenChange, templateId, onSave, initialData }: TemplateEditorProps) {
  const [templateName, setTemplateName] = useState(initialData?.templateName || "");
  const [module, setModule] = useState<SourceModule>(initialData?.module || "System");
  const [channel, setChannel] = useState<NotificationChannel>(initialData?.channel || "Email");
  const [subject, setSubject] = useState(initialData?.subject || "");
  const [bodyText, setBodyText] = useState(initialData?.bodyText || "");
  const [description, setDescription] = useState(initialData?.description || "");

  const insertParameter = (param: string) => {
    const textarea = document.getElementById('template-body') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = bodyText;
      const before = text.substring(0, start);
      const after = text.substring(end);
      setBodyText(before + param + after);
      
      // Set cursor position after inserted parameter
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + param.length;
        textarea.focus();
      }, 0);
    } else {
      setBodyText(bodyText + param);
    }
  };

  const handleSave = () => {
    const template = {
      templateId: templateId || `TPL-${Date.now()}`,
      templateName,
      module,
      channel,
      subject,
      bodyText,
      description,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedBy: "Current User",
    };
    onSave(template);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{templateId ? "Edit Template" : "Create New Template"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-6">
          {/* Main Form - Left 2 columns */}
          <div className="col-span-2 space-y-4">
            <div className="space-y-2">
              <Label>Template Name *</Label>
              <Input
                placeholder="e.g., C3 Overdue Notice"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Module *</Label>
                <Select value={module} onValueChange={(value) => setModule(value as SourceModule)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Compliance">Compliance</SelectItem>
                    <SelectItem value="Benefits">Benefits</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="Legal">Legal</SelectItem>
                    <SelectItem value="InternalAudit">Internal Audit</SelectItem>
                    <SelectItem value="Employers">Employers</SelectItem>
                    <SelectItem value="InsuredPersons">Insured Persons</SelectItem>
                    <SelectItem value="Registration">Registration</SelectItem>
                    <SelectItem value="CRD">CRD</SelectItem>
                    <SelectItem value="System">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Channel *</Label>
                <Select value={channel} onValueChange={(value) => setChannel(value as NotificationChannel)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Email">Email</SelectItem>
                    <SelectItem value="SMS">SMS</SelectItem>
                    <SelectItem value="Push">Push Notification</SelectItem>
                    <SelectItem value="Letter">Physical Letter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(channel === 'Email' || channel === 'Letter') && (
              <div className="space-y-2">
                <Label>Subject / Title *</Label>
                <Input
                  placeholder="Subject line or letter title"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Message Body *</Label>
              <Textarea
                id="template-body"
                placeholder="Enter your template message here. Click parameters on the right to insert dynamic values."
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                rows={12}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Use the parameter buttons on the right to insert dynamic values into your template.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Brief description of when this template should be used"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          {/* Parameter Panel - Right column */}
          <div className="space-y-4 border-l pl-4">
            <div>
              <h4 className="font-semibold mb-2 text-sm">Available Parameters</h4>
              <p className="text-xs text-muted-foreground mb-4">
                Click to insert into template body
              </p>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {AVAILABLE_PARAMETERS.map((param) => (
                <div key={param.name} className="space-y-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs font-mono"
                    onClick={() => insertParameter(param.name)}
                  >
                    {param.name}
                  </Button>
                  <p className="text-xs text-muted-foreground pl-2">{param.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!templateName || !bodyText}>
            {templateId ? "Save Changes" : "Create Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
