import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Clock, AlertCircle, TrendingUp, Upload } from 'lucide-react';
import { actionTracking, findings, managementResponses } from '@/data/auditData';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

export default function ActionTracking() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredActions = actionTracking.filter(action =>
    statusFilter === 'all' || action.actionStatus === statusFilter
  );

  const getStatusBadge = (status: string) => {
    const colors = {
      'Not Started': 'bg-gray-500',
      'In Progress': 'bg-blue-500',
      'Implemented': 'bg-yellow-500',
      'Verified': 'bg-green-500',
      'Closed': 'bg-purple-500'
    };
    return <Badge className={colors[status as keyof typeof colors] || 'bg-gray-500'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Action Tracking</h1>
          <p className="text-muted-foreground">
            Track implementation of corrective actions from internal audits |
            <Link to="/" className="text-blue-600 hover:underline ml-1">← Back to Dashboard</Link> |
            <Link to="/audit/followups" className="text-blue-600 hover:underline ml-1">View Follow-ups</Link>
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Not Started</CardTitle>
            <Clock className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {actionTracking.filter(a => a.actionStatus === 'Not Started').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {actionTracking.filter(a => a.actionStatus === 'In Progress').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Implemented</CardTitle>
            <CheckCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {actionTracking.filter(a => a.actionStatus === 'Implemented').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {actionTracking.filter(a => a.actionStatus === 'Verified').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Closed</CardTitle>
            <AlertCircle className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {actionTracking.filter(a => a.actionStatus === 'Closed').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-6">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Not Started">Not Started</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Implemented">Implemented</SelectItem>
              <SelectItem value="Verified">Verified</SelectItem>
              <SelectItem value="Closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Action Tracking Table */}
      <Card>
        <CardHeader>
          <CardTitle>Corrective Actions ({filteredActions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Finding</TableHead>
                <TableHead>Action Plan</TableHead>
                <TableHead>Responsible</TableHead>
                <TableHead>Target Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Verification</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredActions.map((action) => {
                const finding = findings.find(f => f.id === action.findingId);
                const response = managementResponses.find(r => r.findingId === action.findingId);
                
                return (
                  <TableRow key={action.id}>
                    <TableCell>
                      <div>
                        <div className="font-semibold">{finding?.findingId}</div>
                        <div className="text-sm text-muted-foreground">{finding?.title}</div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className="text-sm whitespace-pre-line">
                        {response?.actionPlan || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {response?.responsiblePerson || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {response?.targetDate ? (
                        <Badge variant="outline">
                          {new Date(response.targetDate).toLocaleDateString()}
                        </Badge>
                      ) : 'N/A'}
                    </TableCell>
                    <TableCell>{getStatusBadge(action.actionStatus)}</TableCell>
                    <TableCell>
                      {action.verifiedBy ? (
                        <div className="text-sm">
                          <div className="font-medium">{action.verifiedBy.split('@')[0]}</div>
                          <div className="text-muted-foreground">
                            {action.verificationDate ? new Date(action.verificationDate).toLocaleDateString() : ''}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Not verified</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            Update
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Update Action Status</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Status</Label>
                              <Select defaultValue={action.actionStatus}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Not Started">Not Started</SelectItem>
                                  <SelectItem value="In Progress">In Progress</SelectItem>
                                  <SelectItem value="Implemented">Implemented</SelectItem>
                                  <SelectItem value="Verified">Verified</SelectItem>
                                  <SelectItem value="Closed">Closed</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Notes</Label>
                              <Textarea 
                                placeholder="Add notes about the action status..."
                                defaultValue={action.notes}
                                rows={3}
                              />
                            </div>
                            <div>
                              <Label>Evidence of Implementation</Label>
                              <Input type="file" multiple />
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button variant="outline">Cancel</Button>
                              <Button onClick={() => toast({ 
                                title: "Action Updated",
                                description: "Action status has been updated successfully" 
                              })}>
                                Save Changes
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
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
