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

interface LegalRole {
  id: string;
  name: string;
  code: string;
  partyType: string;
  description: string;
  active: boolean;
}

const mockRoles: LegalRole[] = [
  {
    id: "1",
    name: "Plaintiff",
    code: "PLAINTIFF",
    partyType: "Board",
    description: "Social Security Board as plaintiff",
    active: true,
  },
  {
    id: "2",
    name: "Defendant - Employer",
    code: "DEF_EMP",
    partyType: "Employer",
    description: "Employer as defendant in arrears cases",
    active: true,
  },
  {
    id: "3",
    name: "Defendant - Insured",
    code: "DEF_INS",
    partyType: "Insured Person",
    description: "Insured person as defendant in overpayment cases",
    active: true,
  },
  {
    id: "4",
    name: "Garnishee",
    code: "GARNISHEE",
    partyType: "Third Party",
    description: "Third party garnishee (employer of debtor)",
    active: true,
  },
  {
    id: "5",
    name: "Attorney for Plaintiff",
    code: "ATT_PLAINTIFF",
    partyType: "Attorney",
    description: "Legal representation for SSB",
    active: true,
  },
  {
    id: "6",
    name: "Attorney for Defendant",
    code: "ATT_DEFENDANT",
    partyType: "Attorney",
    description: "Legal representation for defendant",
    active: true,
  },
];

export default function LegalRoles() {
  const [roles, setRoles] = useState<LegalRole[]>(mockRoles);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<LegalRole | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    partyType: "Employer",
    description: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingRole) {
      setRoles(
        roles.map((role) =>
          role.id === editingRole.id ? { ...editingRole, ...formData } : role
        )
      );
      toast({
        title: "Success",
        description: "Legal role updated successfully",
      });
    } else {
      const newRole: LegalRole = {
        id: Date.now().toString(),
        ...formData,
        active: true,
      };
      setRoles([...roles, newRole]);
      toast({
        title: "Success",
        description: "Legal role created successfully",
      });
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      partyType: "Employer",
      description: "",
    });
    setEditingRole(null);
  };

  const handleEdit = (role: LegalRole) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      code: role.code,
      partyType: role.partyType,
      description: role.description,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setRoles(roles.filter((role) => role.id !== id));
    toast({
      title: "Success",
      description: "Legal role deleted successfully",
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Legal Roles</h1>
          <p className="text-muted-foreground">
            Plaintiff, defendant, garnishee roles
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add Role
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingRole ? "Edit Legal Role" : "Add Legal Role"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Role Name</Label>
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
                <Label htmlFor="partyType">Party Type</Label>
                <select
                  id="partyType"
                  value={formData.partyType}
                  onChange={(e) =>
                    setFormData({ ...formData, partyType: e.target.value })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                >
                  <option value="Board">Board (SSB)</option>
                  <option value="Employer">Employer</option>
                  <option value="Insured Person">Insured Person</option>
                  <option value="Third Party">Third Party</option>
                  <option value="Attorney">Attorney</option>
                </select>
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
                  {editingRole ? "Update" : "Create"}
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
              <TableHead>Party Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell className="font-medium">{role.name}</TableCell>
                <TableCell>{role.code}</TableCell>
                <TableCell>{role.partyType}</TableCell>
                <TableCell>{role.description}</TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      role.active
                        ? "bg-success/10 text-success"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {role.active ? "Active" : "Inactive"}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(role)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(role.id)}
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
