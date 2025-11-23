import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Plus, Eye, DollarSign, CheckCircle, Clock, FileText } from 'lucide-react';
import { PaymentArrangement, ArrangementStatus, ArrangementSourceModule, DueItem, SourceType } from '@/types/centralPaymentArrangement';
import { centralPaymentArrangementService } from '@/services/centralPaymentArrangementService';
import { CentralPaymentArrangementWizard } from '@/components/payment/CentralPaymentArrangementWizard';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function PaymentArrangements() {
  const navigate = useNavigate();
  const [arrangements, setArrangements] = useState<PaymentArrangement[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showWizard, setShowWizard] = useState(false);
  
  // Mock employer selection for wizard
  const [selectedEmployer, setSelectedEmployer] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    // In real app, load all arrangements
    // For now, this will be empty
  }, []);

  const handleCreateArrangement = () => {
    // In real app, open employer selection dialog first
    // For demo, set mock employer
    setSelectedEmployer({
      id: 'EMP-2024-001',
      name: 'ABC Construction Ltd'
    });
    setShowWizard(true);
  };

  const handleArrangementCreated = (arrangementId: string) => {
    toast.success('Payment arrangement created');
    setShowWizard(false);
    navigate(`/finance/arrangements/${arrangementId}`);
  };

  const getStatusBadge = (status: ArrangementStatus) => {
    const variants: Record<ArrangementStatus, any> = {
      [ArrangementStatus.DRAFT]: 'secondary',
      [ArrangementStatus.ACTIVE]: 'default',
      [ArrangementStatus.COMPLETED]: 'default',
      [ArrangementStatus.SUPERSEDED]: 'secondary',
      [ArrangementStatus.CANCELLED]: 'destructive'
    };
    return variants[status] || 'secondary';
  };

  // Mock dues for demo
  const mockDues: DueItem[] = [
    {
      sourceModule: ArrangementSourceModule.COMPLIANCE,
      sourceType: SourceType.VIOLATION,
      sourceReferenceId: 'VIOL-2024-001',
      description: 'Late contribution payments - Q4 2023',
      outstandingAmount: 15000,
      isInActiveArrangement: false,
      canBeIncluded: true
    },
    {
      sourceModule: ArrangementSourceModule.FINANCE,
      sourceType: SourceType.ARREARS_PERIOD,
      sourceReferenceId: 'ARR-2024-Q1',
      description: 'Contribution arrears - January 2024',
      outstandingAmount: 8500,
      isInActiveArrangement: false,
      canBeIncluded: true
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payment Arrangements</h1>
          <p className="text-muted-foreground mt-1">
            Central payment arrangements shared across all modules
          </p>
        </div>
        <Button onClick={handleCreateArrangement}>
          <Plus className="h-4 w-4 mr-2" />
          New Arrangement
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Arrangements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">0</span>
              <CheckCircle className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Arranged
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">$0</span>
              <DollarSign className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Paid to Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">$0</span>
              <CheckCircle className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">$0</span>
              <Clock className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>All Payment Arrangements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <Input
                placeholder="Search by arrangement number or employer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>

          {arrangements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No payment arrangements yet</p>
              <p className="text-sm mb-4">Create your first payment arrangement to get started</p>
              <Button onClick={handleCreateArrangement}>
                <Plus className="h-4 w-4 mr-2" />
                Create Arrangement
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Arrangement #</TableHead>
                  <TableHead>Employer</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {arrangements.map((arrangement) => (
                  <TableRow key={arrangement.id}>
                    <TableCell className="font-mono">{arrangement.arrangementNumber}</TableCell>
                    <TableCell className="font-medium">{arrangement.employerName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{arrangement.arrangementSourceModule}</Badge>
                    </TableCell>
                    <TableCell>{arrangement.arrangementType.replace(/_/g, ' ')}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadge(arrangement.status)}>
                        {arrangement.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ${arrangement.totalArrangedAmount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ${arrangement.totalPaidAmount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ${arrangement.outstandingBalance.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {format(new Date(arrangement.startDate), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigate(`/finance/arrangements/${arrangement.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Wizard */}
      {selectedEmployer && (
        <CentralPaymentArrangementWizard
          open={showWizard}
          onOpenChange={setShowWizard}
          employerId={selectedEmployer.id}
          employerName={selectedEmployer.name}
          sourceModule={ArrangementSourceModule.FINANCE}
          preSelectedDues={mockDues}
          onArrangementCreated={handleArrangementCreated}
        />
      )}
    </div>
  );
}
