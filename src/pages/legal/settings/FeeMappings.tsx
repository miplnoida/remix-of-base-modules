import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LgDataGrid, LgStatusBadge, buildLgRowActions, type LgColumnDef } from "@/components/legal/grid";

interface FeeMapping {
  id: string;
  eventName: string;
  eventCode: string;
  feeCode: string;
  feeName: string;
  feeAmount: number;
  accountingHead: string;
  description: string;
  active: boolean;
}

const mockMappings: FeeMapping[] = [
  {
    id: "1",
    eventName: "Court Order Issued",
    eventCode: "COURT_ORDER",
    feeCode: "FEE_COURT_001",
    feeName: "Court Filing Fee",
    feeAmount: 150.0,
    accountingHead: "4100 - Court Fees Revenue",
    description: "Fee for filing case in court",
    active: true,
  },
  {
    id: "2",
    eventName: "Summons Issued",
    eventCode: "SUMMONS",
    feeCode: "FEE_SUM_001",
    feeName: "Summons Preparation Fee",
    feeAmount: 75.0,
    accountingHead: "4110 - Legal Fees Revenue",
    description: "Fee for preparing and issuing summons",
    active: true,
  },
  {
    id: "3",
    eventName: "Writ of Execution",
    eventCode: "WRIT_EXEC",
    feeCode: "FEE_WRIT_001",
    feeName: "Writ Issuance Fee",
    feeAmount: 200.0,
    accountingHead: "4120 - Enforcement Fees",
    description: "Fee for issuing writ of execution",
    active: true,
  },
  {
    id: "4",
    eventName: "Garnishment Order",
    eventCode: "GARNISH",
    feeCode: "FEE_GARN_001",
    feeName: "Garnishment Processing Fee",
    feeAmount: 100.0,
    accountingHead: "4120 - Enforcement Fees",
    description: "Fee for processing garnishment order",
    active: true,
  },
];

export default function FeeMappings() {
  const [mappings, setMappings] = useState<FeeMapping[]>(mockMappings);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<FeeMapping | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    eventName: "",
    eventCode: "",
    feeCode: "",
    feeName: "",
    feeAmount: 0,
    accountingHead: "",
    description: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingMapping) {
      setMappings(
        mappings.map((mapping) =>
          mapping.id === editingMapping.id
            ? { ...editingMapping, ...formData }
            : mapping
        )
      );
      toast({
        title: "Success",
        description: "Fee mapping updated successfully",
      });
    } else {
      const newMapping: FeeMapping = {
        id: Date.now().toString(),
        ...formData,
        active: true,
      };
      setMappings([...mappings, newMapping]);
      toast({
        title: "Success",
        description: "Fee mapping created successfully",
      });
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      eventName: "",
      eventCode: "",
      feeCode: "",
      feeName: "",
      feeAmount: 0,
      accountingHead: "",
      description: "",
    });
    setEditingMapping(null);
  };

  const handleEdit = (mapping: FeeMapping) => {
    setEditingMapping(mapping);
    setFormData({
      eventName: mapping.eventName,
      eventCode: mapping.eventCode,
      feeCode: mapping.feeCode,
      feeName: mapping.feeName,
      feeAmount: mapping.feeAmount,
      accountingHead: mapping.accountingHead,
      description: mapping.description,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setMappings(mappings.filter((mapping) => mapping.id !== id));
    toast({
      title: "Success",
      description: "Fee mapping deleted successfully",
    });
  };

  const columns: LgColumnDef<FeeMapping>[] = useMemo(() => [
    { accessorKey: "eventName", header: "Event Name", meta: { label: "Event Name", pinLeft: true } },
    { accessorKey: "eventCode", header: "Event Code", meta: { label: "Event Code" } },
    { accessorKey: "feeCode", header: "Fee Code", meta: { label: "Fee Code" } },
    { accessorKey: "feeName", header: "Fee Name", meta: { label: "Fee Name" } },
    { 
      accessorKey: "feeAmount", 
      header: "Amount", 
      meta: { label: "Amount", align: "right" },
      cell: ({ getValue }) => `EC$ ${Number(getValue()).toFixed(2)}`
    },
    { accessorKey: "accountingHead", header: "Accounting Head", meta: { label: "Accounting Head" } },
    { 
      accessorKey: "active", 
      header: "Status", 
      meta: { label: "Status" },
      cell: ({ getValue }) => <LgStatusBadge status={getValue() ? "ACTIVE" : "INACTIVE"} />
    },
  ], []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Fee Mappings</h1>
          <p className="text-muted-foreground">
            Map legal events to fee codes
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add Fee Mapping
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                {editingMapping ? "Edit Fee Mapping" : "Add Fee Mapping"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="eventName">Event Name</Label>
                  <Input
                    id="eventName"
                    value={formData.eventName}
                    onChange={(e) =>
                      setFormData({ ...formData, eventName: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eventCode">Event Code</Label>
                  <Input
                    id="eventCode"
                    value={formData.eventCode}
                    onChange={(e) =>
                      setFormData({ ...formData, eventCode: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="feeCode">Fee Code</Label>
                  <Input
                    id="feeCode"
                    value={formData.feeCode}
                    onChange={(e) =>
                      setFormData({ ...formData, feeCode: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="feeName">Fee Name</Label>
                  <Input
                    id="feeName"
                    value={formData.feeName}
                    onChange={(e) =>
                      setFormData({ ...formData, feeName: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="feeAmount">Fee Amount (EC$)</Label>
                  <Input
                    id="feeAmount"
                    type="number"
                    step="0.01"
                    value={formData.feeAmount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        feeAmount: parseFloat(e.target.value),
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountingHead">Accounting Head</Label>
                  <Input
                    id="accountingHead"
                    value={formData.accountingHead}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        accountingHead: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingMapping ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <LgDataGrid
        id="lg.fees"
        columns={columns}
        data={mappings}
        searchPlaceholder="Search fee mapping..."
        rowActions={buildLgRowActions({
          onEdit: handleEdit,
          onDelete: (r) => handleDelete(r.id),
        })}
        exportFilename="legal-fee-mappings"
      />
    </div>
  );
}
