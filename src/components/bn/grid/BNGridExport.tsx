import React from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Download } from 'lucide-react';
import type { Table } from '@tanstack/react-table';
import { exportCSV, exportPDF, exportXLSX, type ExportContext } from '@/lib/bn/grid/exporters';

interface Props<T> { table: Table<T>; context: ExportContext; }

export function BNGridExport<T>({ table, context }: Props<T>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5">
          <Download className="h-3.5 w-3.5" /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => exportCSV(table, context)}>CSV</DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportXLSX(table, context)}>Excel (.xlsx)</DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportPDF(table, context)}>PDF</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
