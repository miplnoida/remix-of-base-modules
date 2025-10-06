import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, FileText } from "lucide-react";

interface AddEvidenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  onEvidenceAdded: () => void;
}

export function AddEvidenceDialog({ 
  open, 
  onOpenChange, 
  caseId, 
  onEvidenceAdded 
}: AddEvidenceDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState('Document');
  const [description, setDescription] = useState('');
  const [source, setSource] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    if (!file || !description || !source) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsAdding(true);
    try {
      // In real implementation, call documentsAdapter.upload and add to evidence registry
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Evidence item added successfully');
      onEvidenceAdded();
      handleClose();
    } catch (error) {
      toast.error('Failed to add evidence');
    } finally {
      setIsAdding(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setType('Document');
    setDescription('');
    setSource('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Evidence Item</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Evidence Type *</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Document">Document</SelectItem>
                <SelectItem value="Physical">Physical Evidence</SelectItem>
                <SelectItem value="Digital">Digital Evidence</SelectItem>
                <SelectItem value="Testimony">Testimony Record</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea
              placeholder="Describe the evidence item"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Source *</Label>
            <Input
              placeholder="Where was this evidence obtained?"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Attach File</Label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <input
                type="file"
                id="evidence-upload"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <label htmlFor="evidence-upload" className="cursor-pointer">
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="font-medium">{file.name}</span>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload evidence file
                    </p>
                  </>
                )}
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleAdd} disabled={!file || isAdding}>
            {isAdding ? 'Adding...' : 'Add Evidence'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
