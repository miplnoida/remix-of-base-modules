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

interface HearingType {
  id: string;
  name: string;
  code: string;
  description: string;
  estimatedDuration: number;
  requiresNotice: boolean;
  active: boolean;
}

const mockHearingTypes: HearingType[] = [
  {
    id: "1",
    name: "Mention",
    code: "MENTION",
    description: "Initial court mention to set hearing dates",
    estimatedDuration: 15,
    requiresNotice: true,
    active: true,
  },
  {
    id: "2",
    name: "Full Hearing",
    code: "HEARING",
    description: "Complete hearing with evidence presentation",
    estimatedDuration: 120,
    requiresNotice: true,
    active: true,
  },
  {
    id: "3",
    name: "Assessment",
    code: "ASSESS",
    description: "Assessment of damages or amounts",
    estimatedDuration: 60,
    requiresNotice: true,
    active: true,
  },
  {
    id: "4",
    name: "Judgment Delivery",
    code: "JUDGMENT",
    description: "Court delivers judgment",
    estimatedDuration: 30,
    requiresNotice: false,
    active: true,
  },
];

export default function HearingTypes() {
  const [hearingTypes, setHearingTypes] = useState<HearingType[]>(mockHearingTypes);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<HearingType | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    estimatedDuration: 30,
    requiresNotice: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingType) {
      setHearingTypes(
        hearingTypes.map((type) =>
          type.id === editingType.id
            ? { ...editingType, ...formData }
            : type
        )
      );
      toast({
        title: "Success",
        description: "Hearing type updated successfully",
      });
    } else {
      const newType: HearingType = {
        id: Date.now().toString(),
        ...formData,
        active: true,
      };
      setHearingTypes([...hearingTypes, newType]);
      toast({
        title: "Success",
        description: "Hearing type created successfully",
      });
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      description: "",
      estimatedDuration: 30,
      requiresNotice: true,
    });
    setEditingType(null);
  };

  const handleEdit = (type: HearingType) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      code: type.code,
      description: type.description,
      estimatedDuration: type.estimatedDuration,
      requiresNotice: type.requiresNotice,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setHearingTypes(hearingTypes.filter((type) => type.id !== id));
    toast({
      title: "Success",
      description: "Hearing type deleted successfully",
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Hearing Types</h1>
          <p className="text-muted-foreground">
            Configure hearing types and their properties
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add Hearing Type
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingType ? "Edit Hearing Type" : "Add Hearing Type"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Hearing Type Name</Label>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Estimated Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.estimatedDuration}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        estimatedDuration: parseInt(e.target.value),
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notice">Requires Notice</Label>
                  <select
                    id="notice"
                    value={formData.requiresNotice ? "true" : "false"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        requiresNotice: e.target.value === "true",
                      })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
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
                  {editingType ? "Update" : "Create"}
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
              <TableHead>Description</TableHead>
              <TableHead>Duration (min)</TableHead>
              <TableHead>Requires Notice</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hearingTypes.map((type) => (
              <TableRow key={type.id}>
                <TableCell className="font-medium">{type.name}</TableCell>
                <TableCell>{type.code}</TableCell>
                <TableCell>{type.description}</TableCell>
                <TableCell>{type.estimatedDuration}</TableCell>
                <TableCell>{type.requiresNotice ? "Yes" : "No"}</TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      type.active
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {type.active ? "Active" : "Inactive"}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(type)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(type.id)}
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
