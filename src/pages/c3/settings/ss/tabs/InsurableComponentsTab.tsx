import { useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getInsurableComponentsByScheme, createInsurableComponent, updateInsurableComponent, deleteInsurableComponent } from '@/services/ssSettingsService';
import type { SSInsurableComponent } from '@/types/ssSettings';

interface InsurableComponentsTabProps {
  schemeId: string;
}

export default function InsurableComponentsTab({ schemeId }: InsurableComponentsTabProps) {
  const { toast } = useToast();
  const [components, setComponents] = useState(getInsurableComponentsByScheme(schemeId));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<SSInsurableComponent | null>(null);

  const handleSave = (component: Partial<SSInsurableComponent>) => {
    if (editingComponent) {
      updateInsurableComponent(editingComponent.componentRuleId, component, 'current-user');
      toast({ title: 'Success', description: 'Component rule updated' });
    } else {
      createInsurableComponent({ ...component, schemeId } as any, 'current-user');
      toast({ title: 'Success', description: 'Component rule created' });
    }
    setComponents(getInsurableComponentsByScheme(schemeId));
    setDialogOpen(false);
    setEditingComponent(null);
  };

  const handleDelete = (componentRuleId: string) => {
    deleteInsurableComponent(componentRuleId, 'current-user');
    setComponents(getInsurableComponentsByScheme(schemeId));
    toast({ title: 'Success', description: 'Component rule deleted' });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Insurable Earnings Components</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingComponent(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Component
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingComponent ? 'Edit' : 'Add'} Component Rule</DialogTitle>
            </DialogHeader>
            <ComponentForm component={editingComponent} onSave={handleSave} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Component Code</TableHead>
              <TableHead>Component Name</TableHead>
              <TableHead>Insurable?</TableHead>
              <TableHead>Self-Employed</TableHead>
              <TableHead>Voluntary</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {components.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No components configured.
                </TableCell>
              </TableRow>
            ) : (
              components.map((comp) => (
                <TableRow key={comp.componentRuleId}>
                  <TableCell className="font-medium">{comp.componentCode}</TableCell>
                  <TableCell>{comp.componentName}</TableCell>
                  <TableCell>
                    <Badge variant={comp.includeInInsurableEarnings ? 'default' : 'secondary'}>
                      {comp.includeInInsurableEarnings ? 'Yes' : 'No'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={comp.includeForSelfEmployed ? 'default' : 'secondary'}>
                      {comp.includeForSelfEmployed ? 'Yes' : 'No'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={comp.includeForVoluntary ? 'default' : 'secondary'}>
                      {comp.includeForVoluntary ? 'Yes' : 'No'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={comp.status === 'Active' ? 'default' : 'secondary'}>
                      {comp.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingComponent(comp);
                          setDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(comp.componentRuleId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ComponentForm({ component, onSave }: { component: SSInsurableComponent | null; onSave: (comp: Partial<SSInsurableComponent>) => void }) {
  const [componentCode, setComponentCode] = useState(component?.componentCode || '');
  const [componentName, setComponentName] = useState(component?.componentName || '');
  const [includeInsurable, setIncludeInsurable] = useState(component?.includeInInsurableEarnings ?? true);
  const [includeSelfEmployed, setIncludeSelfEmployed] = useState(component?.includeForSelfEmployed ?? true);
  const [includeVoluntary, setIncludeVoluntary] = useState(component?.includeForVoluntary ?? true);
  const [effectiveFrom, setEffectiveFrom] = useState(component?.effectiveFrom || new Date().toISOString().split('T')[0]);

  const handleSubmit = () => {
    onSave({
      componentCode,
      componentName,
      includeInInsurableEarnings: includeInsurable,
      includeForSelfEmployed: includeSelfEmployed,
      includeForVoluntary: includeVoluntary,
      effectiveFrom,
      effectiveTo: null,
      status: 'Active',
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Component Code</Label>
        <Input value={componentCode} onChange={(e) => setComponentCode(e.target.value)} placeholder="BASIC" />
      </div>
      <div className="space-y-2">
        <Label>Component Name</Label>
        <Input value={componentName} onChange={(e) => setComponentName(e.target.value)} placeholder="Basic Salary" />
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox checked={includeInsurable} onCheckedChange={(v) => setIncludeInsurable(v as boolean)} />
        <Label>Include in Insurable Earnings</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox checked={includeSelfEmployed} onCheckedChange={(v) => setIncludeSelfEmployed(v as boolean)} />
        <Label>Include for Self-Employed</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox checked={includeVoluntary} onCheckedChange={(v) => setIncludeVoluntary(v as boolean)} />
        <Label>Include for Voluntary</Label>
      </div>
      <div className="space-y-2">
        <Label>Effective From</Label>
        <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSubmit}>Save</Button>
      </div>
    </div>
  );
}
