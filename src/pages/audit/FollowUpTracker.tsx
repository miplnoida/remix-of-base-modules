import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Clock, CheckCircle, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { auditFollowUps } from '@/data/auditData';
import { useToast } from '@/hooks/use-toast';

export default function FollowUpTracker() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedFollowUp, setSelectedFollowUp] = useState<any>(null);
  const [updateForm, setUpdateForm] = useState({
    status: '',
    resolution: '',
    resolvedDate: ''
  });

  const filteredFollowUps = auditFollowUps.filter(followUp => {
    const matchesSearch = followUp.actionRequired.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         followUp.responsibleName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || followUp.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const colors = {
      'Open': 'bg-blue-500',
      'In Progress': 'bg-yellow-500',
      'Resolved': 'bg-green-500',
      'Overdue': 'bg-red-500'
    };
    return <Badge className={colors[status as keyof typeof colors] || 'bg-gray-500'}>{status}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      'Low': 'bg-green-500',
      'Medium': 'bg-yellow-500',
      'High': 'bg-red-500'
    };
    return <Badge variant="outline" className={colors[priority as keyof typeof colors]}>{priority}</Badge>;
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  const handleUpdateFollowUp = (followUp: any) => {
    setSelectedFollowUp(followUp);
    setUpdateForm({
      status: followUp.status,
      resolution: followUp.resolution || '',
      resolvedDate: followUp.resolvedDate || ''
    });
  };

  const handleSaveUpdate = () => {
    toast({
      title: "Follow-up Updated",
      description: "Follow-up status has been updated successfully."
    });
    setSelectedFollowUp(null);
  };

  const overdueTasks = filteredFollowUps.filter(fu => fu.status !== 'Resolved' && isOverdue(fu.dueDate));
  const highPriorityTasks = filteredFollowUps.filter(fu => fu.priority === 'High' && fu.status !== 'Resolved');

  if (!hasPermission('manage_audit_followups')) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">You don't have permission to manage follow-ups.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Follow-Up Tracker</h1>
        <p className="text-muted-foreground">Track corrective actions and follow-ups</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <div className="ml-2">
                <p className="text-sm font-medium">Overdue</p>
                <p className="text-2xl font-bold text-red-500">{overdueTasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-yellow-500" />
              <div className="ml-2">
                <p className="text-sm font-medium">High Priority</p>
                <p className="text-2xl font-bold">{highPriorityTasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-blue-500" />
              <div className="ml-2">
                <p className="text-sm font-medium">In Progress</p>
                <p className="text-2xl font-bold">{filteredFollowUps.filter(fu => fu.status === 'In Progress').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div className="ml-2">
                <p className="text-sm font-medium">Resolved</p>
                <p className="text-2xl font-bold">{filteredFollowUps.filter(fu => fu.status === 'Resolved').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search follow-ups..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Resolved">Resolved</SelectItem>
                <SelectItem value="Overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Follow-ups Table */}
      <Card>
        <CardHeader>
          <CardTitle>Follow-up Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action Required</TableHead>
                <TableHead>Responsible Party</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFollowUps.map((followUp) => (
                <TableRow 
                  key={followUp.id}
                  className={isOverdue(followUp.dueDate) && followUp.status !== 'Resolved' ? 'bg-red-50' : ''}
                >
                  <TableCell>
                    <div>
                      <div className="font-medium">{followUp.actionRequired}</div>
                      <div className="text-sm text-muted-foreground">{followUp.description}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{followUp.responsibleParty}</div>
                      <div className="text-sm text-muted-foreground">{followUp.responsibleName}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={isOverdue(followUp.dueDate) && followUp.status !== 'Resolved' ? 'text-red-600 font-medium' : ''}>
                      {new Date(followUp.dueDate).toLocaleDateString()}
                      {isOverdue(followUp.dueDate) && followUp.status !== 'Resolved' && (
                        <div className="text-xs text-red-600">OVERDUE</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(followUp.status)}</TableCell>
                  <TableCell>{getPriorityBadge(followUp.priority)}</TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleUpdateFollowUp(followUp)}
                        >
                          Update
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Update Follow-up</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Status</Label>
                            <Select 
                              value={updateForm.status} 
                              onValueChange={(value) => setUpdateForm({...updateForm, status: value})}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Open">Open</SelectItem>
                                <SelectItem value="In Progress">In Progress</SelectItem>
                                <SelectItem value="Resolved">Resolved</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Resolution Notes</Label>
                            <Textarea
                              value={updateForm.resolution}
                              onChange={(e) => setUpdateForm({...updateForm, resolution: e.target.value})}
                              placeholder="Enter resolution details..."
                            />
                          </div>
                          {updateForm.status === 'Resolved' && (
                            <div className="space-y-2">
                              <Label>Resolution Date</Label>
                              <Input
                                type="date"
                                value={updateForm.resolvedDate}
                                onChange={(e) => setUpdateForm({...updateForm, resolvedDate: e.target.value})}
                              />
                            </div>
                          )}
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline">Cancel</Button>
                            <Button onClick={handleSaveUpdate}>Save Update</Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
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