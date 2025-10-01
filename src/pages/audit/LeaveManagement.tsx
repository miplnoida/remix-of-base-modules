import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, CheckCircle, XCircle, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { leaveRequests, auditors } from '@/data/auditData';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

export default function LeaveAndVacationManagement() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredLeaves = leaveRequests.filter(leave => 
    statusFilter === 'all' || leave.status === statusFilter
  );

  const getStatusBadge = (status: string) => {
    const colors = {
      'Draft': 'bg-gray-500',
      'Submitted': 'bg-blue-500',
      'Approved': 'bg-green-500',
      'Rejected': 'bg-red-500'
    };
    return <Badge className={colors[status as keyof typeof colors] || 'bg-gray-500'}>{status}</Badge>;
  };

  const getLeaveTypeBadge = (type: string) => {
    const colors = {
      'Annual': 'bg-green-600',
      'Sick': 'bg-orange-600',
      'Training': 'bg-blue-600',
      'Other': 'bg-gray-600'
    };
    return <Badge className={colors[type as keyof typeof colors] || 'bg-gray-600'}>{type}</Badge>;
  };

  const handleApprove = (leaveId: string) => {
    toast({
      title: "Leave Approved",
      description: "Leave request has been approved successfully."
    });
  };

  const handleReject = (leaveId: string) => {
    toast({
      title: "Leave Rejected",
      description: "Leave request has been rejected.",
      variant: "destructive"
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leave and Vacation Management</h1>
          <p className="text-muted-foreground">
            Manage leave requests, vacation approvals, and time off for auditors |
            <Link to="/" className="text-blue-600 hover:underline ml-1">← Back to Dashboard</Link> |
            <Link to="/audit/calendar" className="text-blue-600 hover:underline ml-1">View Calendar</Link>
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Leave Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Submit Leave Request</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Auditor</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select auditor" />
                  </SelectTrigger>
                  <SelectContent>
                    {auditors.map(auditor => (
                      <SelectItem key={auditor.id} value={auditor.id}>
                        {auditor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Leave Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Annual">Annual Leave</SelectItem>
                    <SelectItem value="Sick">Sick Leave</SelectItem>
                    <SelectItem value="Training">Training</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input type="date" />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input type="date" />
                </div>
              </div>
              <div>
                <Label>Reason</Label>
                <Textarea placeholder="Provide reason for leave..." rows={3} />
              </div>
              <div>
                <Label>Attachment (optional)</Label>
                <Input type="file" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline">Cancel</Button>
                <Button onClick={() => toast({ title: "Request Submitted", description: "Leave request has been submitted for approval" })}>
                  Submit Request
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {leaveRequests.filter(l => l.status === 'Submitted').length}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting decision</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {leaveRequests.filter(l => l.status === 'Approved').length}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {leaveRequests.filter(l => l.status === 'Rejected').length}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leaveRequests.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Button 
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('all')}
            >
              All
            </Button>
            <Button 
              variant={statusFilter === 'Submitted' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('Submitted')}
            >
              Pending
            </Button>
            <Button 
              variant={statusFilter === 'Approved' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('Approved')}
            >
              Approved
            </Button>
            <Button 
              variant={statusFilter === 'Rejected' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('Rejected')}
            >
              Rejected
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Leave Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Leave Requests ({filteredLeaves.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request ID</TableHead>
                <TableHead>Auditor</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeaves.map((leave) => {
                const duration = Math.ceil(
                  (new Date(leave.endDate).getTime() - new Date(leave.startDate).getTime()) / (1000 * 60 * 60 * 24)
                ) + 1;
                
                return (
                  <TableRow key={leave.id}>
                    <TableCell className="font-medium">{leave.requestId}</TableCell>
                    <TableCell>{leave.auditorName}</TableCell>
                    <TableCell>{getLeaveTypeBadge(leave.leaveType)}</TableCell>
                    <TableCell>{new Date(leave.startDate).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(leave.endDate).toLocaleDateString()}</TableCell>
                    <TableCell>{duration} day{duration > 1 ? 's' : ''}</TableCell>
                    <TableCell>{getStatusBadge(leave.status)}</TableCell>
                    <TableCell>
                      {leave.status === 'Submitted' && (
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-green-600"
                            onClick={() => handleApprove(leave.id)}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-red-600"
                            onClick={() => handleReject(leave.id)}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                      {leave.status === 'Approved' && (
                        <span className="text-sm text-muted-foreground">
                          By {leave.approverName}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
