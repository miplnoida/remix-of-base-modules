import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
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
import type { C3ContributionMapping } from '@/types/c3FileConfig';

interface ContributionMappingTabProps {
  formatId: string;
}

export default function ContributionMappingTab({ formatId }: ContributionMappingTabProps) {
  const [mappings, setMappings] = useState<C3ContributionMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterModule, setFilterModule] = useState<string>('ALL');

  useEffect(() => {
    loadMappings();
  }, [formatId]);

  const loadMappings = async () => {
    setLoading(true);
    const data = await c3FileConfigService.getContributionMappings(formatId);
    setMappings(data);
    setLoading(false);
  };

  const filteredMappings = filterModule === 'ALL' 
    ? mappings 
    : mappings.filter(m => m.targetModule === filterModule);

  const getModuleBadge = (module: string) => {
    const colors: Record<string, string> = {
      SocialSecurity: 'bg-blue-500',
      Levy: 'bg-green-500',
      Severance: 'bg-purple-500',
      Wages: 'bg-orange-500',
      Injury: 'bg-red-500',
    };
    return (
      <Badge className={colors[module] || 'bg-gray-500'}>
        {module}
      </Badge>
    );
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <Button
              variant={filterModule === 'ALL' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterModule('ALL')}
            >
              All ({mappings.length})
            </Button>
            <Button
              variant={filterModule === 'SocialSecurity' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterModule('SocialSecurity')}
            >
              SS ({mappings.filter(m => m.targetModule === 'SocialSecurity').length})
            </Button>
            <Button
              variant={filterModule === 'Levy' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterModule('Levy')}
            >
              Levy ({mappings.filter(m => m.targetModule === 'Levy').length})
            </Button>
            <Button
              variant={filterModule === 'Severance' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterModule('Severance')}
            >
              Severance ({mappings.filter(m => m.targetModule === 'Severance').length})
            </Button>
            <Button
              variant={filterModule === 'Wages' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterModule('Wages')}
            >
              Wages ({mappings.filter(m => m.targetModule === 'Wages').length})
            </Button>
          </div>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Contribution Mapping
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading contribution mappings...</div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mapping Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Source Field</TableHead>
                  <TableHead>Target Module</TableHead>
                  <TableHead>Target Field</TableHead>
                  <TableHead>Formula</TableHead>
                  <TableHead>Applies To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMappings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No contribution mappings found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMappings.map((mapping) => (
                    <TableRow key={mapping.mappingId}>
                      <TableCell className="font-mono text-xs font-medium">
                        {mapping.mappingCode}
                      </TableCell>
                      <TableCell className="font-medium">{mapping.description}</TableCell>
                      <TableCell className="text-xs font-mono">{mapping.sourceField}</TableCell>
                      <TableCell>{getModuleBadge(mapping.targetModule)}</TableCell>
                      <TableCell className="text-xs">{mapping.targetField}</TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="text-xs font-mono truncate" title={mapping.formula || '-'}>
                          {mapping.formula || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{mapping.appliesTo}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={mapping.status === 'Active' ? 'default' : 'secondary'}>
                          {mapping.status}
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

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-semibold mb-2">About Contribution Mapping</h4>
          <p className="text-sm text-muted-foreground">
            Contribution mappings define how C3 file fields are tied to the four calculation engines (Social Security, Levy, Severance, Wages).
            These mappings enable the system to automatically validate reported contributions against calculated amounts based on configured rules.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
