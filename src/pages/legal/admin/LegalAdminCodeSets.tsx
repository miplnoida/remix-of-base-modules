import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BackNavigation } from "@/components/ui/back-navigation";
import { LgDataGrid, LgStatusBadge, buildLgRowActions, type LgColumnDef } from "@/components/legal/grid";
import { Code, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const mockCodeSets = [
  { id: "1", category: "caseTypes", code: "PROSECUTION", label: "Prosecution", usageCount: 45, isActive: true },
  { id: "2", category: "caseTypes", code: "APPEAL", label: "Appeal", usageCount: 32, isActive: true },
  { id: "3", category: "caseTypes", code: "RECOVERY", label: "Recovery", usageCount: 28, isActive: true },
  { id: "4", category: "statuses", code: "DRAFT", label: "Draft", usageCount: 15, isActive: true },
  { id: "5", category: "statuses", code: "FILED", label: "Filed", usageCount: 42, isActive: true },
  { id: "6", category: "hearingTypes", code: "PRELIMINARY", label: "Preliminary Hearing", usageCount: 18, isActive: true },
];

const categories = [
  { value: "caseTypes", label: "Case Types" },
  { value: "statuses", label: "Statuses" },
  { value: "flags", label: "Flags" },
  { value: "hearingTypes", label: "Hearing Types" },
  { value: "outcomes", label: "Outcomes" },
  { value: "penaltyTypes", label: "Penalty Types" },
  { value: "serviceMethods", label: "Service Methods" },
  { value: "confidentialityLevels", label: "Confidentiality Levels" },
];

export default function LegalAdminCodeSets() {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState("caseTypes");
  const [isAddOpen, setIsAddOpen] = useState(false);

  const filtered = mockCodeSets.filter((c) => c.category === selectedCategory);

  const columns: LgColumnDef<any>[] = useMemo(() => [
    { accessorKey: "code", header: "Code", meta: { label: "Code", pinLeft: true } },
    { accessorKey: "label", header: "Label", meta: { label: "Label" } },
    {
      accessorKey: "usageCount", header: "Usage", meta: { label: "Usage", align: "right" },
      cell: ({ getValue }) => <Badge variant="outline">{getValue() as number} uses</Badge>,
    },
    {
      accessorKey: "isActive", header: "Status", meta: { label: "Status" },
      cell: ({ getValue }) => <LgStatusBadge status={getValue() ? "ACTIVE" : "INACTIVE"} />,
    },
  ], []);

  return (
    <div className="p-6 space-y-6">
      <BackNavigation />
      <div className="flex items-center gap-3">
        <Code className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Code Sets Management</h1>
          <p className="text-sm text-muted-foreground">Dropdown values and reference data for the Legal module</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Code Sets</CardTitle>
              <CardDescription>Manage reference codes by category</CardDescription>
            </div>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" />Add Code</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Code</DialogTitle>
                  <DialogDescription>Create a new code value for the selected category</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select defaultValue={selectedCategory}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Code</Label><Input placeholder="e.g., PROSECUTION" /></div>
                  <div className="space-y-2"><Label>Label</Label><Input placeholder="e.g., Prosecution" /></div>
                  <div className="space-y-2"><Label>Description</Label><Textarea placeholder="Optional description" /></div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                  <Button onClick={() => { toast({ title: "Saved" }); setIsAddOpen(false); }}>Save Code</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Label>Category:</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[250px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <LgDataGrid
            id="lg.admin.codesets"
            columns={columns}
            data={filtered}
            rowActions={buildLgRowActions({
              onEdit: () => {},
              onDelete: (r) => toast({ title: "Deleted", description: r.label, variant: "destructive" }),
              canDelete: (r) => r.usageCount === 0,
            })}
            exportFilename="legal-codesets"
          />
        </CardContent>
      </Card>
    </div>
  );
}
