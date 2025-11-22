import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { FileText, Download, Printer } from 'lucide-react';
import { getPrintedSpoiledCardsReport } from '@/services/cardManagementService';
import { format } from 'date-fns';

export default function PrintedSpoiledCardsReport() {
  const [reportData, setReportData] = useState<any[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = () => {
    const data = getPrintedSpoiledCardsReport({
      startDate: startDate || undefined,
      endDate: endDate || undefined
    });
    setReportData(data);
  };

  const handleFilter = () => {
    loadReport();
  };

  const totalPrinted = reportData.reduce((sum, row) => sum + row.printedCopies, 0);
  const totalSpoiled = reportData.reduce((sum, row) => sum + row.spoiledCopies, 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Printed & Spoiled Cards Report"
        subtitle="CRD 9.16 - Track all printed and spoiled social security cards"
        breadcrumbs={[
          { label: 'Customer Relationship', href: '/crd' },
          { label: 'Reports', href: '/crd/reports' },
          { label: 'Printed & Spoiled Cards' }
        ]}
        actions={
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Cards in Report</CardDescription>
            <CardTitle className="text-3xl">{reportData.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Printed Copies</CardDescription>
            <CardTitle className="text-3xl text-green-600">{totalPrinted}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Spoiled Copies</CardDescription>
            <CardTitle className="text-3xl text-red-600">{totalSpoiled}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Spoilage Rate</CardDescription>
            <CardTitle className="text-3xl text-orange-600">
              {totalPrinted > 0 ? ((totalSpoiled / totalPrinted) * 100).toFixed(1) : 0}%
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleFilter} className="w-full">
                Apply Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Table */}
      <Card>
        <CardHeader>
          <CardTitle>Card Print Details</CardTitle>
          <CardDescription>Detailed breakdown of printed and spoiled cards</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Insured Person</TableHead>
                <TableHead>SSN</TableHead>
                <TableHead>Card Number</TableHead>
                <TableHead>Sequence</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Printed</TableHead>
                <TableHead>Spoiled</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Printed By</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    No data available for the selected filters
                  </TableCell>
                </TableRow>
              ) : (
                reportData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{row.insuredPersonName}</TableCell>
                    <TableCell className="font-mono text-sm">{row.ssn}</TableCell>
                    <TableCell className="font-mono text-sm">{row.cardNumber}</TableCell>
                    <TableCell>#{row.issueSequence}</TableCell>
                    <TableCell className="text-sm">{row.issueReason}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-green-600">
                        <Printer className="h-4 w-4" />
                        <span className="font-semibold">{row.printedCopies}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {row.spoiledCopies > 0 ? (
                        <span className="text-red-600 font-semibold">{row.spoiledCopies}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell>{format(new Date(row.issueDate), 'MMM dd, yyyy')}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{row.printedBy}</TableCell>
                    <TableCell className="text-sm">{row.status}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
