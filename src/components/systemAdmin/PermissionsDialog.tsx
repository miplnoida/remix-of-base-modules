import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Role } from "@/types/systemAdmin";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { permissions } from "@/services/mockData/systemAdminData";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface PermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role;
}

export function PermissionsDialog({ open, onOpenChange, role }: PermissionsDialogProps) {
  const { toast } = useToast();
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const handleToggle = (permissionId: string) => {
    setSelectedPermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleSave = () => {
    toast({
      title: "Permissions Updated",
      description: `${selectedPermissions.length} permissions assigned to ${role.roleName}`,
    });
    onOpenChange(false);
  };

  const groupedPermissions = permissions.reduce((acc, perm) => {
    const module = perm.permissionKey.split('.')[0];
    if (!acc[module]) acc[module] = [];
    acc[module].push(perm);
    return acc;
  }, {} as Record<string, typeof permissions>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Manage Permissions: {role.roleName}</DialogTitle>
          <DialogDescription>
            Select permissions to assign to this role
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-6">
            {Object.entries(groupedPermissions).map(([module, perms]) => (
              <div key={module} className="space-y-3">
                <h3 className="font-semibold text-sm uppercase text-muted-foreground">
                  {module.replace('_', ' ')}
                </h3>
                <div className="space-y-2">
                  {perms.map(perm => (
                    <div key={perm.permissionId} className="flex items-start space-x-3">
                      <Checkbox
                        id={perm.permissionId}
                        checked={selectedPermissions.includes(perm.permissionId)}
                        onCheckedChange={() => handleToggle(perm.permissionId)}
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor={perm.permissionId}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {perm.permissionKey}
                        </Label>
                        <p className="text-xs text-muted-foreground">{perm.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Permissions
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
