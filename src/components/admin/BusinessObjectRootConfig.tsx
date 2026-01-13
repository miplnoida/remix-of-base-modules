import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, Key, Tag, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  // Fetch available tables from the public schema
  const { data: tables = [] } = useQuery({
    queryKey: ['public-tables'],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_public_tables' as any);
      
      if (error) {
        // Fallback: return common tables if function doesn't exist
        return [
          { table_name: 'sample_applications' },
          { table_name: 'ip_registrations' },
          { table_name: 'employer_registrations' },
          { table_name: 'bema_registrations' },
          { table_name: 'compliance_registrations' },
        ];
      }
      return data || [];
    },
  });

  // Fetch columns for the selected table
  const { data: columns = [] } = useQuery({
    queryKey: ['table-columns', primaryTable],
    queryFn: async () => {
      if (!primaryTable) return [];
      
      const { data, error } = await supabase
        .rpc('get_table_columns' as any, { p_table_name: primaryTable });
      
      if (error) {
        // Fallback: return common columns
        return [
          { column_name: 'id' },
          { column_name: 'status' },
          { column_name: 'created_at' },
          { column_name: 'updated_at' },
        ];
      }
      return data || [];
    },
    enabled: !!primaryTable,
  });

  // Common table options as fallback
  const tableOptions = tables.length > 0 
    ? tables.map((t: any) => t.table_name)
    : [
        'sample_applications',
        'ip_registrations', 
        'employer_registrations',
        'bema_registrations',
        'compliance_registrations',
        'bema_c3_submissions',
        'bema_contributors',
      ];

  const columnOptions = columns.length > 0
    ? columns.map((c: any) => c.column_name)
    : ['id', 'status', 'created_at', 'updated_at', 'name', 'ssn', 'registration_number'];

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
      
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Primary Table *
          </Label>
          <Select
            value={primaryTable || ''}
            onValueChange={onPrimaryTableChange}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select primary table" />
            </SelectTrigger>
            <SelectContent>
              {tableOptions.map((table: string) => (
                <SelectItem key={table} value={table}>
                  {table}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            The main database table for this module
          </p>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Primary Key Column
          </Label>
          <Select
            value={primaryKeyColumn || 'id'}
            onValueChange={onPrimaryKeyColumnChange}
            disabled={disabled || !primaryTable}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select key column" />
            </SelectTrigger>
            <SelectContent>
              {columnOptions.map((column: string) => (
                <SelectItem key={column} value={column}>
                  {column}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Usually 'id' - the unique identifier column
          </p>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Business Key Column
          </Label>
          <Select
            value={businessKeyColumn || '__none__'}
            onValueChange={(value) => onBusinessKeyColumnChange(value === '__none__' ? '' : value)}
            disabled={disabled || !primaryTable}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select business key" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {columnOptions.map((column: string) => (
                <SelectItem key={column} value={column}>
                  {column}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Human-readable key (e.g., SSN, registration number)
          </p>
        </div>
      </div>
    </div>
  );

  if (!showTitle) {
    return content;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Database className="h-5 w-5" />
          Business Object Root
        </CardTitle>
        <CardDescription>
          Define the primary business table that workflows will operate on
        </CardDescription>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}
