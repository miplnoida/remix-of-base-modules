import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Edit, Plus } from 'lucide-react';

interface LifeCertificateConfig {
  id: string;
  benefitType: string;
  requiresCertificate: boolean;
  frequencyMonths: number;
  gracePeriodDays: number;
  autoSuspendAfterDays: number;
  requireManualReviewBeforeSuspension: boolean;
}

const mockConfigs: LifeCertificateConfig[] = [
  {
    id: 'LCC-001',
    benefitType: 'Age Benefit',
    requiresCertificate: true,
    frequencyMonths: 12,
    gracePeriodDays: 30,
    autoSuspendAfterDays: 90,
    requireManualReviewBeforeSuspension: true
  },
  {
    id: 'LCC-002',
    benefitType: 'Survivors Benefit',
    requiresCertificate: true,
    frequencyMonths: 12,
    gracePeriodDays: 30,
    autoSuspendAfterDays: 90,
    requireManualReviewBeforeSuspension: true
  },
  {
    id: 'LCC-003',
    benefitType: 'Assistance Benefit',
    requiresCertificate: true,
    frequencyMonths: 6,
    gracePeriodDays: 30,
    autoSuspendAfterDays: 60,
    requireManualReviewBeforeSuspension: false
  },
  {
    id: 'LCC-004',
    benefitType: 'Invalidity Benefit',
    requiresCertificate: false,
    frequencyMonths: 0,
    gracePeriodDays: 0,
    autoSuspendAfterDays: 0,
    requireManualReviewBeforeSuspension: false
  }
];

export default function LifeCertificateConfig() {
  const [configs] = useState<LifeCertificateConfig[]>(mockConfigs);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Life Certificate Configuration</h1>
          <p className="text-muted-foreground mt-1">Configure life certificate requirements for each benefit type</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Configuration
        </Button>
      </div>

      <Card className="p-6">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Benefit Type</TableHead>
                <TableHead>Requires Certificate</TableHead>
                <TableHead>Frequency (Months)</TableHead>
                <TableHead>Grace Period (Days)</TableHead>
                <TableHead>Auto-Suspend After (Days)</TableHead>
                <TableHead>Manual Review</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.map((config) => (
                <TableRow key={config.id}>
                  <TableCell className="font-medium">{config.benefitType}</TableCell>
                  <TableCell>
                    <Badge variant={config.requiresCertificate ? 'default' : 'secondary'}>
                      {config.requiresCertificate ? 'Yes' : 'No'}
                    </Badge>
                  </TableCell>
                  <TableCell>{config.frequencyMonths || 'N/A'}</TableCell>
                  <TableCell>{config.gracePeriodDays || 'N/A'}</TableCell>
                  <TableCell>{config.autoSuspendAfterDays || 'N/A'}</TableCell>
                  <TableCell>
                    <Switch checked={config.requireManualReviewBeforeSuspension} disabled />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Global Settings</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Default Grace Period (Days)</Label>
              <Input type="number" defaultValue={30} />
            </div>
            <div className="space-y-2">
              <Label>Default Auto-Suspend After (Days)</Label>
              <Input type="number" defaultValue={90} />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="manual-review" defaultChecked />
            <Label htmlFor="manual-review">Require manual review before auto-suspension by default</Label>
          </div>
          <Button>Save Global Settings</Button>
        </div>
      </Card>
    </div>
  );
}
