import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Mail, User, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DocumentTemplate } from "@/types/audit";
import { auditPlans } from "@/data/auditData";
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
  const [selectedAuditId, setSelectedAuditId] = useState<string>("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [ccEmails, setCcEmails] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const selectedAudit = auditPlans.find(plan => plan.id === selectedAuditId);
  const selectedDepartment = selectedAudit?.departments[0];

  const departmentHeadData = selectedDepartment ? {
    name: `${selectedDepartment.departmentName} Head`,
    email: `head.${selectedDepartment.departmentName.toLowerCase().replace(/\s+/g, '.')}@socialsecurity.gov.kn`,
    phone: "+1-869-465-2200",
    position: "Department Head"
  } : null;

  const handleAuditSelection = (auditId: string) => {
    setSelectedAuditId(auditId);
    const audit = auditPlans.find(plan => plan.id === auditId);
    const dept = audit?.departments[0];
    
    if (dept && departmentHeadData && template) {
      setRecipientEmail(departmentHeadData.email);
      setSubject(template.name);
      
      const mergeData = {
        departmentName: dept.departmentName,
        departmentHead: departmentHeadData.name,
        auditPeriod: `${audit?.fiscalYear || new Date().getFullYear()}`,
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      };
      
      setMessage(mergePlaceholders(template.content, mergeData));
    }
  };

  const handleSend = () => {
    if (!recipientEmail || !subject || !message) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Communication Sent",
      description: `${template?.name} has been sent to ${recipientEmail}`,
    });
    
    onOpenChange(false);
    setSelectedAuditId("");
    setRecipientEmail("");
    setCcEmails("");
    setSubject("");
    setMessage("");
  };

  return (
    <StandardModal
      open={open}
      onOpenChange={onOpenChange}
      title={`Generate Communication: ${template?.name || ''}`}
      mode="edit"
      size="5xl"
      onSave={handleSend}
      saveLabel="Send Communication"
    >
      <div className="space-y-6">
        {/* Audit Selection */}
        <div className="space-y-2">
          <Label>Select Audit/Department</Label>
          <Select value={selectedAuditId} onValueChange={handleAuditSelection}>
            <SelectTrigger>
              <SelectValue placeholder="Select an audit..." />
            </SelectTrigger>
            <SelectContent>
              {auditPlans.map((plan) => (
                plan.departments.map((dept) => (
                  <SelectItem key={`${plan.id}-${dept.departmentName}`} value={plan.id}>
                    {dept.departmentName} - FY {plan.fiscalYear}
                  </SelectItem>
                ))
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Department Head Information */}
        {departmentHeadData && selectedDepartment && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Department Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Department Name</Label>
                  <p className="font-medium">{selectedDepartment.departmentName}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Audit Lead</Label>
                  <p className="font-medium">{selectedDepartment.auditLead}</p>
                </div>
              </div>
              
              <div className="border-t pt-3 mt-3">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4" />
                  <Label className="text-sm font-semibold">Department Head Details</Label>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div><Label className="text-xs text-muted-foreground">Name</Label><p>{departmentHeadData.name}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Email</Label><p>{departmentHeadData.email}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Phone</Label><p>{departmentHeadData.phone}</p></div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Email Details */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>To (Recipient Email) *</Label>
            <Input type="email" placeholder="recipient@example.com" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>CC (Additional Recipients)</Label>
            <Input type="email" placeholder="cc1@example.com, cc2@example.com" value={ccEmails} onChange={(e) => setCcEmails(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Subject *</Label>
            <Input placeholder="Email subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Message Content *</Label>
            <Textarea placeholder="Email message" value={message} onChange={(e) => setMessage(e.target.value)} rows={12} className="font-mono text-sm" />
          </div>
        </div>
      </div>
    </StandardModal>
  );
};
