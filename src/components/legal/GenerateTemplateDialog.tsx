import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { FileText, Eye } from "lucide-react";
import { LegalLetterhead } from "@/components/legal/LegalLetterhead";
import { useLgDepartmentProfileFull } from "@/hooks/legal/useLgDepartmentProfileFull";
import { buildDepartmentMergeContext } from "@/lib/legal/departmentMergeContext";

interface GenerateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  caseNumber: string;
  onDocumentGenerated: () => void;
}

const TEMPLATES = [
  { id: 'summons', name: 'Summons to Appear (Form 37)', folder: 'Notices' },
  { id: 'judgment-summons', name: 'Judgment Summons (Form 40)', folder: 'Notices' },
  { id: 'warrant', name: 'Warrant of Commitment (Form 41)', folder: 'Orders' },
  { id: 'writ', name: 'Writ of Execution', folder: 'Orders' },
  { id: 'requisition', name: 'Legal Action Requisition', folder: 'Filings' },
];

export function GenerateTemplateDialog({ 
  open, 
  onOpenChange, 
  caseId, 
  caseNumber,
  onDocumentGenerated 
}: GenerateTemplateDialogProps) {
  const [template, setTemplate] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const selectedTemplate = TEMPLATES.find(t => t.id === template);

  const handleGenerate = async () => {
    if (!template) {
      toast.error('Please select a template');
      return;
    }

    setIsGenerating(true);
    try {
      // In real implementation, call documentsAdapter.generateFromTemplate
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success(`Document generated: ${selectedTemplate?.name}`);
      onDocumentGenerated();
      handleClose();
    } catch (error) {
      toast.error('Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreview = () => {
    if (!template) {
      toast.error('Please select a template');
      return;
    }
    setShowPreview(true);
    toast.info('Preview would open here with merged fields');
  };

  const handleClose = () => {
    setTemplate('');
    setShowPreview(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Generate Document from Template</DialogTitle>
          <p className="text-sm text-muted-foreground">Case: {caseNumber}</p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Select Template *</Label>
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a template..." />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATES.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTemplate && (
            <Card className="p-4 bg-muted/50">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">{selectedTemplate.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Will be saved to: {selectedTemplate.folder}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Merge fields will be auto-populated from case data
                  </p>
                </div>
              </div>
            </Card>
          )}

          {showPreview && (
            <div className="border rounded-lg p-4 bg-white space-y-3">
              <LegalLetterhead variant="full" />
              <p className="text-sm font-medium">Preview: {selectedTemplate?.name}</p>
              <p className="text-xs text-muted-foreground">
                Merge fields ({"{{dept.*}}"}) will be populated from Department Profile and case data.
              </p>
              <DeptSignaturePreview />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button variant="outline" onClick={handlePreview} disabled={!template}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button onClick={handleGenerate} disabled={!template || isGenerating}>
            {isGenerating ? 'Generating...' : 'Generate PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeptSignaturePreview() {
  const { data } = useLgDepartmentProfileFull();
  const ctx = buildDepartmentMergeContext(data);
  if (!ctx.signature) return null;
  return (
    <div className="mt-4 border-t pt-3 text-xs whitespace-pre-line text-muted-foreground">
      {ctx.signature}
    </div>
  );
}
