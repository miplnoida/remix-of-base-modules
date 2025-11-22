import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FormField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: string;
}

interface FormBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (fields: FormField[]) => void;
  initialFields?: FormField[];
}

const fieldTypes = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "currency", label: "Currency" },
  { value: "email", label: "Email" },
  { value: "date", label: "Date" },
  { value: "select", label: "Select" },
  { value: "multiselect", label: "Multi-select" },
  { value: "textarea", label: "Text Area" },
  { value: "checkbox", label: "Checkbox" },
  { value: "file", label: "File Upload" },
];

export default function FormBuilderDialog({ open, onOpenChange, onSave, initialFields = [] }: FormBuilderDialogProps) {
  const { toast } = useToast();
  const [fields, setFields] = useState<FormField[]>(initialFields.length > 0 ? initialFields : [
    { id: "field-1", label: "", type: "text", required: false }
  ]);

  const addField = () => {
    setFields([...fields, { id: `field-${Date.now()}`, label: "", type: "text", required: false }]);
  };

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const handleSave = () => {
    const valid = fields.every(f => f.label.trim() !== "");
    if (!valid) {
      toast({ title: "Validation Error", description: "All fields must have labels", variant: "destructive" });
      return;
    }
    onSave(fields);
    toast({ title: "Form Saved", description: "Form fields have been configured" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Form Builder</DialogTitle>
          <DialogDescription>
            Design the form that users will fill out when this task is assigned to them
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {fields.map((field, index) => (
            <Card key={field.id} className="p-4">
              <div className="grid grid-cols-[auto_1fr_auto] gap-4 items-start">
                <div className="pt-8">
                  <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Field Label *</Label>
                    <Input
                      value={field.label}
                      onChange={(e) => updateField(field.id, { label: e.target.value })}
                      placeholder="e.g., Monthly Earnings"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Field Type</Label>
                    <Select value={field.type} onValueChange={(value) => updateField(field.id, { type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fieldTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Placeholder</Label>
                    <Input
                      value={field.placeholder || ""}
                      onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Help Text</Label>
                    <Input
                      value={field.helpText || ""}
                      onChange={(e) => updateField(field.id, { helpText: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>

                  {(field.type === "select" || field.type === "multiselect") && (
                    <div className="col-span-2 space-y-2">
                      <Label>Options (comma-separated)</Label>
                      <Textarea
                        value={field.options || ""}
                        onChange={(e) => updateField(field.id, { options: e.target.value })}
                        placeholder="Option 1, Option 2, Option 3"
                        rows={2}
                      />
                    </div>
                  )}

                  <div className="flex items-center space-x-2 pt-6">
                    <Switch
                      checked={field.required}
                      onCheckedChange={(checked) => updateField(field.id, { required: checked })}
                    />
                    <Label>Required Field</Label>
                  </div>
                </div>

                <div className="pt-8">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeField(field.id)}
                    disabled={fields.length === 1}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          <Button variant="outline" onClick={addField} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Field
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Form</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
