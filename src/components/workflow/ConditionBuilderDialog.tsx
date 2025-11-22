import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Condition {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface ConditionGroup {
  id: string;
  logic: "AND" | "OR";
  conditions: Condition[];
}

interface ConditionBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (groups: ConditionGroup[]) => void;
}

const operators = [
  { value: "equals", label: "Equals (=)" },
  { value: "notEquals", label: "Not Equals (≠)" },
  { value: "greaterThan", label: "Greater Than (>)" },
  { value: "greaterOrEqual", label: "Greater or Equal (≥)" },
  { value: "lessThan", label: "Less Than (<)" },
  { value: "lessOrEqual", label: "Less or Equal (≤)" },
  { value: "contains", label: "Contains" },
  { value: "startsWith", label: "Starts With" },
  { value: "endsWith", label: "Ends With" },
  { value: "in", label: "In List" },
];

export default function ConditionBuilderDialog({ open, onOpenChange, onSave }: ConditionBuilderDialogProps) {
  const { toast } = useToast();
  const [groups, setGroups] = useState<ConditionGroup[]>([
    { id: "group-1", logic: "AND", conditions: [{ id: "cond-1", field: "", operator: "equals", value: "" }] }
  ]);

  const addGroup = () => {
    setGroups([...groups, { 
      id: `group-${Date.now()}`, 
      logic: "AND", 
      conditions: [{ id: `cond-${Date.now()}`, field: "", operator: "equals", value: "" }] 
    }]);
  };

  const removeGroup = (groupId: string) => {
    setGroups(groups.filter(g => g.id !== groupId));
  };

  const updateGroupLogic = (groupId: string, logic: "AND" | "OR") => {
    setGroups(groups.map(g => g.id === groupId ? { ...g, logic } : g));
  };

  const addCondition = (groupId: string) => {
    setGroups(groups.map(g => 
      g.id === groupId 
        ? { ...g, conditions: [...g.conditions, { id: `cond-${Date.now()}`, field: "", operator: "equals", value: "" }] }
        : g
    ));
  };

  const removeCondition = (groupId: string, condId: string) => {
    setGroups(groups.map(g => 
      g.id === groupId 
        ? { ...g, conditions: g.conditions.filter(c => c.id !== condId) }
        : g
    ));
  };

  const updateCondition = (groupId: string, condId: string, updates: Partial<Condition>) => {
    setGroups(groups.map(g => 
      g.id === groupId 
        ? { 
            ...g, 
            conditions: g.conditions.map(c => c.id === condId ? { ...c, ...updates } : c)
          }
        : g
    ));
  };

  const handleSave = () => {
    const valid = groups.every(g => 
      g.conditions.every(c => c.field.trim() !== "" && c.value.trim() !== "")
    );
    if (!valid) {
      toast({ title: "Validation Error", description: "All conditions must have field and value", variant: "destructive" });
      return;
    }
    onSave(groups);
    toast({ title: "Conditions Saved", description: "Decision conditions have been configured" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Condition Builder</DialogTitle>
          <DialogDescription>
            Define conditions that determine which path the workflow follows
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {groups.map((group, groupIndex) => (
            <Card key={group.id} className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label>Group Logic:</Label>
                  <Select value={group.logic} onValueChange={(value) => updateGroupLogic(group.id, value as "AND" | "OR")}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AND">AND</SelectItem>
                      <SelectItem value="OR">OR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeGroup(group.id)}
                  disabled={groups.length === 1}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>

              {group.conditions.map((condition) => (
                <div key={condition.id} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
                  <div className="space-y-2">
                    <Label className="text-xs">Field</Label>
                    <Input
                      value={condition.field}
                      onChange={(e) => updateCondition(group.id, condition.id, { field: e.target.value })}
                      placeholder="form.MonthlyEarnings"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Operator</Label>
                    <Select
                      value={condition.operator}
                      onValueChange={(value) => updateCondition(group.id, condition.id, { operator: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {operators.map(op => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Value</Label>
                    <Input
                      value={condition.value}
                      onChange={(e) => updateCondition(group.id, condition.id, { value: e.target.value })}
                      placeholder="2000"
                    />
                  </div>

                  <div className="pt-6">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCondition(group.id, condition.id)}
                      disabled={group.conditions.length === 1}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}

              <Button variant="outline" size="sm" onClick={() => addCondition(group.id)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Condition
              </Button>
            </Card>
          ))}

          <Button variant="outline" onClick={addGroup} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Condition Group
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Conditions</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
