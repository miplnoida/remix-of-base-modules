import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, AlertCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { c3FileConfigService } from '@/services/c3FileConfigService';
import type { C3ValidationRule } from '@/types/c3FileConfig';

interface ValidationRulesTabProps {
  formatId: string;
}

export default function ValidationRulesTab({ formatId }: ValidationRulesTabProps) {
  const [rules, setRules] = useState<C3ValidationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');

  useEffect(() => {
    loadRules();
  }, [formatId]);

  const loadRules = async () => {
    setLoading(true);
    const data = await c3FileConfigService.getValidationRules(formatId);
    setRules(data);
    setLoading(false);
  };

  const filteredRules = filterSeverity === 'ALL' 
    ? rules 
    : rules.filter(r => r.severity === filterSeverity);

  const getSeverityIcon = (severity: string) => {
    if (severity === 'Error') {
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
    return <AlertTriangle className="h-4 w-4 text-warning" />;
  };

  const getScopeBadge = (scope: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      Row: 'default',
      File: 'secondary',
      CrossRow: 'outline',
    };
    return <Badge variant={variants[scope] || 'default'}>{scope}</Badge>;
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <Button
              variant={filterSeverity === 'ALL' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterSeverity('ALL')}
            >
              All ({rules.length})
            </Button>
            <Button
              variant={filterSeverity === 'Error' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterSeverity('Error')}
            >
              Errors ({rules.filter(r => r.severity === 'Error').length})
            </Button>
            <Button
              variant={filterSeverity === 'Warning' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterSeverity('Warning')}
            >
              Warnings ({rules.filter(r => r.severity === 'Warning').length})
            </Button>
          </div>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Validation Rule
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading validation rules...</div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Severity</TableHead>
                  <TableHead>Rule Code</TableHead>
                  <TableHead>Rule Name</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Row Type</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Error Message</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No validation rules found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRules.map((rule) => (
                    <TableRow key={rule.ruleId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getSeverityIcon(rule.severity)}
                          <span className="text-sm">{rule.severity}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-medium">{rule.ruleCode}</TableCell>
                      <TableCell className="font-medium">{rule.ruleName}</TableCell>
                      <TableCell>{getScopeBadge(rule.ruleScope)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{rule.rowTypeFilter}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="text-xs font-mono truncate" title={rule.condition}>
                          {rule.condition}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[250px]">
                        <div className="text-xs truncate" title={rule.errorMessage}>
                          {rule.errorMessage}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={rule.status === 'Active' ? 'default' : 'secondary'}>
                          {rule.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
