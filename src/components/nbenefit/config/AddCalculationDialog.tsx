import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { FormulaBuilder } from "./FormulaBuilder";

interface AddCalculationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calculationType: "short-term" | "long-term" | "indexation";
  onSave: (data: any) => void;
}

export function AddCalculationDialog({ open, onOpenChange, calculationType, onSave }: AddCalculationDialogProps) {
  const [formData, setFormData] = useState<any>({});

  const handleSave = () => {
    onSave(formData);
    setFormData({});
    onOpenChange(false);
  };

  const renderFields = () => {
    switch (calculationType) {
      case "short-term":
        return (
          <>
            <div className="space-y-2">
              <Label>Benefit Type</Label>
              <Select onValueChange={(value) => setFormData({ ...formData, benefitType: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select benefit type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sickness">Sickness Benefit</SelectItem>
                  <SelectItem value="injury">Employment Injury</SelectItem>
                  <SelectItem value="maternity_allowance">Maternity Allowance</SelectItem>
                  <SelectItem value="maternity_grant">Maternity Grant</SelectItem>
                  <SelectItem value="funeral">Funeral Grant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Calculation Formula</Label>
              <Tabs defaultValue="builder" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="builder">Visual Builder</TabsTrigger>
                  <TabsTrigger value="text">Text Input</TabsTrigger>
                </TabsList>
                <TabsContent value="builder" className="mt-4">
                  <FormulaBuilder
                    value={formData.formula || ""}
                    onChange={(formula) => setFormData({ ...formData, formula })}
                    benefitType={formData.benefitType}
                  />
                </TabsContent>
                <TabsContent value="text" className="mt-4">
                  <Input
                    value={formData.formula || ""}
                    onChange={(e) => setFormData({ ...formData, formula: e.target.value })}
                    placeholder="e.g., 0.60 * {AWE}"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Use curly braces for variables: {"{AWW}"}, {"{AWE}"}, {"{TotalContributions}"}
                  </p>
                </TabsContent>
              </Tabs>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Weekly (XCD)</Label>
                <Input
                  type="number"
                  value={formData.minWeekly || ""}
                  onChange={(e) => setFormData({ ...formData, minWeekly: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Weekly (XCD)</Label>
                <Input
                  type="number"
                  value={formData.maxWeekly || ""}
                  onChange={(e) => setFormData({ ...formData, maxWeekly: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Maximum Formula (Optional)</Label>
              <Input 
                value={formData.maxFormula || ""}
                onChange={(e) => setFormData({ ...formData, maxFormula: e.target.value })}
                placeholder="e.g., MIN(0.65 * AWE, 500)" 
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Formula to cap the benefit amount. Example: MIN(Formula, MaxAmount)
              </p>
            </div>
            <div className="space-y-2">
              <Label>Maximum Formula (Optional)</Label>
              <Input 
                value={formData.maxFormula || ""}
                onChange={(e) => setFormData({ ...formData, maxFormula: e.target.value })}
                placeholder="e.g., MIN(0.65 * AWE, 500)" 
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Formula to cap the benefit amount. Uses MIN() to apply maximum limit.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Duration</Label>
              <Input
                value={formData.duration || ""}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                placeholder="e.g., Up to 26 weeks"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </>
        );
      case "long-term":
        return (
          <>
            <div className="space-y-2">
              <Label>Benefit Type</Label>
              <Select onValueChange={(value) => setFormData({ ...formData, benefitType: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select benefit type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="age_pension">Age Pension</SelectItem>
                  <SelectItem value="age_grant">Age Grant</SelectItem>
                  <SelectItem value="invalidity">Invalidity Benefit</SelectItem>
                  <SelectItem value="survivors">Survivors' Pension</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Calculation Formula</Label>
              <Tabs defaultValue="builder" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="builder">Visual Builder</TabsTrigger>
                  <TabsTrigger value="text">Text Input</TabsTrigger>
                </TabsList>
                <TabsContent value="builder" className="mt-4">
                  <FormulaBuilder
                    value={formData.formula || ""}
                    onChange={(formula) => setFormData({ ...formData, formula })}
                    benefitType={formData.benefitType}
                  />
                </TabsContent>
                <TabsContent value="text" className="mt-4">
                  <Input
                    value={formData.formula || ""}
                    onChange={(e) => setFormData({ ...formData, formula: e.target.value })}
                    placeholder="e.g., 0.30 * {AWW} + 0.01 * ({TotalContributions} - 500)"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Use curly braces for variables: {"{AWW}"}, {"{AWE}"}, {"{TotalContributions}"}
                  </p>
                </TabsContent>
              </Tabs>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Monthly (XCD)</Label>
                <Input
                  type="number"
                  value={formData.minMonthly || ""}
                  onChange={(e) => setFormData({ ...formData, minMonthly: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Monthly (XCD)</Label>
                <Input
                  type="number"
                  value={formData.maxMonthly || ""}
                  onChange={(e) => setFormData({ ...formData, maxMonthly: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Maximum Formula (Optional)</Label>
              <Input 
                value={formData.maxFormula || ""}
                onChange={(e) => setFormData({ ...formData, maxFormula: e.target.value })}
                placeholder="e.g., MIN((0.30 * AIW) + ContribBonus, 1000)" 
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Formula to cap the benefit amount. Example: MIN(Formula, MaxAmount)
              </p>
            </div>
            <div className="space-y-2">
              <Label>Maximum Formula (Optional)</Label>
              <Input 
                value={formData.maxFormula || ""}
                onChange={(e) => setFormData({ ...formData, maxFormula: e.target.value })}
                placeholder="e.g., MIN((0.30 * AIW) + ContribBonus, 1000)" 
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Formula to cap the benefit amount. Uses MIN() to apply maximum limit.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </>
        );
      case "indexation":
        return (
          <>
            <div className="space-y-2">
              <Label>Year</Label>
              <Input
                type="number"
                value={formData.year || ""}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                placeholder="2024"
              />
            </div>
            <div className="space-y-2">
              <Label>Indexation Rate (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.rate || ""}
                onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                placeholder="2.5"
              />
            </div>
            <div className="space-y-2">
              <Label>Effective Date</Label>
              <Input
                type="date"
                value={formData.effectiveDate || ""}
                onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="historical">Historical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );
    }
  };

  const getTitle = () => {
    switch (calculationType) {
      case "short-term": return "Add Short-Term Calculation Rule";
      case "long-term": return "Add Long-Term Calculation Rule";
      case "indexation": return "Add Indexation Rate";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {renderFields()}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Calculation</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
