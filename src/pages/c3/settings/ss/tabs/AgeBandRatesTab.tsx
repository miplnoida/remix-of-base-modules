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
import { getAgeBandRatesByScheme, createAgeBandRate, updateAgeBandRate, deleteAgeBandRate } from '@/services/ssSettingsService';
import type { SSAgeBandRate } from '@/types/ssSettings';

interface AgeBandRatesTabProps {
  schemeId: string;
}

export default function AgeBandRatesTab({ schemeId }: AgeBandRatesTabProps) {
  const { toast } = useToast();
  const [rates, setRates] = useState(getAgeBandRatesByScheme(schemeId));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<SSAgeBandRate | null>(null);

  const handleSave = (rate: Partial<SSAgeBandRate>) => {
    if (editingRate) {
      updateAgeBandRate(editingRate.rateBandId, rate, 'current-user');
      toast({ title: 'Success', description: 'Age band rate updated' });
    } else {
      createAgeBandRate({ ...rate, schemeId } as any, 'current-user');
      toast({ title: 'Success', description: 'Age band rate created' });
    }
    setRates(getAgeBandRatesByScheme(schemeId));
    setDialogOpen(false);
    setEditingRate(null);
  };

  const handleDelete = (rateBandId: string) => {
    deleteAgeBandRate(rateBandId, 'current-user');
    setRates(getAgeBandRatesByScheme(schemeId));
    toast({ title: 'Success', description: 'Age band rate deleted' });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Age Bands & Contribution Rates</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingRate(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Age Band
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingRate ? 'Edit' : 'Add'} Age Band Rate</DialogTitle>
            </DialogHeader>
            <AgeBandRateForm rate={editingRate} onSave={handleSave} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contributor Type</TableHead>
              <TableHead>Age Range</TableHead>
              <TableHead>Employee Rate</TableHead>
              <TableHead>Employer Rate</TableHead>
              <TableHead>Injury Rate</TableHead>
              <TableHead>Effective From</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No age band rates configured. Add one to get started.
                </TableCell>
              </TableRow>
            ) : (
              rates.map((rate) => (
                <TableRow key={rate.rateBandId}>
                  <TableCell>{rate.contributorType}</TableCell>
                  <TableCell>{rate.ageFrom} - {rate.ageTo || '∞'}</TableCell>
                  <TableCell>{rate.employeeRatePercent}%</TableCell>
                  <TableCell>{rate.employerRatePercent}%</TableCell>
                  <TableCell>{rate.injuryRatePercent}%</TableCell>
                  <TableCell>{new Date(rate.effectiveFrom).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={rate.status === 'Active' ? 'default' : 'secondary'}>
                      {rate.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingRate(rate);
                          setDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(rate.rateBandId)}
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

function AgeBandRateForm({ rate, onSave }: { rate: SSAgeBandRate | null; onSave: (rate: Partial<SSAgeBandRate>) => void }) {
  const [contributorType, setContributorType] = useState(rate?.contributorType || 'Employed');
  const [ageFrom, setAgeFrom] = useState(rate?.ageFrom.toString() || '16');
  const [ageTo, setAgeTo] = useState(rate?.ageTo?.toString() || '62');
  const [employeeRate, setEmployeeRate] = useState(rate?.employeeRatePercent.toString() || '5');
  const [employerRate, setEmployerRate] = useState(rate?.employerRatePercent.toString() || '5');
  const [injuryRate, setInjuryRate] = useState(rate?.injuryRatePercent.toString() || '1');
  const [effectiveFrom, setEffectiveFrom] = useState(rate?.effectiveFrom || new Date().toISOString().split('T')[0]);
  const [effectiveTo, setEffectiveTo] = useState(rate?.effectiveTo || '');

  const handleSubmit = () => {
    onSave({
      contributorType: contributorType as any,
      ageFrom: parseInt(ageFrom),
      ageTo: ageTo ? parseInt(ageTo) : null,
      employeeRatePercent: parseFloat(employeeRate),
      employerRatePercent: parseFloat(employerRate),
      injuryRatePercent: parseFloat(injuryRate),
      appliesTo: ['MainScheme', 'EmploymentInjury'],
      effectiveFrom,
      effectiveTo: effectiveTo || null,
      status: 'Active',
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
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
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Age From</Label>
          <Input type="number" value={ageFrom} onChange={(e) => setAgeFrom(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Age To (leave empty for no limit)</Label>
          <Input type="number" value={ageTo} onChange={(e) => setAgeTo(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Employee Rate (%)</Label>
          <Input type="number" step="0.01" value={employeeRate} onChange={(e) => setEmployeeRate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Employer Rate (%)</Label>
          <Input type="number" step="0.01" value={employerRate} onChange={(e) => setEmployerRate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Employment Injury Rate (%)</Label>
          <Input type="number" step="0.01" value={injuryRate} onChange={(e) => setInjuryRate(e.target.value)} />
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
