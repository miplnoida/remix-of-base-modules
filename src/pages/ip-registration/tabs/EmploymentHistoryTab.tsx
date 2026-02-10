import React from 'react';
import { useEmploymentHistory } from '@/hooks/useEmploymentHistory';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, Calendar, Briefcase, AlertCircle } from 'lucide-react';
import { formatDisplayDate } from '@/lib/dateFormat';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface EmploymentHistoryTabProps {
  ssn: string | null | undefined;
}

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  const result = formatDisplayDate(dateStr);
  return result || dateStr;
};

const getSourceBadgeVariant = (source: string | null): 'default' | 'secondary' | 'outline' => {
  switch (source) {
    case 'C3':
      return 'default';
    case 'MANUAL':
      return 'secondary';
    default:
      return 'outline';
  }
};

export default function EmploymentHistoryTab({ ssn }: EmploymentHistoryTabProps) {
  const { data: records, isLoading, error } = useEmploymentHistory(ssn);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load employment history. Please try again later.</AlertDescription>
      </Alert>
    );
  }

  if (!records || records.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground">No Employment History</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Employment records will appear here once C3 contributions are verified.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Employment History
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Historical employment records derived from verified C3 contributions
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {records.length} Record{records.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Read-Only View</AlertTitle>
        <AlertDescription>
          Employment history records are system-generated and cannot be edited manually.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Employer</TableHead>
                <TableHead>Occupation</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Recorded</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div>{record.employer_name || record.employer_id}</div>
                        <div className="text-xs text-muted-foreground">{record.employer_id}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {record.occupation || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {formatDate(record.term_start_date)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {record.term_end_date ? formatDate(record.term_end_date) : (
                      <Badge variant="outline" className="text-xs">Current</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getSourceBadgeVariant(record.source)}>
                      {record.source || 'Unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(record.date_entered)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
