import React, { useState } from 'react';
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
import { Card } from '@/components/ui/card';
import { Plus, Search, Edit, Copy, Power, Eye } from 'lucide-react';
import { MOCK_FEE_DEFINITIONS } from '@/services/mockData/feeDefinitions';
import { FeeDefinition } from '@/types/feeConfiguration';
import { formatXCD } from '@/utils/formatCurrency';

const FeeConfigurationList = () => {
  const navigate = useNavigate();
  const [fees] = useState<FeeDefinition[]>(MOCK_FEE_DEFINITIONS);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');

  const filteredFees = fees.filter(fee => {
    const matchesSearch = 
      fee.feeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fee.feeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fee.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || fee.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || fee.status === statusFilter;
    const matchesModule = moduleFilter === 'all' || fee.applicableModules.includes(moduleFilter);
    
    return matchesSearch && matchesCategory && matchesStatus && matchesModule;
  });

  const getFeeTypeDisplay = (fee: FeeDefinition) => {
    if (fee.feeType === 'Fixed') {
      return formatXCD(fee.fixedAmount || 0);
    } else if (fee.feeType === 'Percentage') {
      return `${fee.percentageRate}% of ${fee.baseType}`;
    } else {
      return 'Formula';
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      Active: 'default',
      Inactive: 'secondary',
      Draft: 'secondary',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fee Configuration</h1>
          <p className="text-gray-600">
            Central fee management for all modules (Legal, Compliance, Benefits, Services)
          </p>
        </div>
        <Button onClick={() => navigate('/finance/settings/fee-configuration/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Create New Fee
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search fees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Legal">Legal</SelectItem>
              <SelectItem value="Compliance">Compliance</SelectItem>
              <SelectItem value="Benefits">Benefits</SelectItem>
              <SelectItem value="Service">Service</SelectItem>
              <SelectItem value="Admin">Admin</SelectItem>
              <SelectItem value="Audit">Audit</SelectItem>
              <SelectItem value="Finance">Finance</SelectItem>
            </SelectContent>
          </Select>

          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Module" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modules</SelectItem>
              <SelectItem value="Legal">Legal</SelectItem>
              <SelectItem value="Compliance">Compliance</SelectItem>
              <SelectItem value="Benefits">Benefits</SelectItem>
              <SelectItem value="Admin">Admin</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Results Summary */}
      <div className="text-sm text-gray-600">
        Showing {filteredFees.length} of {fees.length} fees
      </div>

      {/* Fee Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fee Code</TableHead>
              <TableHead>Fee Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>SubCategory</TableHead>
              <TableHead>Type / Amount</TableHead>
              <TableHead>Auto Applied</TableHead>
              <TableHead>Applicable Modules</TableHead>
              <TableHead>Effective From</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFees.map((fee) => (
              <TableRow key={fee.feeId}>
                <TableCell className="font-mono text-sm">{fee.feeCode}</TableCell>
                <TableCell className="font-medium">{fee.feeName}</TableCell>
                <TableCell>{fee.category}</TableCell>
                <TableCell>{fee.subCategory || '-'}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div className="font-medium">{fee.feeType}</div>
                    <div className="text-gray-500">{getFeeTypeDisplay(fee)}</div>
                  </div>
                </TableCell>
                <TableCell>
                  {fee.isAutoApplied ? (
                    <Badge variant="default">Yes</Badge>
                  ) : (
                    <Badge variant="secondary">Manual</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {fee.applicableModules.map((module, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {module}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  {new Date(fee.effectiveFrom).toLocaleDateString()}
                </TableCell>
                <TableCell>{getStatusBadge(fee.status)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/finance/settings/fee-configuration/${fee.feeId}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/finance/settings/fee-configuration/${fee.feeId}/edit`)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // Clone fee
                        console.log('Clone fee:', fee.feeId);
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // Toggle status
                        console.log('Toggle status:', fee.feeId);
                      }}
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default FeeConfigurationList;
