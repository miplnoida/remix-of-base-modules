import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DocumentTemplate } from "@/types/audit";
import { useIAAnnualPlans, useIADepartments } from "@/hooks/useAuditData";
import { StandardModal } from "@/components/common/StandardModal";

interface TemplateCommunicationDialogProps {
  template: DocumentTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const mergePlaceholders = (template: string, data: any) => {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || match);
};

export const TemplateCommunicationDialog = ({
  template,
  open,
  onOpenChange,
}: TemplateCommunicationDialogProps) => {
  const { toast } = useToast();
  const { data: plans = [] } = useIAAnnualPlans();
  const { data: departments = [] } = useIADepartments();
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [selectedDeptId, setSelectedDeptId] = useState<string>("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [ccEmails, setCcEmails] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const selectedDept = departments.find((d: any) => d.id === selectedDeptId);

  const departmentHeadData = selectedDept ? {
    name: selectedDept.head || `${selectedDept.name} Head`,
    email: selectedDept.email || `head.${selectedDept.name?.toLowerCase().replace(/\s+/g, '.')}@socialsecurity.gov.kn`,
    phone: selectedDept.phone || "+1-869-465-2200",
    position: "Department Head"
  } : null;

  const handleDeptSelection = (deptId: string) => {
    setSelectedDeptId(deptId);
    const dept = departments.find((d: any) => d.id === deptId);
    const plan = plans.find((p: any) => p.id === selectedPlanId);
    
    if (dept && template) {
      const headData = {
        name: dept.head || `${dept.name} Head`,
        email: dept.email || `head.${dept.name?.toLowerCase().replace(/\s+/g, '.')}@socialsecurity.gov.kn`,
      };
      setRecipientEmail(headData.email);
      setSubject(template.name);
      
      const mergeData = {
        departmentName: dept.name,
        departmentHead: headData.name,
        auditPeriod: `${plan?.fiscal_year || new Date().getFullYear()}`,
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      };
      
      setMessage(mergePlaceholders(template.content, mergeData));
    }
  };

  const handleSend = () => {
    if (!recipientEmail || !subject || !message) {
      toast({ title: "Missing Information", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    toast({ title: "Communication Sent", description: `${template?.name} has been sent to ${recipientEmail}` });
    onOpenChange(false);
    setSelectedPlanId(""); setSelectedDeptId(""); setRecipientEmail(""); setCcEmails(""); setSubject(""); setMessage("");
  };

  return (
    <StandardModal open={open} onOpenChange={onOpenChange} title={`Generate Communication: ${template?.name || ''}`} mode="edit" size="5xl" onSave={handleSend} saveLabel="Send Communication">
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Audit Plan</Label>
            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
              <SelectTrigger><SelectValue placeholder="Select audit plan..." /></SelectTrigger>
              <SelectContent>
                {plans.map((plan: any) => (
                  <SelectItem key={plan.id} value={plan.id}>{plan.title} - FY {plan.fiscal_year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Department</Label>
            <Select value={selectedDeptId} onValueChange={handleDeptSelection}>
              <SelectTrigger><SelectValue placeholder="Select department..." /></SelectTrigger>
              <SelectContent>
                {departments.map((dept: any) => (
                  <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {departmentHeadData && selectedDept && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" />Department Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs text-muted-foreground">Department Name</Label><p className="font-medium">{selectedDept.name}</p></div>
                <div><Label className="text-xs text-muted-foreground">Department Head</Label><p className="font-medium">{departmentHeadData.name}</p></div>
              </div>
              <div className="border-t pt-3 mt-3">
                <div className="flex items-center gap-2 mb-2"><User className="h-4 w-4" /><Label className="text-sm font-semibold">Department Head Details</Label></div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div><Label className="text-xs text-muted-foreground">Name</Label><p>{departmentHeadData.name}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Email</Label><p>{departmentHeadData.email}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Phone</Label><p>{departmentHeadData.phone}</p></div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <div className="space-y-2"><Label>To (Recipient Email) *</Label><Input type="email" placeholder="recipient@example.com" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} /></div>
          <div className="space-y-2"><Label>CC (Additional Recipients)</Label><Input type="email" placeholder="cc1@example.com, cc2@example.com" value={ccEmails} onChange={(e) => setCcEmails(e.target.value)} /></div>
          <div className="space-y-2"><Label>Subject *</Label><Input placeholder="Email subject" value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
          <div className="space-y-2"><Label>Message Content *</Label><Textarea placeholder="Email message" value={message} onChange={(e) => setMessage(e.target.value)} rows={12} className="font-mono text-sm" /></div>
        </div>
      </div>
    </StandardModal>
  );
};
