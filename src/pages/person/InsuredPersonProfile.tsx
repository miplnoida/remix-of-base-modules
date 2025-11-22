import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { User, FileText, DollarSign, Calendar, CreditCard } from 'lucide-react';
import { getInsuredPersonById, getServiceRequestsByInsuredPerson } from '@/services/serviceRequestService';
import { InsuredPerson, ServiceRequest } from '@/types/serviceRequest';
import { format } from 'date-fns';
import { CardHistoryTab } from './tabs/CardHistoryTab';

export default function InsuredPersonProfile() {
  const { id } = useParams<{ id: string }>();
  const [person, setPerson] = useState<InsuredPerson | null>(null);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);

  useEffect(() => {
    if (id) {
      const personData = getInsuredPersonById(id);
      setPerson(personData || null);
      
      const requests = getServiceRequestsByInsuredPerson(id);
      setServiceRequests(requests);
    }
  }, [id]);

  if (!person) {
    return (
      <div className="p-6">
        <PageHeader
          title="Person Not Found"
          subtitle="The requested insured person could not be found"
        />
      </div>
    );
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'default';
      case 'Payment Received':
      case 'Invoice Generated':
        return 'secondary';
      case 'Under Review':
        return 'outline';
      case 'Rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={person.fullName}
        subtitle={`SSN: ${person.ssn} | ID: ${person.id}`}
      />

      {/* Basic Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Full Name</p>
              <p className="font-medium">{person.fullName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">SSN</p>
              <p className="font-medium">{person.ssn}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date of Birth</p>
              <p className="font-medium">{format(new Date(person.dateOfBirth), 'PPP')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{person.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{person.contactPhone}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Address</p>
              <p className="font-medium">{person.address || 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different sections */}
      <Tabs defaultValue="services" className="w-full">
        <TabsList>
          <TabsTrigger value="services">Services Availed</TabsTrigger>
          <TabsTrigger value="cards">Card History</TabsTrigger>
          <TabsTrigger value="contributions">Contributions</TabsTrigger>
          <TabsTrigger value="benefits">Benefits</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Services Availed
              </CardTitle>
              <CardDescription>
                All services requested by this insured person
              </CardDescription>
            </CardHeader>
            <CardContent>
              {serviceRequests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No services availed yet
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request ID</TableHead>
                      <TableHead>Service Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount Paid</TableHead>
                      <TableHead>Request Date</TableHead>
                      <TableHead>Invoice Number</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {serviceRequests.map(request => (
                      <TableRow key={request.id}>
                        <TableCell className="font-mono text-sm">{request.id}</TableCell>
                        <TableCell>
                          {/* This would need to lookup service type name */}
                          {request.serviceTypeId}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(request.status)}>
                            {request.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {request.invoiceId ? (
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {/* This would need to fetch actual invoice amount */}
                              -
                            </span>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(request.createdAt), 'PP')}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {request.invoiceId || 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cards">
          <CardHistoryTab insuredPersonId={person.id} />
        </TabsContent>

        <TabsContent value="contributions">
          <Card>
            <CardHeader>
              <CardTitle>Contribution History</CardTitle>
              <CardDescription>View all contribution records</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-8">
                Contribution history will be displayed here
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="benefits">
          <Card>
            <CardHeader>
              <CardTitle>Benefits History</CardTitle>
              <CardDescription>View all benefits received</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-8">
                Benefits history will be displayed here
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
