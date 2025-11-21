import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, CheckCircle, UserX } from 'lucide-react';
import { getBeneficiaries, bulkSuspendForMissingCertificate } from '@/services/longTermBeneficiaryService';
import { useToast } from '@/hooks/use-toast';

export default function LifeCertificateManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { toast } = useToast();
  
  const beneficiaries = getBeneficiaries().filter(b => 
    b.lifeCertificateStatus !== 'NOT_REQUIRED'
  );

  const filtered = beneficiaries.filter(b => {
    const matchesSearch = !searchTerm || 
      b.insuredPersonName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.insuredPersonSSN.includes(searchTerm) ||
      b.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'ALL' || b.primaryBenefitType === filterType;
    const matchesStatus = filterStatus === 'ALL' || b.lifeCertificateStatus === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(b => b.id));
    }
  };

  const handleBulkSuspend = () => {
    const count = bulkSuspendForMissingCertificate(selectedIds);
    toast({ 
      title: 'Bulk Action Completed', 
      description: `${count} beneficiaries suspended for missing life certificate` 
    });
    setSelectedIds([]);
    window.location.reload();
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const getLifeCertBadge = (status: string, dueDate?: string) => {
    const overdue = isOverdue(dueDate);
    const colors: Record<string, string> = {
      REQUIRED_PENDING: overdue ? 'bg-red-500' : 'bg-yellow-500',
      RECEIVED_VALID: 'bg-green-500',
      EXPIRED: 'bg-red-500'
    };
    return (
      <Badge className={colors[status] || 'bg-gray-500'}>
        {status.replace(/_/g, ' ')}
        {overdue && ' (OVERDUE)'}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Life Certificate Management</h1>
          <p className="text-muted-foreground mt-1">
            Bulk management of life certificates for proof of aliveness
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            disabled={selectedIds.length === 0}
            onClick={handleBulkSuspend}
            variant="destructive"
          >
            <UserX className="h-4 w-4 mr-2" />
            Suspend Selected ({selectedIds.length})
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by name, SSN, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger>
              <SelectValue placeholder="Benefit Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="AGE">Age Benefit</SelectItem>
              <SelectItem value="INVALIDITY">Invalidity</SelectItem>
              <SelectItem value="ASSISTANCE">Assistance</SelectItem>
              <SelectItem value="SURVIVORS">Survivors</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Life Cert Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="REQUIRED_PENDING">Required - Pending</SelectItem>
              <SelectItem value="RECEIVED_VALID">Received - Valid</SelectItem>
              <SelectItem value="EXPIRED">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.length === filtered.length && filtered.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Beneficiary ID</TableHead>
                <TableHead>Insured Person</TableHead>
                <TableHead>SSN</TableHead>
                <TableHead>Benefit Type</TableHead>
                <TableHead>Last Payment</TableHead>
                <TableHead>Last Certificate</TableHead>
                <TableHead>Next Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((beneficiary) => (
                <TableRow key={beneficiary.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(beneficiary.id)}
                      onCheckedChange={() => handleToggleSelect(beneficiary.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{beneficiary.id}</TableCell>
                  <TableCell>{beneficiary.insuredPersonName}</TableCell>
                  <TableCell>{beneficiary.insuredPersonSSN}</TableCell>
                  <TableCell>{beneficiary.primaryBenefitType}</TableCell>
                  <TableCell>{beneficiary.lastPaymentDate || 'N/A'}</TableCell>
                  <TableCell>
                    {beneficiary.lifeCertificateLastReceivedDate || 'Never'}
                  </TableCell>
                  <TableCell className={isOverdue(beneficiary.lifeCertificateNextDueDate) ? 'text-red-500 font-bold' : ''}>
                    {beneficiary.lifeCertificateNextDueDate || 'N/A'}
                  </TableCell>
                  <TableCell>
                    {getLifeCertBadge(beneficiary.lifeCertificateStatus, beneficiary.lifeCertificateNextDueDate)}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.location.href = `/nbenefit/long-term/beneficiary/${beneficiary.id}?tab=lifecycle`}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Record
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No beneficiaries found matching your filters</p>
          </div>
        )}
      </Card>
    </div>
  );
}
