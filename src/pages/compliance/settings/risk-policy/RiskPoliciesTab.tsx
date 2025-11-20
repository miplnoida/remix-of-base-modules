import { useState, useEffect } from 'react';
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
import { Plus, Eye, Edit, CheckCircle } from 'lucide-react';
import { riskPolicyService } from '@/services/riskPolicyService';
import { RiskPolicy } from '@/types/riskPolicy';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function RiskPoliciesTab() {
  const [policies, setPolicies] = useState<RiskPolicy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    try {
      setLoading(true);
      const data = await riskPolicyService.getPolicyHistory();
      setPolicies(data.policies);
    } catch (error) {
      toast.error('Failed to load risk policies');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleActivatePolicy = async (id: string) => {
    try {
      await riskPolicyService.activatePolicy(id, 'current.user');
      await loadPolicies();
      toast.success('Risk policy activated successfully');
    } catch (error) {
      toast.error('Failed to activate policy');
      console.error(error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Risk Policies</h3>
          <p className="text-sm text-muted-foreground">
            Configure how risk factors are combined to generate employer risk scores
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create New Policy
        </Button>
      </div>

      {/* Policies Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Policy ID</TableHead>
              <TableHead>Policy Name</TableHead>
              <TableHead>Effective From</TableHead>
              <TableHead>Effective To</TableHead>
              <TableHead># of Factors</TableHead>
              <TableHead>Update Frequency</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  Loading policies...
                </TableCell>
              </TableRow>
            ) : policies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No risk policies found
                </TableCell>
              </TableRow>
            ) : (
              policies.map((policy) => (
                <TableRow key={policy.id}>
                  <TableCell className="font-medium">{policy.policyId}</TableCell>
                  <TableCell>{policy.policyName}</TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(policy.effectiveFrom), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className="text-sm">
                    {policy.effectiveTo
                      ? format(new Date(policy.effectiveTo), 'MMM dd, yyyy')
                      : 'Current'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{policy.factors.length} factors</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{policy.updateFrequency}</Badge>
                  </TableCell>
                  <TableCell>
                    {policy.status === 'ACTIVE' ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        Active
                      </Badge>
                    ) : policy.status === 'DRAFT' ? (
                      <Badge variant="secondary">Draft</Badge>
                    ) : (
                      <Badge variant="outline">Retired</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(policy.lastModified), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {policy.status !== 'ACTIVE' && (
                        <>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleActivatePolicy(policy.id)}
                          >
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Active Policy Summary */}
      {!loading && policies.find(p => p.isActive) && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-green-900">
                Active Policy: {policies.find(p => p.isActive)?.policyName}
              </h4>
              <p className="text-sm text-green-700 mt-1">
                This policy is currently being used to calculate employer risk scores. It includes{' '}
                {policies.find(p => p.isActive)?.factors.length} active risk factors and runs{' '}
                {policies.find(p => p.isActive)?.updateFrequency.toLowerCase()}.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
