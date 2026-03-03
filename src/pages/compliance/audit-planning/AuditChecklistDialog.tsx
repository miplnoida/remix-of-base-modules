import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle, XCircle, MinusCircle, Camera, FileText } from 'lucide-react';
import { ChecklistItem, AUDIT_CHECKLIST_TEMPLATES } from '@/types/auditChecklist';
import { PlannedVisit } from '@/types/weeklyAuditPlan';

interface AuditChecklistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visit: PlannedVisit | null;
  onSave: (checklist: ChecklistItem[]) => void;
}

export function AuditChecklistDialog({
  open,
  onOpenChange,
  visit,
  onSave
}: AuditChecklistDialogProps) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);

  useEffect(() => {
    if (visit && open) {
      // Load appropriate template based on visit type
      const templateKey = visit.visitType === 'RISK_BASED_AUDIT' ? 'HIGH_RISK_AUDIT' : 'GENERAL_AUDIT';
      const template = AUDIT_CHECKLIST_TEMPLATES[templateKey];
      
      const items = template.categories.flatMap(cat => cat.items);
      setChecklist(items);
    }
  }, [visit, open]);

  const handleResponseChange = (itemId: string, response: 'Yes' | 'No' | 'N/A' | 'Partial') => {
    setChecklist(prev => prev.map(item =>
      item.id === itemId ? { ...item, response } : item
    ));
  };

  const handleNotesChange = (itemId: string, notes: string) => {
    setChecklist(prev => prev.map(item =>
      item.id === itemId ? { ...item, notes } : item
    ));
  };

  const handleSave = () => {
    onSave(checklist);
    onOpenChange(false);
  };

  const getResponseIcon = (response?: string) => {
    switch (response) {
      case 'Yes':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'No':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'N/A':
        return <MinusCircle className="h-4 w-4 text-muted-foreground" />;
      case 'Partial':
        return <MinusCircle className="h-4 w-4 text-warning" />;
      default:
        return null;
    }
  };

  const completionPercentage = Math.round(
    (checklist.filter(item => item.response).length / checklist.length) * 100
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Audit Checklist</DialogTitle>
          <DialogDescription>
            {visit?.employerName} - {visit?.visitType.replace(/_/g, ' ')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress */}
          <div className="flex items-center justify-between border rounded-lg p-4 bg-muted/50">
            <div>
              <p className="text-sm text-muted-foreground">Completion Progress</p>
              <p className="text-2xl font-bold">{completionPercentage}%</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Completed Items</p>
              <p className="text-2xl font-bold">
                {checklist.filter(item => item.response).length} / {checklist.length}
              </p>
            </div>
          </div>

          {/* Checklist Items */}
          <div className="space-y-6">
            {Object.entries(
              checklist.reduce((acc, item) => {
                if (!acc[item.category]) acc[item.category] = [];
                acc[item.category].push(item);
                return acc;
              }, {} as Record<string, ChecklistItem[]>)
            ).map(([category, items]) => (
              <div key={category} className="space-y-3">
                <h3 className="font-semibold text-lg border-b pb-2">{category}</h3>
                {items.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <Label className="text-sm font-medium">{item.question}</Label>
                        {item.evidenceRequired && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Evidence Required
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {getResponseIcon(item.response)}
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <Button
                        variant={item.response === 'Yes' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleResponseChange(item.id, 'Yes')}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Yes
                      </Button>
                      <Button
                        variant={item.response === 'No' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleResponseChange(item.id, 'No')}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        No
                      </Button>
                      <Button
                        variant={item.response === 'Partial' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleResponseChange(item.id, 'Partial')}
                      >
                        <MinusCircle className="h-4 w-4 mr-1" />
                        Partial
                      </Button>
                      <Button
                        variant={item.response === 'N/A' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleResponseChange(item.id, 'N/A')}
                      >
                        N/A
                      </Button>
                    </div>

                    <Textarea
                      placeholder="Add notes or details..."
                      value={item.notes || ''}
                      onChange={(e) => handleNotesChange(item.id, e.target.value)}
                      rows={2}
                    />

                    {item.evidenceRequired && (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Camera className="h-4 w-4 mr-2" />
                          Capture Photo
                        </Button>
                        <Button variant="outline" size="sm">
                          <FileText className="h-4 w-4 mr-2" />
                          Attach Document
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <FileText className="h-4 w-4 mr-2" />
            Save Checklist
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
