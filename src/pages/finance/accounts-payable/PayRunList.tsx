import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Eye, Plus } from 'lucide-react';
import { getPayRuns } from '@/services/benefitPayRunService';
import { useNavigate } from 'react-router-dom';

export default function PayRunList() {
  const [searchTerm, setSearchTerm] = useState('');
  const payRuns = getPayRuns();
  const navigate = useNavigate();

  const filtered = payRuns.filter(pr =>
    pr.payRunName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pr.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Benefit Pay Runs</h1>
          <p className="text-muted-foreground mt-1">Manage monthly long-term benefit payments</p>
        </div>
        <Button onClick={() => navigate('/finance/accounts-payable/pay-runs/create')}>
          <Plus className="h-4 w-4 mr-2" />
          Create New Pay Run
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input placeholder="Search by name or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pay Run ID</TableHead>
                <TableHead>Pay Run Name</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Pay Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Beneficiaries</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((pr) => (
                <TableRow key={pr.id}>
                  <TableCell className="font-medium">{pr.id}</TableCell>
                  <TableCell>{pr.payRunName}</TableCell>
                  <TableCell>{pr.periodMonth}/{pr.periodYear}</TableCell>
                  <TableCell>{pr.payDate}</TableCell>
                  <TableCell><Badge>{pr.status}</Badge></TableCell>
                  <TableCell className="text-right">{pr.totalBeneficiariesCount}</TableCell>
                  <TableCell className="text-right">XCD ${pr.totalNetAmount.toFixed(2)}</TableCell>
                  <TableCell>{pr.createdBy}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost">
                      <Eye className="h-4 w-4" />
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
