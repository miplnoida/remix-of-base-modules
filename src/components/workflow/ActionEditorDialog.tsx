import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

interface ActionConfig {
  type: string;
  [key: string]: any;
}

interface ActionEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: ActionConfig) => void;
  initialConfig?: ActionConfig;
}

export default function ActionEditorDialog({ open, onOpenChange, onSave, initialConfig }: ActionEditorDialogProps) {
  const { toast } = useToast();
  const [actionType, setActionType] = useState(initialConfig?.type || "email");
  const [config, setConfig] = useState<ActionConfig>(initialConfig || { type: "email" });

  const updateConfig = (key: string, value: any) => {
    setConfig({ ...config, [key]: value });
  };

  const handleSave = () => {
    onSave({ ...config, type: actionType });
    toast({ title: "Action Configured", description: "Automation action has been saved" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Action Editor</DialogTitle>
          <DialogDescription>
            Configure the automation action to be performed
          </DialogDescription>
        </DialogHeader>

        <Tabs value={actionType} onValueChange={setActionType}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="sms">SMS</TabsTrigger>
            <TabsTrigger value="webhook">Webhook</TabsTrigger>
            <TabsTrigger value="database">Database</TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>To (Email Address) *</Label>
              <Input
                value={config.to || ""}
                onChange={(e) => updateConfig("to", e.target.value)}
                placeholder="user@example.com or {{form.email}}"
              />
            </div>
            <div className="space-y-2">
              <Label>Subject *</Label>
              <Input
                value={config.subject || ""}
                onChange={(e) => updateConfig("subject", e.target.value)}
                placeholder="Application Status Update"
              />
            </div>
            <div className="space-y-2">
              <Label>Body *</Label>
              <Textarea
                value={config.body || ""}
                onChange={(e) => updateConfig("body", e.target.value)}
                placeholder="Your application has been {{status}}. Reference: {{form.applicationId}}"
                rows={6}
              />
            </div>
            <div className="space-y-2">
              <Label>CC (Optional)</Label>
              <Input
                value={config.cc || ""}
                onChange={(e) => updateConfig("cc", e.target.value)}
                placeholder="supervisor@example.com"
              />
            </div>
          </TabsContent>

          <TabsContent value="sms" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Phone Number *</Label>
              <Input
                value={config.phone || ""}
                onChange={(e) => updateConfig("phone", e.target.value)}
                placeholder="+1234567890 or {{form.phone}}"
              />
            </div>
            <div className="space-y-2">
              <Label>Message *</Label>
              <Textarea
                value={config.message || ""}
                onChange={(e) => updateConfig("message", e.target.value)}
                placeholder="Your claim #{{form.claimId}} has been {{status}}. Contact us for details."
                rows={4}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Note: SMS messages are limited to 160 characters
            </div>
          </TabsContent>

          <TabsContent value="webhook" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>HTTP Method</Label>
              <Select value={config.method || "POST"} onValueChange={(value) => updateConfig("method", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>URL *</Label>
              <Input
                value={config.url || ""}
                onChange={(e) => updateConfig("url", e.target.value)}
                placeholder="https://api.example.com/webhook"
              />
            </div>
            <div className="space-y-2">
              <Label>Headers (JSON)</Label>
              <Textarea
                value={config.headers || ""}
                onChange={(e) => updateConfig("headers", e.target.value)}
                placeholder='{"Authorization": "Bearer token123", "Content-Type": "application/json"}'
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Body (JSON)</Label>
              <Textarea
                value={config.requestBody || ""}
                onChange={(e) => updateConfig("requestBody", e.target.value)}
                placeholder='{"applicationId": "{{form.applicationId}}", "status": "{{status}}"}'
                rows={6}
              />
            </div>
          </TabsContent>

          <TabsContent value="database" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Stored Procedure *</Label>
              <Input
                value={config.procedure || ""}
                onChange={(e) => updateConfig("procedure", e.target.value)}
                placeholder="usp_UpdateBenefitStatus"
              />
            </div>
            <div className="space-y-2">
              <Label>Parameters (JSON)</Label>
              <Textarea
                value={config.parameters || ""}
                onChange={(e) => updateConfig("parameters", e.target.value)}
                placeholder='{"@ApplicationId": "{{form.applicationId}}", "@Status": "{{status}}", "@UpdatedBy": "{{user.id}}"}'
                rows={6}
              />
            </div>
            <div className="space-y-2">
              <Label>Connection String Name</Label>
              <Select value={config.connectionName || "default"} onValueChange={(value) => updateConfig("connectionName", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default Database</SelectItem>
                  <SelectItem value="benefits">Benefits Database</SelectItem>
                  <SelectItem value="compliance">Compliance Database</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Action</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
