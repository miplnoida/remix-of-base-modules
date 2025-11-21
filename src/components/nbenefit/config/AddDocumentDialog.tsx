import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

interface AddDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: "application" | "supporting" | "letter";
  onSave: (data: any) => void;
}

export function AddDocumentDialog({ open, onOpenChange, documentType, onSave }: AddDocumentDialogProps) {
  const [formData, setFormData] = useState<any>({});

  const handleSave = () => {
    onSave(formData);
    setFormData({});
    onOpenChange(false);
  };

  const renderFields = () => {
    switch (documentType) {
      case "application":
        return (
          <>
            <div className="space-y-2">
              <Label>Form Code</Label>
              <Input
                value={formData.code || ""}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., SB/EIB"
              />
            </div>
            <div className="space-y-2">
              <Label>Form Name</Label>
              <Input
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Claim for Sickness and Injury Benefit"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="application">Application Form</SelectItem>
                  <SelectItem value="supporting">Supporting Document</SelectItem>
                  <SelectItem value="payment">Payment Document</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Version</Label>
              <Input
                value={formData.version || ""}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                placeholder="v1.0"
              />
            </div>
            <div className="space-y-2">
              <Label>Upload Document (Optional)</Label>
              <Input type="file" />
            </div>
          </>
        );
      case "supporting":
        return (
          <>
            <div className="space-y-2">
              <Label>Document Code</Label>
              <Input
                value={formData.code || ""}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., LIFE-CERT"
              />
            </div>
            <div className="space-y-2">
              <Label>Document Name</Label>
              <Input
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Life Certificate"
              />
            </div>
            <div className="space-y-2">
              <Label>Required For</Label>
              <Input
                value={formData.requiredFor || ""}
                onChange={(e) => setFormData({ ...formData, requiredFor: e.target.value })}
                placeholder="e.g., All pensioners - Annual"
              />
            </div>
            <div className="space-y-2">
              <Label>Version</Label>
              <Input
                value={formData.version || ""}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                placeholder="v1.0"
              />
            </div>
            <div className="space-y-2">
              <Label>Upload Document (Optional)</Label>
              <Input type="file" />
            </div>
          </>
        );
      case "letter":
        return (
          <>
            <div className="space-y-2">
              <Label>Template Code</Label>
              <Input
                value={formData.code || ""}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., APPR-LTR"
              />
            </div>
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Benefit Approval Letter"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="decision">Decision Letter</SelectItem>
                  <SelectItem value="action">Action Required</SelectItem>
                  <SelectItem value="status">Status Change</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Use Case</Label>
              <Input
                value={formData.useCase || ""}
                onChange={(e) => setFormData({ ...formData, useCase: e.target.value })}
                placeholder="e.g., Approved claims"
              />
            </div>
            <div className="space-y-2">
              <Label>Language</Label>
              <Select onValueChange={(value) => setFormData({ ...formData, language: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EN">English</SelectItem>
                  <SelectItem value="ES">Spanish</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Template Content</Label>
              <Textarea
                value={formData.content || ""}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter template with merge fields..."
                rows={5}
              />
            </div>
          </>
        );
    }
  };

  const getTitle = () => {
    switch (documentType) {
      case "application": return "Add Application Form";
      case "supporting": return "Add Supporting Document";
      case "letter": return "Add Letter Template";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          {renderFields()}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Document</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
