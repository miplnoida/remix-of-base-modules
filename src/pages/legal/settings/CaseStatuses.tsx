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

interface CaseStatus {
  id: string;
  name: string;
  code: string;
  stage: string;
  description: string;
  color: string;
  isFinal: boolean;
  active: boolean;
}

const mockStatuses: CaseStatus[] = [
  {
    id: "1",
    name: "Filed",
    code: "FILED",
    stage: "Pre-Judgment",
    description: "Case has been filed with the court",
    color: "blue",
    isFinal: false,
    active: true,
  },
  {
    id: "2",
    name: "Judgment Obtained",
    code: "JUDGMENT",
    stage: "Post-Judgment",
    description: "Court judgment has been obtained",
    color: "green",
    isFinal: false,
    active: true,
  },
  {
    id: "3",
    name: "In Enforcement",
    code: "ENFORCE",
    stage: "Enforcement",
    description: "Enforcement actions are underway",
    color: "orange",
    isFinal: false,
    active: true,
  },
  {
    id: "4",
    name: "Closed - Paid",
    code: "CLOSED_PAID",
    stage: "Closed",
    description: "Case closed - full payment received",
    color: "green",
    isFinal: true,
    active: true,
  },
  {
    id: "5",
    name: "Closed - Written Off",
    code: "CLOSED_WRITEOFF",
    stage: "Closed",
    description: "Case closed - amount written off",
    color: "red",
    isFinal: true,
    active: true,
  },
];

export default function CaseStatuses() {
  const [statuses, setStatuses] = useState<CaseStatus[]>(mockStatuses);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<CaseStatus | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    stage: "Pre-Judgment",
    description: "",
    color: "blue",
    isFinal: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingStatus) {
      setStatuses(
        statuses.map((status) =>
          status.id === editingStatus.id
            ? { ...editingStatus, ...formData }
            : status
        )
      );
      toast({
        title: "Success",
        description: "Case status updated successfully",
      });
    } else {
      const newStatus: CaseStatus = {
        id: Date.now().toString(),
        ...formData,
        active: true,
      };
      setStatuses([...statuses, newStatus]);
      toast({
        title: "Success",
        description: "Case status created successfully",
      });
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      stage: "Pre-Judgment",
      description: "",
      color: "blue",
      isFinal: false,
    });
    setEditingStatus(null);
  };

  const handleEdit = (status: CaseStatus) => {
    setEditingStatus(status);
    setFormData({
      name: status.name,
      code: status.code,
      stage: status.stage,
      description: status.description,
      color: status.color,
      isFinal: status.isFinal,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setStatuses(statuses.filter((status) => status.id !== id));
    toast({
      title: "Success",
      description: "Case status deleted successfully",
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Case Statuses</h1>
          <p className="text-muted-foreground">
            Configure legal case status configuration
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add Status
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingStatus ? "Edit Case Status" : "Add Case Status"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Status Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stage">Stage</Label>
                  <select
                    id="stage"
                    value={formData.stage}
                    onChange={(e) =>
                      setFormData({ ...formData, stage: e.target.value })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                  >
                    <option value="Pre-Judgment">Pre-Judgment</option>
                    <option value="Post-Judgment">Post-Judgment</option>
                    <option value="Enforcement">Enforcement</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <select
                    id="color"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                  >
                    <option value="blue">Blue</option>
                    <option value="green">Green</option>
                    <option value="orange">Orange</option>
                    <option value="red">Red</option>
                    <option value="gray">Gray</option>
                  </select>
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

              <div className="space-y-2">
                <Label htmlFor="isFinal">Is Final Status</Label>
                <select
                  id="isFinal"
                  value={formData.isFinal ? "true" : "false"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      isFinal: e.target.value === "true",
                    })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
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
                  {editingStatus ? "Update" : "Create"}
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
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Final Status</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {statuses.map((status) => (
              <TableRow key={status.id}>
                <TableCell className="font-medium">{status.name}</TableCell>
                <TableCell>{status.code}</TableCell>
                <TableCell>{status.stage}</TableCell>
                <TableCell>{status.description}</TableCell>
                <TableCell>{status.isFinal ? "Yes" : "No"}</TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      status.active
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {status.active ? "Active" : "Inactive"}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(status)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(status.id)}
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
