import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TabEmptyState } from '../components';

interface Col<T> {
  key: string;
  label: string;
  render?: (r: T) => React.ReactNode;
  align?: 'left' | 'right';
}

export function SimpleTable<T extends { id?: string | number }>({
  rows,
  columns,
  empty,
}: {
  rows: T[];
  columns: Col<T>[];
  empty: string;
}) {
  if (!rows?.length) return <TabEmptyState title={empty} />;
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead key={c.key} className={c.align === 'right' ? 'text-right' : ''}>
                {c.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={(r as any).id ?? i}>
              {columns.map((c) => (
                <TableCell key={c.key} className={c.align === 'right' ? 'text-right tabular-nums' : ''}>
                  {c.render ? c.render(r) : ((r as any)[c.key] ?? '—')}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
