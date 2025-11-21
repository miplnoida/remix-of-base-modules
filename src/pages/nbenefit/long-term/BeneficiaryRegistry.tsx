import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
import { Search, Eye, Edit, UserX, CheckCircle } from 'lucide-react';
import { getBeneficiaries, suspendBeneficiary, reactivateBeneficiary } from '@/services/longTermBeneficiaryService';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export default function BeneficiaryRegistry() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterLifeCert, setFilterLifeCert] = useState('ALL');
  const beneficiaries = getBeneficiaries();
  const navigate = useNavigate();
  const { toast } = useToast();

  const filtered = beneficiaries.filter(b => {
    const matchesSearch = !searchTerm || 
      b.insuredPersonName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.insuredPersonSSN.includes(searchTerm) ||
      b.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'ALL' || b.primaryBenefitType === filterType;
    const matchesStatus = filterStatus === 'ALL' || b.status === filterStatus;
    const matchesLifeCert = filterLifeCert === 'ALL' || b.lifeCertificateStatus === filterLifeCert;

    return matchesSearch && matchesType && matchesStatus && matchesLifeCert;
  });

  const handleSuspend = (id: string) => {
    suspendBeneficiary(id, 'SUSPENDED_NO_LIFE_CERT', 'Suspended manually from registry');
    toast({ title: 'Beneficiary suspended successfully' });
    window.location.reload();
  };

  const handleReactivate = (id: string) => {
    reactivateBeneficiary(id, 'Reactivated from registry');
    toast({ title: 'Beneficiary reactivated successfully' });
    window.location.reload();
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-green-500',
      SUSPENDED_NO_LIFE_CERT: 'bg-yellow-500',
      SUSPENDED_INVESTIGATION: 'bg-orange-500',
      SUSPENDED_OVERPAYMENT: 'bg-red-500',
      DECEASED: 'bg-gray-500',
      TERMINATED: 'bg-gray-400'
    };
    return <Badge className={colors[status]}>{status.replace(/_/g, ' ')}</Badge>;
  };

  const getLifeCertBadge = (status: string) => {
    const colors: Record<string, string> = {
      NOT_REQUIRED: 'bg-gray-500',
      REQUIRED_PENDING: 'bg-yellow-500',
      RECEIVED_VALID: 'bg-green-500',
      EXPIRED: 'bg-red-500'
    };
    return <Badge className={colors[status]}>{status.replace(/_/g, ' ')}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Long-Term Beneficiary Registry</h1>
          <p className="text-muted-foreground mt-1">
            Manage all long-term benefit recipients and their payment status
          </p>
        </div>
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
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
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="SUSPENDED_NO_LIFE_CERT">Suspended - No Cert</SelectItem>
              <SelectItem value="SUSPENDED_INVESTIGATION">Suspended - Investigation</SelectItem>
              <SelectItem value="DECEASED">Deceased</SelectItem>
              <SelectItem value="TERMINATED">Terminated</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterLifeCert} onValueChange={setFilterLifeCert}>
            <SelectTrigger>
              <SelectValue placeholder="Life Cert Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Life Cert</SelectItem>
              <SelectItem value="NOT_REQUIRED">Not Required</SelectItem>
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
                <TableHead>Beneficiary ID</TableHead>
                <TableHead>Insured Person</TableHead>
                <TableHead>SSN</TableHead>
                <TableHead>Benefit Type</TableHead>
                <TableHead className="text-right">Monthly Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Last Payment</TableHead>
                <TableHead>Life Cert Status</TableHead>
                <TableHead>Life Cert Due</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((beneficiary) => (
                <TableRow key={beneficiary.id}>
                  <TableCell className="font-medium">{beneficiary.id}</TableCell>
                  <TableCell>{beneficiary.insuredPersonName}</TableCell>
                  <TableCell>{beneficiary.insuredPersonSSN}</TableCell>
                  <TableCell>{beneficiary.primaryBenefitType}</TableCell>
                  <TableCell className="text-right">
                    XCD ${beneficiary.monthlyBenefitAmount.toFixed(2)}
                  </TableCell>
                  <TableCell>{getStatusBadge(beneficiary.status)}</TableCell>
                  <TableCell>{beneficiary.paymentMethod}</TableCell>
                  <TableCell>
                    {beneficiary.lastPaymentDate || 'N/A'}
                  </TableCell>
                  <TableCell>{getLifeCertBadge(beneficiary.lifeCertificateStatus)}</TableCell>
                  <TableCell>
                    {beneficiary.lifeCertificateNextDueDate || 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/nbenefit/long-term/beneficiary/${beneficiary.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {beneficiary.status === 'ACTIVE' ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSuspend(beneficiary.id)}
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleReactivate(beneficiary.id)}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
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
