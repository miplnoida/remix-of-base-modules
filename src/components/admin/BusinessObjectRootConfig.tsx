import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, Key, Tag, AlertCircle, Search } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { useState, useMemo } from 'react';
import { usePublicTables, useTableColumns } from '@/hooks/useModuleTables';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BusinessObjectRootConfigProps {
  primaryTable: string;
  primaryKeyColumn: string;
  businessKeyColumn: string;
  onPrimaryTableChange: (value: string) => void;
  onPrimaryKeyColumnChange: (value: string) => void;
  onBusinessKeyColumnChange: (value: string) => void;
  disabled?: boolean;
  showTitle?: boolean;
}

export function BusinessObjectRootConfig({
  primaryTable,
  primaryKeyColumn,
  businessKeyColumn,
  onPrimaryTableChange,
  onPrimaryKeyColumnChange,
  onBusinessKeyColumnChange,
  disabled = false,
  showTitle = true,
}: BusinessObjectRootConfigProps) {
  const [tableSearch, setTableSearch] = useState('');
  
  // Fetch tables and columns from database
  const { data: tables = [], isLoading: isLoadingTables } = usePublicTables();
  const { data: columns = [], isLoading: isLoadingColumns } = useTableColumns(primaryTable || null);

  // Filter tables based on search
  const filteredTables = useMemo(() => {
    if (!tableSearch) return tables;
    return tables.filter(t => 
      t.table_name.toLowerCase().includes(tableSearch.toLowerCase())
    );
  }, [tables, tableSearch]);

  // Handle table change - reset column selections
  const handleTableChange = (value: string) => {
    onPrimaryTableChange(value);
    onPrimaryKeyColumnChange('id'); // Reset to default
    onBusinessKeyColumnChange(''); // Reset
  };

  const content = (
    <div className="space-y-4">
      {!primaryTable && !disabled && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Business Object Root must be configured before workflows can be bound to this module.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="space-y-4">
        {/* Primary Table Selection */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            Primary Table *
          </Label>
          <Select
            value={primaryTable || ''}
            onValueChange={handleTableChange}
            disabled={disabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={isLoadingTables ? "Loading tables..." : "Select primary table"} />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <div className="p-2 border-b">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tables..."
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    className="pl-8 h-9"
                  />
                </div>
              </div>
              <ScrollArea className="h-[200px]">
                {filteredTables.map((table) => (
                  <SelectItem key={table.table_name} value={table.table_name}>
                    <div className="flex items-center gap-2">
                      <Database className="h-3 w-3 text-muted-foreground" />
                      {table.table_name}
                    </div>
                  </SelectItem>
                ))}
                {filteredTables.length === 0 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No tables found
                  </div>
                )}
              </ScrollArea>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            The main database table for this module
          </p>
        </div>

        {/* Columns Selection Row */}
        {primaryTable && (
          <div className="grid gap-4 md:grid-cols-2">
            {/* Primary Key Column */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Key className="h-4 w-4 text-primary" />
                Primary Key Column
              </Label>
              <Select
                value={primaryKeyColumn || 'id'}
                onValueChange={onPrimaryKeyColumnChange}
                disabled={disabled || isLoadingColumns}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingColumns ? "Loading..." : "Select key column"} />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <ScrollArea className="h-[200px]">
                    {columns.map((column) => (
                      <SelectItem key={column.column_name} value={column.column_name}>
                        <div className="flex items-center gap-2">
                          <span>{column.column_name}</span>
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            {column.data_type}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Usually 'id' - the unique identifier
              </p>
            </div>

            {/* Business Key Column */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" />
                Business Key Column
              </Label>
              <Select
                value={businessKeyColumn || '__none__'}
                onValueChange={(value) => onBusinessKeyColumnChange(value === '__none__' ? '' : value)}
                disabled={disabled || isLoadingColumns}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingColumns ? "Loading..." : "Select business key"} />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <ScrollArea className="h-[200px]">
                    <SelectItem value="__none__">
                      <span className="text-muted-foreground">None (optional)</span>
                    </SelectItem>
                    {columns.map((column) => (
                      <SelectItem key={column.column_name} value={column.column_name}>
                        <div className="flex items-center gap-2">
                          <span>{column.column_name}</span>
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            {column.data_type}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Human-readable key (e.g., SSN, reg_number)
              </p>
            </div>
          </div>
        )}

        {/* Selected Configuration Summary */}
        {primaryTable && (
          <div className="mt-2 p-3 bg-muted/50 rounded-md border">
            <p className="text-xs font-medium text-muted-foreground mb-2">Configuration Summary</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Database className="h-3 w-3" />
                {primaryTable}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Key className="h-3 w-3" />
                {primaryKeyColumn || 'id'}
              </Badge>
              {businessKeyColumn && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  {businessKeyColumn}
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (!showTitle) {
    return content;
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="h-4 w-4 text-primary" />
          Business Object Root
        </CardTitle>
        <CardDescription className="text-xs">
          Define the primary business table that workflows will operate on
        </CardDescription>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}
