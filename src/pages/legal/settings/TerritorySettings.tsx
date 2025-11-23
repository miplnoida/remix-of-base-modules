import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TerritoryMapping {
  id: string;
  territory: string;
  court: string;
  courtAddress: string;
  defaultJudge: string;
  registrar: string;
  bailiffOffice: string;
  workingDays: string;
  notes: string;
  active: boolean;
}

const mockMappings: TerritoryMapping[] = [
  {
    id: "1",
    territory: "St Kitts",
    court: "High Court St Kitts",
    courtAddress: "Church Street, Basseterre, St Kitts",
    defaultJudge: "Hon. Justice Williams",
    registrar: "Mrs. Thompson, Registrar",
    bailiffOffice: "Bailiff Office - Basseterre",
    workingDays: "Monday - Friday",
    notes: "Main court for St Kitts island",
    active: true,
  },
  {
    id: "2",
    territory: "Nevis",
    court: "High Court Nevis",
    courtAddress: "Court House, Charlestown, Nevis",
    defaultJudge: "Hon. Justice Robinson",
    registrar: "Mr. Jones, Registrar",
    bailiffOffice: "Bailiff Office - Charlestown",
    workingDays: "Monday - Friday",
    notes: "Main court for Nevis island",
    active: true,
  },
];

export default function TerritorySettings() {
  const [mappings, setMappings] = useState<TerritoryMapping[]>(mockMappings);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<TerritoryMapping | null>(
    null
  );
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    territory: "St Kitts",
    court: "",
    courtAddress: "",
    defaultJudge: "",
    registrar: "",
    bailiffOffice: "",
    workingDays: "Monday - Friday",
    notes: "",
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
        description: "Territory mapping updated successfully",
      });
    } else {
      const newMapping: TerritoryMapping = {
        id: Date.now().toString(),
        ...formData,
        active: true,
      };
      setMappings([...mappings, newMapping]);
      toast({
        title: "Success",
        description: "Territory mapping created successfully",
      });
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      territory: "St Kitts",
      court: "",
      courtAddress: "",
      defaultJudge: "",
      registrar: "",
      bailiffOffice: "",
      workingDays: "Monday - Friday",
      notes: "",
    });
    setEditingMapping(null);
  };

  const handleEdit = (mapping: TerritoryMapping) => {
    setEditingMapping(mapping);
    setFormData({
      territory: mapping.territory,
      court: mapping.court,
      courtAddress: mapping.courtAddress,
      defaultJudge: mapping.defaultJudge,
      registrar: mapping.registrar,
      bailiffOffice: mapping.bailiffOffice,
      workingDays: mapping.workingDays,
      notes: mapping.notes,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setMappings(mappings.filter((mapping) => mapping.id !== id));
    toast({
      title: "Success",
      description: "Territory mapping deleted successfully",
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Territory Settings
          </h1>
          <p className="text-muted-foreground">
            St Kitts vs Nevis court mappings
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add Territory Mapping
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingMapping
                  ? "Edit Territory Mapping"
                  : "Add Territory Mapping"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="territory">Territory</Label>
                <select
                  id="territory"
                  value={formData.territory}
                  onChange={(e) =>
                    setFormData({ ...formData, territory: e.target.value })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                >
                  <option value="St Kitts">St Kitts</option>
                  <option value="Nevis">Nevis</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="court">Court Name</Label>
                <Input
                  id="court"
                  value={formData.court}
                  onChange={(e) =>
                    setFormData({ ...formData, court: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="courtAddress">Court Address</Label>
                <Textarea
                  id="courtAddress"
                  value={formData.courtAddress}
                  onChange={(e) =>
                    setFormData({ ...formData, courtAddress: e.target.value })
                  }
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="defaultJudge">Default Judge</Label>
                  <Input
                    id="defaultJudge"
                    value={formData.defaultJudge}
                    onChange={(e) =>
                      setFormData({ ...formData, defaultJudge: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registrar">Registrar</Label>
                  <Input
                    id="registrar"
                    value={formData.registrar}
                    onChange={(e) =>
                      setFormData({ ...formData, registrar: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bailiffOffice">Bailiff Office</Label>
                  <Input
                    id="bailiffOffice"
                    value={formData.bailiffOffice}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bailiffOffice: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workingDays">Working Days</Label>
                  <Input
                    id="workingDays"
                    value={formData.workingDays}
                    onChange={(e) =>
                      setFormData({ ...formData, workingDays: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
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

      <Card className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Territory</TableHead>
              <TableHead>Court</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Default Judge</TableHead>
              <TableHead>Registrar</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mappings.map((mapping) => (
              <TableRow key={mapping.id}>
                <TableCell className="font-medium">
                  {mapping.territory}
                </TableCell>
                <TableCell>{mapping.court}</TableCell>
                <TableCell>{mapping.courtAddress}</TableCell>
                <TableCell>{mapping.defaultJudge}</TableCell>
                <TableCell>{mapping.registrar}</TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      mapping.active
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {mapping.active ? "Active" : "Inactive"}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(mapping)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(mapping.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
