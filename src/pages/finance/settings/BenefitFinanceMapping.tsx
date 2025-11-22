import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit } from 'lucide-react';

interface BenefitFinanceMapping {
  id: string;
  benefitType: string;
  isLongTerm: boolean;
  glExpenseAccount: string;
  apControlAccount: string;
  includeInPayRun: boolean;
  active: boolean;
}

const mockMappings: BenefitFinanceMapping[] = [
  {
    id: 'BFM-001',
    benefitType: 'Age Benefit',
    isLongTerm: true,
    glExpenseAccount: '5-100-AGE',
    apControlAccount: '2-200-AP-BENEFITS',
    includeInPayRun: true,
    active: true
  },
  {
    id: 'BFM-002',
    benefitType: 'Invalidity Benefit',
    isLongTerm: true,
    glExpenseAccount: '5-100-INV',
    apControlAccount: '2-200-AP-BENEFITS',
    includeInPayRun: true,
    active: true
  },
  {
    id: 'BFM-003',
    benefitType: 'Survivors Benefit',
    isLongTerm: true,
    glExpenseAccount: '5-100-SUR',
    apControlAccount: '2-200-AP-BENEFITS',
    includeInPayRun: true,
    active: true
  },
  {
    id: 'BFM-004',
    benefitType: 'Assistance Benefit',
    isLongTerm: true,
    glExpenseAccount: '5-100-ASS',
    apControlAccount: '2-200-AP-BENEFITS',
    includeInPayRun: true,
    active: true
  },
  {
    id: 'BFM-005',
    benefitType: 'Sickness Benefit',
    isLongTerm: false,
    glExpenseAccount: '5-101-SICK',
    apControlAccount: '2-200-AP-BENEFITS',
    includeInPayRun: false,
    active: true
  },
  {
    id: 'BFM-006',
    benefitType: 'Maternity Benefit',
    isLongTerm: false,
    glExpenseAccount: '5-101-MAT',
    apControlAccount: '2-200-AP-BENEFITS',
    includeInPayRun: false,
    active: true
  }
];

export default function BenefitFinanceMapping() {
  const [mappings] = useState<BenefitFinanceMapping[]>(mockMappings);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Benefit → Finance Mapping</h1>
          <p className="text-muted-foreground mt-1">Configure GL accounts and AP settings for each benefit type</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Mapping
        </Button>
      </div>

      <Card className="p-6">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Benefit Type</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>GL Expense Account</TableHead>
                <TableHead>AP Control Account</TableHead>
                <TableHead>Include in Pay Run</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.map((mapping) => (
                <TableRow key={mapping.id}>
                  <TableCell className="font-medium">{mapping.benefitType}</TableCell>
                  <TableCell>
                    <Badge variant={mapping.isLongTerm ? 'default' : 'secondary'}>
                      {mapping.isLongTerm ? 'Long-Term' : 'Short-Term'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{mapping.glExpenseAccount}</TableCell>
                  <TableCell className="font-mono text-sm">{mapping.apControlAccount}</TableCell>
                  <TableCell>
                    <Switch checked={mapping.includeInPayRun} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={mapping.active ? 'default' : 'secondary'}>
                      {mapping.active ? 'Active' : 'Inactive'}
                    </Badge>
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
    </div>
  );
}
