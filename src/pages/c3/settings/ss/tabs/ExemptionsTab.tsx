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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getExemptionsByScheme, createExemption, updateExemption, deleteExemption } from '@/services/ssSettingsService';
import type { SSExemption } from '@/types/ssSettings';

interface ExemptionsTabProps {
  schemeId: string;
}

export default function ExemptionsTab({ schemeId }: ExemptionsTabProps) {
  const { toast } = useToast();
  const [exemptions, setExemptions] = useState(getExemptionsByScheme(schemeId));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExemption, setEditingExemption] = useState<SSExemption | null>(null);

  const handleSave = (exemption: Partial<SSExemption>) => {
    if (editingExemption) {
      updateExemption(editingExemption.exemptionId, exemption, 'current-user');
      toast({ title: 'Success', description: 'Exemption updated' });
    } else {
      createExemption({ ...exemption, schemeId } as any, 'current-user');
      toast({ title: 'Success', description: 'Exemption created' });
    }
    setExemptions(getExemptionsByScheme(schemeId));
    setDialogOpen(false);
    setEditingExemption(null);
  };

  const handleDelete = (exemptionId: string) => {
    deleteExemption(exemptionId, 'current-user');
    setExemptions(getExemptionsByScheme(schemeId));
    toast({ title: 'Success', description: 'Exemption deleted' });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Exemptions & Special Cases</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingExemption(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Exemption
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingExemption ? 'Edit' : 'Add'} Exemption</DialogTitle>
            </DialogHeader>
            <ExemptionForm exemption={editingExemption} onSave={handleSave} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rule Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Applies To</TableHead>
              <TableHead>Contributor Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exemptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No exemptions configured.
                </TableCell>
              </TableRow>
            ) : (
              exemptions.map((exemption) => (
                <TableRow key={exemption.exemptionId}>
                  <TableCell className="font-medium">{exemption.ruleName}</TableCell>
                  <TableCell className="max-w-xs truncate">{exemption.description}</TableCell>
                  <TableCell>{exemption.appliesTo}</TableCell>
                  <TableCell>{exemption.contributorType}</TableCell>
                  <TableCell>
                    <Badge variant={exemption.status === 'Active' ? 'default' : 'secondary'}>
                      {exemption.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingExemption(exemption);
                          setDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(exemption.exemptionId)}
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

function ExemptionForm({ exemption, onSave }: { exemption: SSExemption | null; onSave: (exemption: Partial<SSExemption>) => void }) {
  const [ruleName, setRuleName] = useState(exemption?.ruleName || '');
  const [description, setDescription] = useState(exemption?.description || '');
  const [appliesTo, setAppliesTo] = useState(exemption?.appliesTo || 'Contributions');
  const [contributorType, setContributorType] = useState(exemption?.contributorType || 'Employed');
  const [effectiveFrom, setEffectiveFrom] = useState(exemption?.effectiveFrom || new Date().toISOString().split('T')[0]);
  const [effectiveTo, setEffectiveTo] = useState(exemption?.effectiveTo || '');

  const handleSubmit = () => {
    onSave({
      ruleName,
      description,
      appliesTo: appliesTo as any,
      contributorType: contributorType as any,
      conditionJson: null,
      effectiveFrom,
      effectiveTo: effectiveTo || null,
      status: 'Active',
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Rule Name</Label>
        <Input value={ruleName} onChange={(e) => setRuleName(e.target.value)} placeholder="COVID-19 Relief Period" />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the exemption" rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Applies To</Label>
          <Select value={appliesTo} onValueChange={(v) => setAppliesTo(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Contributions">Contributions</SelectItem>
              <SelectItem value="Penalties">Penalties</SelectItem>
              <SelectItem value="Both">Both</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Contributor Type</Label>
          <Select value={contributorType} onValueChange={(v) => setContributorType(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Employed">Employed</SelectItem>
              <SelectItem value="Self-Employed">Self-Employed</SelectItem>
              <SelectItem value="Voluntary">Voluntary</SelectItem>
              <SelectItem value="All">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Effective From</Label>
          <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Effective To (optional)</Label>
          <Input type="date" value={effectiveTo} onChange={(e) => setEffectiveTo(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSubmit}>Save</Button>
      </div>
    </div>
  );
}
