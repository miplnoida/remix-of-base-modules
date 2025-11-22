import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, CreditCard, Printer, Filter } from 'lucide-react';
import { getAllCardIssues } from '@/services/cardManagementService';
import { getInsuredPersonById } from '@/services/serviceRequestService';
import { CardIssue } from '@/types/cardManagement';
import { format } from 'date-fns';

export default function CardManagement() {
  const [cardIssues, setCardIssues] = useState<CardIssue[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCardIssues();
  }, []);

  const loadCardIssues = () => {
    const issues = getAllCardIssues();
    setCardIssues(issues);
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      Active: 'bg-green-500',
      Issued: 'bg-blue-500',
      Replaced: 'bg-gray-500',
      Spoiled: 'bg-red-500',
      Cancelled: 'bg-orange-500'
    };
    return <Badge className={colors[status as keyof typeof colors] || 'bg-gray-500'}>{status}</Badge>;
  };

  const getReasonLabel = (code: string) => {
    const labels = {
      FIRST_ISSUE: 'First Issue',
      LOST: 'Lost',
      STOLEN: 'Stolen',
      DAMAGED: 'Damaged',
      NAME_CHANGE: 'Name Change',
      NON_CITIZEN_RENEWAL: 'Non-Citizen Renewal'
    };
    return labels[code as keyof typeof labels] || code;
  };

  const filteredIssues = cardIssues.filter((issue) => {
    const person = getInsuredPersonById(issue.insuredPersonId);
    const searchLower = searchQuery.toLowerCase();
    return (
      issue.cardNumber.toLowerCase().includes(searchLower) ||
      person?.fullName.toLowerCase().includes(searchLower) ||
      person?.ssn.includes(searchQuery)
    );
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Card Management"
        subtitle="Manage social security card issuance and replacements"
        breadcrumbs={[
          { label: 'Customer Relationship', href: '/crd' },
          { label: 'Card Management' }
        ]}
        actions={
          <Button onClick={loadCardIssues}>
            <CreditCard className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Cards Issued</CardDescription>
            <CardTitle className="text-3xl">{cardIssues.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Active Cards</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {cardIssues.filter(i => i.status === 'Active').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Replaced Cards</CardDescription>
            <CardTitle className="text-3xl text-gray-600">
              {cardIssues.filter(i => i.status === 'Replaced').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>First Issues</CardDescription>
            <CardTitle className="text-3xl text-blue-600">
              {cardIssues.filter(i => i.issueReasonCode === 'FIRST_ISSUE').length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Cards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by card number, person name, or SSN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Card Issues Table */}
      <Card>
        <CardHeader>
          <CardTitle>Card Issues</CardTitle>
          <CardDescription>All social security card issuances and replacements</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Card Number</TableHead>
                <TableHead>Insured Person</TableHead>
                <TableHead>SSN</TableHead>
                <TableHead>Sequence</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIssues.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No card issues found
                  </TableCell>
                </TableRow>
              ) : (
                filteredIssues.map((issue) => {
                  const person = getInsuredPersonById(issue.insuredPersonId);
                  return (
                    <TableRow key={issue.cardIssueId}>
                      <TableCell className="font-mono text-sm font-medium">{issue.cardNumber}</TableCell>
                      <TableCell>{person?.fullName || 'Unknown'}</TableCell>
                      <TableCell className="font-mono text-sm">{person?.ssn || 'N/A'}</TableCell>
                      <TableCell>#{issue.issueSequence}</TableCell>
                      <TableCell>{getReasonLabel(issue.issueReasonCode)}</TableCell>
                      <TableCell>{format(new Date(issue.issueDate), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>{getStatusBadge(issue.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{issue.createdBy}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
