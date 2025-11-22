import { useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getCeilingsByScheme, createCeiling, updateCeiling, deleteCeiling } from '@/services/ssSettingsService';
import type { SSCeiling } from '@/types/ssSettings';

interface CeilingsTabProps {
  schemeId: string;
}

export default function CeilingsTab({ schemeId }: CeilingsTabProps) {
  const { toast } = useToast();
  const [ceilings, setCeilings] = useState(getCeilingsByScheme(schemeId));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCeiling, setEditingCeiling] = useState<SSCeiling | null>(null);

  const handleSave = (ceiling: Partial<SSCeiling>) => {
    if (editingCeiling) {
      updateCeiling(editingCeiling.ceilingId, ceiling, 'current-user');
      toast({ title: 'Success', description: 'Ceiling updated' });
    } else {
      createCeiling({ ...ceiling, schemeId } as any, 'current-user');
      toast({ title: 'Success', description: 'Ceiling created' });
    }
    setCeilings(getCeilingsByScheme(schemeId));
    setDialogOpen(false);
    setEditingCeiling(null);
  };

  const handleDelete = (ceilingId: string) => {
    deleteCeiling(ceilingId, 'current-user');
    setCeilings(getCeilingsByScheme(schemeId));
    toast({ title: 'Success', description: 'Ceiling deleted' });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Contribution Ceilings & Limits</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingCeiling(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Ceiling
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCeiling ? 'Edit' : 'Add'} Ceiling</DialogTitle>
            </DialogHeader>
            <CeilingForm ceiling={editingCeiling} onSave={handleSave} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period Type</TableHead>
              <TableHead>Applies To</TableHead>
              <TableHead>Ceiling Amount (XCD)</TableHead>
              <TableHead>Effective From</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ceilings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No ceilings configured.
                </TableCell>
              </TableRow>
            ) : (
              ceilings.map((ceiling) => (
                <TableRow key={ceiling.ceilingId}>
                  <TableCell>{ceiling.periodType}</TableCell>
                  <TableCell>{ceiling.appliesTo}</TableCell>
                  <TableCell className="font-medium">XCD {ceiling.ceilingAmount.toLocaleString()}</TableCell>
                  <TableCell>{new Date(ceiling.effectiveFrom).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={ceiling.status === 'Active' ? 'default' : 'secondary'}>
                      {ceiling.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingCeiling(ceiling);
                          setDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(ceiling.ceilingId)}
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

function CeilingForm({ ceiling, onSave }: { ceiling: SSCeiling | null; onSave: (ceiling: Partial<SSCeiling>) => void }) {
  const [periodType, setPeriodType] = useState(ceiling?.periodType || 'Monthly');
  const [appliesTo, setAppliesTo] = useState(ceiling?.appliesTo || 'All');
  const [ceilingAmount, setCeilingAmount] = useState(ceiling?.ceilingAmount.toString() || '6500');
  const [effectiveFrom, setEffectiveFrom] = useState(ceiling?.effectiveFrom || new Date().toISOString().split('T')[0]);

  const handleSubmit = () => {
    onSave({
      periodType: periodType as any,
      appliesTo: appliesTo as any,
      ceilingAmount: parseFloat(ceilingAmount),
      effectiveFrom,
      effectiveTo: null,
      status: 'Active',
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Period Type</Label>
        <Select value={periodType} onValueChange={(v) => setPeriodType(v as any)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Weekly">Weekly</SelectItem>
            <SelectItem value="Fortnightly">Fortnightly</SelectItem>
            <SelectItem value="Monthly">Monthly</SelectItem>
            <SelectItem value="Annual">Annual</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Applies To</Label>
        <Select value={appliesTo} onValueChange={(v) => setAppliesTo(v as any)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All</SelectItem>
            <SelectItem value="MainScheme">Main Scheme</SelectItem>
            <SelectItem value="EmploymentInjury">Employment Injury</SelectItem>
            <SelectItem value="Severance">Severance</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Ceiling Amount (XCD)</Label>
        <Input type="number" value={ceilingAmount} onChange={(e) => setCeilingAmount(e.target.value)} />
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
