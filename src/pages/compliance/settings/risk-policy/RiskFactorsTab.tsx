import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Search, Edit, Power } from 'lucide-react';
import { riskFactorService } from '@/services/riskFactorService';
import { RiskFactor } from '@/types/riskPolicy';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function RiskFactorsTab() {
  const [factors, setFactors] = useState<RiskFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadFactors();
  }, []);

  const loadFactors = async () => {
    try {
      setLoading(true);
      const data = await riskFactorService.getAllFactors();
      setFactors(data);
    } catch (error) {
      toast.error('Failed to load risk factors');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await riskFactorService.toggleFactorStatus(id);
      await loadFactors();
      toast.success('Risk factor status updated');
    } catch (error) {
      toast.error('Failed to update status');
      console.error(error);
    }
  };

  const filteredFactors = factors.filter(factor =>
    factor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    factor.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    factor.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search risk factors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Risk Factor
        </Button>
      </div>

      {/* Risk Factors Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Factor Code</TableHead>
              <TableHead>Factor Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Data Source</TableHead>
              <TableHead>Calculation Method</TableHead>
              <TableHead>Default Weight</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Modified</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  Loading risk factors...
                </TableCell>
              </TableRow>
            ) : filteredFactors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No risk factors found
                </TableCell>
              </TableRow>
            ) : (
              filteredFactors.map((factor) => (
                <TableRow key={factor.id}>
                  <TableCell className="font-medium">{factor.code}</TableCell>
                  <TableCell>{factor.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{factor.category}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {factor.dataSource.replace(/_/g, ' ')}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {factor.calculationMethod.replace(/_/g, ' ')}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{factor.defaultWeight}</Badge>
                  </TableCell>
                  <TableCell>
                    {factor.active ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(factor.lastModified), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(factor.id)}
                      >
                        <Power
                          className={`h-4 w-4 ${
                            factor.active ? 'text-green-600' : 'text-muted-foreground'
                          }`}
                        />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Total Factors</div>
          <div className="text-2xl font-semibold mt-1">{factors.length}</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Active Factors</div>
          <div className="text-2xl font-semibold mt-1 text-green-600">
            {factors.filter(f => f.active).length}
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Compliance Factors</div>
          <div className="text-2xl font-semibold mt-1">
            {factors.filter(f => f.category === 'COMPLIANCE').length}
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Financial Factors</div>
          <div className="text-2xl font-semibold mt-1">
            {factors.filter(f => f.category === 'FINANCIAL').length}
          </div>
        </div>
      </div>
    </div>
  );
}
