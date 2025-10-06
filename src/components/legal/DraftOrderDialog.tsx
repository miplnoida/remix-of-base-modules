import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface DraftOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  caseNumber: string;
  onOrderDrafted: () => void;
}

export function DraftOrderDialog({ 
  open, 
  onOpenChange, 
  caseId, 
  caseNumber,
  onOrderDrafted 
}: DraftOrderDialogProps) {
  const [orderType, setOrderType] = useState('Judgment');
  const [findings, setFindings] = useState('');
  const [directives, setDirectives] = useState('');
  const [complianceDue, setComplianceDue] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);

  const handleDraft = async () => {
    if (!findings || !directives) {
      toast.error('Please fill in findings and directives');
      return;
    }

    setIsDrafting(true);
    try {
      // In real implementation, create order via API
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Order drafted successfully');
      onOrderDrafted();
      handleClose();
    } catch (error) {
      toast.error('Failed to draft order');
    } finally {
      setIsDrafting(false);
    }
  };

  const handleClose = () => {
    setOrderType('Judgment');
    setFindings('');
    setDirectives('');
    setComplianceDue('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Draft Legal Order</DialogTitle>
          <p className="text-sm text-muted-foreground">Case: {caseNumber}</p>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2">
            <Label>Order Type *</Label>
            <Select value={orderType} onValueChange={setOrderType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Judgment">Judgment</SelectItem>
                <SelectItem value="Interlocutory">Interlocutory Order</SelectItem>
                <SelectItem value="Enforcement">Enforcement Order</SelectItem>
                <SelectItem value="Settlement">Settlement Order</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Findings *</Label>
            <Textarea
              placeholder="Enter the court's findings of fact and law..."
              value={findings}
              onChange={(e) => setFindings(e.target.value)}
              rows={6}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label>Directives / Orders *</Label>
            <Textarea
              placeholder="Enter specific directives and orders..."
              value={directives}
              onChange={(e) => setDirectives(e.target.value)}
              rows={6}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label>Compliance Due Date</Label>
            <Input
              type="date"
              value={complianceDue}
              onChange={(e) => setComplianceDue(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Set a deadline for parties to comply with this order
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleDraft} disabled={isDrafting}>
            {isDrafting ? 'Drafting...' : 'Save Draft'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
