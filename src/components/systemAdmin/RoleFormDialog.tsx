import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { DbRole, useCreateDbRole, useUpdateDbRole } from "@/hooks/useRolesData";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface RoleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: DbRole;
}

export function RoleFormDialog({ open, onOpenChange, role }: RoleFormDialogProps) {
  const [formData, setFormData] = useState({
    role_name: "",
    description: "",
    is_system_role: false,
    mfa_required: false,
  });

  const createRole = useCreateDbRole();
  const updateRole = useUpdateDbRole();
  const isSubmitting = createRole.isPending || updateRole.isPending;

  useEffect(() => {
    if (role) {
      setFormData({
        role_name: role.role_name,
        description: role.description || "",
        is_system_role: role.is_system_role,
        mfa_required: role.mfa_required,
      });
    } else {
      setFormData({
        role_name: "",
        description: "",
        is_system_role: false,
        mfa_required: false,
      });
    }
  }, [role, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (role) {
        await updateRole.mutateAsync({
          id: role.id,
          role_name: formData.role_name,
          description: formData.description,
          mfa_required: formData.mfa_required,
        });
      } else {
        await createRole.mutateAsync({
          role_name: formData.role_name,
          description: formData.description,
          is_system_role: formData.is_system_role,
          mfa_required: formData.mfa_required,
        });
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{role ? "Edit Role" : "Add New Role"}</DialogTitle>
          <DialogDescription>
            {role ? "Update role details" : "Create a new system role"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role_name">Role Name *</Label>
            <Input
              id="role_name"
              required
              value={formData.role_name}
              onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
              placeholder="e.g., Finance Manager"
              disabled={role?.is_system_role}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the role responsibilities and purpose"
              rows={4}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="mfa_required">Require MFA</Label>
              <p className="text-xs text-muted-foreground">Users with this role must use MFA</p>
            </div>
            <Switch
              id="mfa_required"
              checked={formData.mfa_required}
              onCheckedChange={(checked) => setFormData({ ...formData, mfa_required: checked })}
            />
          </div>

          {!role && (
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="is_system_role">System Role</Label>
                <p className="text-xs text-muted-foreground">System roles cannot be deleted</p>
              </div>
              <Switch
                id="is_system_role"
                checked={formData.is_system_role}
                onCheckedChange={(checked) => setFormData({ ...formData, is_system_role: checked })}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {role ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
