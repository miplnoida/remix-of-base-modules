import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Search, Eye } from 'lucide-react';
import { ServiceRequest } from '@/types/serviceRequest';
import { 
  getAllServiceRequests, 
  getInsuredPersonById,
  getServiceTypeById 
} from '@/services/serviceRequestService';
import { format } from 'date-fns';

export default function ServiceRequestList() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = () => {
    const allRequests = getAllServiceRequests();
    setRequests(allRequests);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft':
        return 'bg-gray-500';
      case 'Invoice Generated':
        return 'bg-blue-500';
      case 'Payment Pending':
        return 'bg-yellow-500';
      case 'Payment Received':
        return 'bg-green-500';
      case 'Under Review':
        return 'bg-purple-500';
      case 'Completed':
        return 'bg-green-700';
      case 'Rejected':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const filteredRequests = requests.filter((req) => {
    const person = getInsuredPersonById(req.insuredPersonId);
    const serviceType = getServiceTypeById(req.serviceTypeId);
    const searchLower = searchQuery.toLowerCase();
    
    return (
      req.id.toLowerCase().includes(searchLower) ||
      person?.fullName.toLowerCase().includes(searchLower) ||
      person?.ssn.includes(searchQuery) ||
      serviceType?.name.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Service Requests"
        subtitle="View and manage all service requests"
        breadcrumbs={[
          { label: 'Insured Persons', href: '/person/ip-management' },
          { label: 'Service Requests' },
        ]}
        actions={
          <Button onClick={() => navigate('/person/service-requests/new')}>
            <PlusCircle className="h-4 w-4 mr-2" />
            New Request
          </Button>
        }
      />

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by Request ID, Person Name, SSN, or Service Type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Request ID</TableHead>
              <TableHead>Insured Person</TableHead>
              <TableHead>Service Type</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No service requests found
                </TableCell>
              </TableRow>
            ) : (
              filteredRequests.map((request) => {
                const person = getInsuredPersonById(request.insuredPersonId);
                const serviceType = getServiceTypeById(request.serviceTypeId);
                
                return (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.id}</TableCell>
                    <TableCell>
                      <div>{person?.fullName}</div>
                      <div className="text-sm text-muted-foreground">{person?.ssn}</div>
                    </TableCell>
                    <TableCell>{serviceType?.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {request.priorityId === 'PRI003' ? 'Urgent' : request.priorityId === 'PRI002' ? 'High' : 'Normal'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(request.createdAt), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
