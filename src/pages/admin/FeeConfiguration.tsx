import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, CheckCircle, XCircle } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface FeeConfig {
  id: string;
  module: string;
  serviceType: string;
  feeName: string;
  feeAmount: number;
  accountingHeadId: string;
  accountingHeadName: string;
  description: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  activeStatus: boolean;
}

const MODULES = [
  "INSURED_PERSONS",
  "EMPLOYERS",
  "BENEFITS",
  "C3_MANAGEMENT"
];

const SERVICE_TYPES = {
  INSURED_PERSONS: [
    { value: "CARD_REPLACEMENT_1ST", label: "1st Card Replacement" },
    { value: "CARD_REPLACEMENT_2ND", label: "2nd Card Replacement" },
    { value: "CARD_REPLACEMENT_3RD_PLUS", label: "3rd+ Card Replacement" },
    { value: "NAME_CHANGE", label: "Name/Address Change" },
    { value: "CONTRIBUTION_CERTIFICATE", label: "Contribution Certificate" }
  ],
  EMPLOYERS: [
    { value: "LATE_SUBMISSION_FEE", label: "Late C3 Submission" }
  ],
  BENEFITS: [
    { value: "BENEFIT_LETTER_REPRINT", label: "Benefit Letter Reprint" }
  ]
};

const ACCOUNTING_HEADS = [
  { id: "ah-001", code: "4010", name: "Fee Revenue - Card Replacement" },
  { id: "ah-002", code: "4020", name: "Fee Revenue - Name Change" },
  { id: "ah-003", code: "4030", name: "Fee Revenue - Certificate" },
  { id: "ah-004", code: "4040", name: "Fee Revenue - Late Submission" },
  { id: "ah-005", code: "4050", name: "Fee Revenue - Benefit Letters" }
];

export default function FeeConfiguration() {
  const [fees, setFees] = useState<FeeConfig[]>([
    {
      id: "1",
      module: "INSURED_PERSONS",
      serviceType: "CARD_REPLACEMENT_1ST",
      feeName: "First Replacement Social Security Card",
      feeAmount: 20.00,
      accountingHeadId: "ah-001",
      accountingHeadName: "Fee Revenue - Card Replacement",
      description: "First replacement of lost/damaged card",
      effectiveFrom: "2024-01-01",
      effectiveTo: null,
      activeStatus: true
    },
    {
      id: "2",
      module: "INSURED_PERSONS",
      serviceType: "CARD_REPLACEMENT_3RD_PLUS",
      feeName: "3rd+ Replacement Social Security Card",
      feeAmount: 150.00,
      accountingHeadId: "ah-001",
      accountingHeadName: "Fee Revenue - Card Replacement",
      description: "Third or subsequent replacement",
      effectiveFrom: "2024-01-01",
      effectiveTo: null,
      activeStatus: true
    },
    {
      id: "3",
      module: "INSURED_PERSONS",
      serviceType: "NAME_CHANGE",
      feeName: "Name/Address Change",
      feeAmount: 25.00,
      accountingHeadId: "ah-002",
      accountingHeadName: "Fee Revenue - Name Change",
      description: "Update name or address on record",
      effectiveFrom: "2024-01-01",
      effectiveTo: null,
      activeStatus: true
    }
  ]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<FeeConfig | null>(null);
  const [formData, setFormData] = useState<Partial<FeeConfig>>({});

  const handleAdd = () => {
    setEditingFee(null);
    setFormData({
      module: "",
      serviceType: "",
      feeName: "",
      feeAmount: 0,
      accountingHeadId: "",
      description: "",
      effectiveFrom: new Date().toISOString().split('T')[0],
      activeStatus: true
    });
    setDialogOpen(true);
  };

  const handleEdit = (fee: FeeConfig) => {
    setEditingFee(fee);
    setFormData(fee);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.feeName || !formData.feeAmount || !formData.accountingHeadId) {
      toast.error("Please fill in all required fields");
      return;
    }

    const accountingHead = ACCOUNTING_HEADS.find(h => h.id === formData.accountingHeadId);

    // Auto-set effectiveTo to today if deactivating
    const updatedFormData = { ...formData };
    if (formData.activeStatus === false && !formData.effectiveTo) {
      updatedFormData.effectiveTo = new Date().toISOString().split('T')[0];
    }

    if (editingFee) {
      setFees(fees.map(f => f.id === editingFee.id ? {
        ...f,
        ...updatedFormData,
        accountingHeadName: accountingHead?.name || ""
      } as FeeConfig : f));
      toast.success("Fee updated successfully");
    } else {
      const newFee: FeeConfig = {
        id: Date.now().toString(),
        ...updatedFormData,
        accountingHeadName: accountingHead?.name || ""
      } as FeeConfig;
      setFees([...fees, newFee]);
      toast.success("Fee added successfully");
    }
    setDialogOpen(false);
  };

  const handleToggleStatus = (id: string) => {
    setFees(fees.map(f => f.id === id ? { ...f, activeStatus: !f.activeStatus } : f));
    toast.success("Fee status updated");
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this fee?")) {
      setFees(fees.filter(f => f.id !== id));
      toast.success("Fee deleted successfully");
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Fee Configuration"
        subtitle="Manage service fees and accounting head mappings"
        breadcrumbs={[
          { label: "System Administration", href: "/admin/users" },
          { label: "Fee Configuration" }
        ]}
        actions={
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Fee
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Configured Fees</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {fees.map((fee) => (
              <div key={fee.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">{fee.feeName}</h3>
                    <StatusBadge status={fee.activeStatus ? "Active" : "Inactive"} />
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>XCD {fee.feeAmount.toFixed(2)}</span>
                    <span>•</span>
                    <span>{fee.accountingHeadName}</span>
                    <span>•</span>
                    <span>{fee.module.replace(/_/g, ' ')}</span>
                  </div>
                  {fee.description && (
                    <p className="text-sm text-muted-foreground">{fee.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleToggleStatus(fee.id)}
                    title={fee.activeStatus ? "Deactivate" : "Activate"}
                  >
                    {fee.activeStatus ? (
                      <CheckCircle className="h-4 w-4 text-success" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleEdit(fee)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(fee.id)}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingFee ? "Edit Fee" : "Add New Fee"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="module">Module *</Label>
                <Select value={formData.module} onValueChange={(value) => setFormData({ ...formData, module: value, serviceType: "" })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select module" />
                  </SelectTrigger>
                  <SelectContent>
                    {MODULES.map((mod) => (
                      <SelectItem key={mod} value={mod}>{mod.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="serviceType">Service Type *</Label>
                <Select 
                  value={formData.serviceType} 
                  onValueChange={(value) => setFormData({ ...formData, serviceType: value })}
                  disabled={!formData.module}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select service type" />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.module && (SERVICE_TYPES as any)[formData.module]?.map((st: any) => (
                      <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="feeName">Fee Name *</Label>
              <Input
                id="feeName"
                value={formData.feeName}
                onChange={(e) => setFormData({ ...formData, feeName: e.target.value })}
                placeholder="Enter fee name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="feeAmount">Fee Amount (XCD) *</Label>
                <Input
                  id="feeAmount"
                  type="number"
                  step="0.01"
                  value={formData.feeAmount || ""}
                  onChange={(e) => setFormData({ ...formData, feeAmount: parseFloat(e.target.value) })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="accountingHead">Accounting Head *</Label>
                <Select value={formData.accountingHeadId} onValueChange={(value) => setFormData({ ...formData, accountingHeadId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select accounting head" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNTING_HEADS.map((head) => (
                      <SelectItem key={head.id} value={head.id}>
                        {head.code} - {head.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="effectiveFrom">Effective From *</Label>
                <Input
                  id="effectiveFrom"
                  type="date"
                  value={formData.effectiveFrom}
                  onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="effectiveTo">Effective To</Label>
                <Input
                  id="effectiveTo"
                  type="date"
                  value={formData.effectiveTo || ""}
                  onChange={(e) => setFormData({ ...formData, effectiveTo: e.target.value || null })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter fee description"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingFee ? "Update Fee" : "Add Fee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
