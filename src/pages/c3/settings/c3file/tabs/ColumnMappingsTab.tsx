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
import type { C3ColumnMapping } from '@/types/c3FileConfig';

interface ColumnMappingsTabProps {
  formatId: string;
}

export default function ColumnMappingsTab({ formatId }: ColumnMappingsTabProps) {
  const [mappings, setMappings] = useState<C3ColumnMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRowType, setFilterRowType] = useState<string>('ALL');

  useEffect(() => {
    loadMappings();
  }, [formatId]);

  const loadMappings = async () => {
    setLoading(true);
    const data = await c3FileConfigService.getColumnMappings(formatId);
    setMappings(data);
    setLoading(false);
  };

  const filteredMappings = filterRowType === 'ALL' 
    ? mappings 
    : mappings.filter(m => m.rowType === filterRowType);

  const getRowTypeBadge = (rowType: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      HEADER: 'default',
      DETAIL: 'secondary',
      FOOTER: 'outline',
    };
    return <Badge variant={variants[rowType] || 'default'}>{rowType}</Badge>;
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <Button
              variant={filterRowType === 'ALL' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterRowType('ALL')}
            >
              All ({mappings.length})
            </Button>
            <Button
              variant={filterRowType === 'HEADER' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterRowType('HEADER')}
            >
              Header ({mappings.filter(m => m.rowType === 'HEADER').length})
            </Button>
            <Button
              variant={filterRowType === 'DETAIL' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterRowType('DETAIL')}
            >
              Detail ({mappings.filter(m => m.rowType === 'DETAIL').length})
            </Button>
            <Button
              variant={filterRowType === 'FOOTER' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterRowType('FOOTER')}
            >
              Footer ({mappings.filter(m => m.rowType === 'FOOTER').length})
            </Button>
          </div>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Column Mapping
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading column mappings...</div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Row Type</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Column Code</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Field Type</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Maps To</TableHead>
                  <TableHead>Validation</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMappings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No column mappings found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMappings.map((mapping) => (
                    <TableRow key={mapping.mappingId}>
                      <TableCell>{getRowTypeBadge(mapping.rowType)}</TableCell>
                      <TableCell className="font-medium">{mapping.columnPosition}</TableCell>
                      <TableCell className="font-mono text-xs">{mapping.columnCode}</TableCell>
                      <TableCell>{mapping.displayName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{mapping.fieldType}</Badge>
                      </TableCell>
                      <TableCell>
                        {mapping.required ? (
                          <Badge variant="destructive" className="text-xs">Required</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Optional</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{mapping.mapsTo}</TableCell>
                      <TableCell className="text-xs font-mono max-w-[150px] truncate">
                        {mapping.validationPattern || '-'}
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
      </CardContent>
    </Card>
  );
}
