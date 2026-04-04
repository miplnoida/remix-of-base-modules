/**
 * Person 360 — Employers Tab
 * 
 * Source: ip_wages (contribution history) + er_master (employer details) via adapters
 * Read-only — shows employment history by distinct employer
 * Role visibility: All BN roles
 */
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Person360Employer } from '@/services/bn/person360Service';

interface EmployersTabProps {
  employers: Person360Employer[];
  isLoading?: boolean;
}

const statusColor: Record<string, string> = {
  A: 'bg-emerald-500/15 text-emerald-700',
  active: 'bg-emerald-500/15 text-emerald-700',
  I: 'bg-muted text-muted-foreground',
  inactive: 'bg-muted text-muted-foreground',
};

export const EmployersTab: React.FC<EmployersTabProps> = ({ employers, isLoading }) => (
  <div className="space-y-4">
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Reg. No</TableHead>
            <TableHead>Employer Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Contribution</TableHead>
            <TableHead>Total Weeks</TableHead>
            <TableHead>Total Wages</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
          ) : employers.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No employment records</TableCell></TableRow>
          ) : employers.map(emp => (
            <TableRow key={emp.regNo}>
              <TableCell className="font-mono font-medium">{emp.regNo}</TableCell>
              <TableCell>{emp.name}</TableCell>
              <TableCell>
                <Badge variant="outline" className={statusColor[emp.status] || 'bg-muted text-muted-foreground'}>
                  {emp.status.toUpperCase()}
                </Badge>
              </TableCell>
              <TableCell>{emp.lastContributionPeriod || '—'}</TableCell>
              <TableCell className="font-mono">{emp.totalWeeks}</TableCell>
              <TableCell className="font-mono">${emp.totalWages.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </div>
);
