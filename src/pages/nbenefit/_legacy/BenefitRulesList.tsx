import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Edit, Copy, Archive, Eye } from 'lucide-react';
import { BenefitRuleSet } from '@/types/_legacy/benefitRulesConfig';
import { benefitRulesConfigService } from '@/services/bn/_legacy/benefitRulesConfigService';

export default function BenefitRulesList() {
  const navigate = useNavigate();
  const [benefitRules, setBenefitRules] = useState<BenefitRuleSet[]>([]);
  const [filteredRules, setFilteredRules] = useState<BenefitRuleSet[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>('ALL');

  useEffect(() => {
    loadBenefitRules();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [benefitRules, searchTerm, categoryFilter, statusFilter, branchFilter, paymentTypeFilter]);

  const loadBenefitRules = async () => {
    const rules = await benefitRulesConfigService.getAllBenefitRules();
    setBenefitRules(rules);
  };

  const applyFilters = () => {
    let filtered = [...benefitRules];

    if (searchTerm) {
      filtered = filtered.filter(
        rule =>
          rule.benefitName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          rule.benefitCode.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== 'ALL') {
      filtered = filtered.filter(rule => rule.category === categoryFilter);
    }

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(rule => rule.status === statusFilter);
    }

    if (branchFilter !== 'ALL') {
      filtered = filtered.filter(rule => rule.branch === branchFilter);
    }

    if (paymentTypeFilter !== 'ALL') {
      filtered = filtered.filter(rule => rule.paymentType === paymentTypeFilter);
    }

    setFilteredRules(filtered);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'default';
      case 'INACTIVE':
        return 'secondary';
      case 'DRAFT':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'SHORT_TERM':
        return 'bg-blue-100 text-blue-800';
      case 'LONG_TERM':
        return 'bg-green-100 text-green-800';
      case 'EMPLOYMENT_INJURY':
        return 'bg-orange-100 text-orange-800';
      case 'NON_CONTRIBUTORY':
        return 'bg-purple-100 text-purple-800';
      case 'LUMP_SUM':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Benefit Rules Configuration</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Configure and manage all Social Security benefit rules dynamically
            </p>
          </div>
          <Button onClick={() => navigate('/nbenefit/config/rules/new')} className="gap-2">
            <Plus className="h-4 w-4" />
            Create New Benefit Rule Set
          </Button>
        </div>

        {/* Filters Card */}
        <Card>
          <CardHeader>
            <CardTitle>Search & Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or code..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Categories</SelectItem>
                  <SelectItem value="SHORT_TERM">Short-Term</SelectItem>
                  <SelectItem value="LONG_TERM">Long-Term</SelectItem>
                  <SelectItem value="EMPLOYMENT_INJURY">Employment Injury</SelectItem>
                  <SelectItem value="NON_CONTRIBUTORY">Non-Contributory</SelectItem>
                  <SelectItem value="LUMP_SUM">Lump Sum</SelectItem>
                  <SelectItem value="REFUND">Refund</SelectItem>
                </SelectContent>
              </Select>

              <Select value={paymentTypeFilter} onValueChange={setPaymentTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Payment Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="PENSION">Pension</SelectItem>
                  <SelectItem value="PERIODIC">Periodic</SelectItem>
                  <SelectItem value="LUMP_SUM">Lump Sum</SelectItem>
                  <SelectItem value="REFUND">Refund</SelectItem>
                  <SelectItem value="MEDICAL_EXPENSE">Medical Expense</SelectItem>
                  <SelectItem value="GRANT">Grant</SelectItem>
                </SelectContent>
              </Select>

              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Branches</SelectItem>
                  <SelectItem value="GENERAL">General</SelectItem>
                  <SelectItem value="EMPLOYMENT_INJURY">Employment Injury</SelectItem>
                  <SelectItem value="ASSISTANCE">Assistance</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="flex items-center justify-between rounded-lg bg-muted p-4">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filteredRules.length}</span> of{' '}
            <span className="font-semibold text-foreground">{benefitRules.length}</span> benefit rules
          </p>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Benefit Code</TableHead>
                  <TableHead>Benefit Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Payment Type</TableHead>
                  <TableHead>Active From</TableHead>
                  <TableHead>Active To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-32 text-center">
                      <p className="text-muted-foreground">No benefit rules found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRules.map(rule => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-mono text-sm">{rule.benefitCode}</TableCell>
                      <TableCell className="font-medium">{rule.benefitName}</TableCell>
                      <TableCell>
                        <Badge className={getCategoryColor(rule.category)} variant="secondary">
                          {rule.category.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{rule.branch}</TableCell>
                      <TableCell className="text-sm">{rule.paymentType.replace('_', ' ')}</TableCell>
                      <TableCell className="text-sm">{new Date(rule.activeFrom).toLocaleDateString()}</TableCell>
                      <TableCell className="text-sm">
                        {rule.activeTo ? new Date(rule.activeTo).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(rule.status)}>{rule.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">v{rule.version}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/nbenefit/config/rules/${rule.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/nbenefit/config/rules/${rule.id}/edit`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost">
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost">
                            <Archive className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
