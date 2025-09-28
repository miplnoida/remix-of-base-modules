import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, FileText, Upload, Save } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { auditActivities, auditActivityResults } from '@/data/auditData';
import { useToast } from '@/hooks/use-toast';

export default function ActivityWorkbench() {
  const { user, hasPermission } = useAuth();
  const { toast } = useToast();
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [findings, setFindings] = useState({
    observations: '',
    findings: '',
    complianceStatus: '',
    monetaryVariance: 0,
    recommendation: '',
    followUpRequired: false
  });

  const myActivities = auditActivities.filter(activity => 
    activity.auditor === user?.email || hasPermission('view_audit_assignments')
  );

  const handleStartActivity = (activity: any) => {
    setSelectedActivity(activity);
    // Load existing findings if any
    const existingResult = auditActivityResults.find(r => r.activityId === activity.id);
    if (existingResult) {
      setFindings({
        observations: existingResult.observations,
        findings: existingResult.findings,
        complianceStatus: existingResult.complianceStatus,
        monetaryVariance: existingResult.monetaryVariance,
        recommendation: existingResult.recommendation,
        followUpRequired: existingResult.followUpRequired
      });
    }
  };

  const handleSaveFindings = () => {
    toast({
      title: "Findings Saved",
      description: "Activity findings have been saved successfully."
    });
  };

  const handleCompleteActivity = () => {
    if (!findings.complianceStatus || !findings.findings) {
      toast({
        title: "Validation Error",
        description: "Please complete all required fields before submitting.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Activity Completed",
      description: "Audit activity has been completed and submitted."
    });
    setSelectedActivity(null);
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      'Planned': 'bg-blue-500',
      'In Progress': 'bg-yellow-500',
      'Completed': 'bg-green-500'
    };
    return <Badge className={colors[status as keyof typeof colors] || 'bg-gray-500'}>{status}</Badge>;
  };

  if (!hasPermission('execute_audit_activities')) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">You don't have permission to execute audit activities.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Activity Workbench</h1>
        <p className="text-muted-foreground">Execute audit activities and enter findings</p>
      </div>

      {!selectedActivity ? (
        <Card>
          <CardHeader>
            <CardTitle>My Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity</TableHead>
                  <TableHead>Employer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myActivities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{activity.title}</div>
                        <div className="text-sm text-muted-foreground">{activity.type}</div>
                      </div>
                    </TableCell>
                    <TableCell>{activity.employerId}</TableCell>
                    <TableCell>{new Date(activity.startDate).toLocaleDateString()}</TableCell>
                    <TableCell>{getStatusBadge(activity.status)}</TableCell>
                    <TableCell>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleStartActivity(activity)}
                      >
                        {activity.status === 'Completed' ? 'View' : 'Start'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{selectedActivity.title}</CardTitle>
            <Button 
              variant="outline" 
              onClick={() => setSelectedActivity(null)}
              className="w-fit"
            >
              Back to Activities
            </Button>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="findings">
              <TabsList>
                <TabsTrigger value="findings">Findings</TabsTrigger>
                <TabsTrigger value="attachments">Attachments</TabsTrigger>
              </TabsList>
              
              <TabsContent value="findings" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Compliance Status</Label>
                    <Select 
                      value={findings.complianceStatus} 
                      onValueChange={(value) => setFindings({...findings, complianceStatus: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Compliant">Compliant</SelectItem>
                        <SelectItem value="Partially Compliant">Partially Compliant</SelectItem>
                        <SelectItem value="Non-Compliant">Non-Compliant</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Monetary Variance ($)</Label>
                    <Input
                      type="number"
                      value={findings.monetaryVariance}
                      onChange={(e) => setFindings({...findings, monetaryVariance: Number(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Observations</Label>
                  <Textarea
                    value={findings.observations}
                    onChange={(e) => setFindings({...findings, observations: e.target.value})}
                    placeholder="Enter detailed observations..."
                    className="min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Findings</Label>
                  <Textarea
                    value={findings.findings}
                    onChange={(e) => setFindings({...findings, findings: e.target.value})}
                    placeholder="Enter audit findings..."
                    className="min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Recommendations</Label>
                  <Textarea
                    value={findings.recommendation}
                    onChange={(e) => setFindings({...findings, recommendation: e.target.value})}
                    placeholder="Enter recommendations..."
                    className="min-h-[100px]"
                  />
                </div>

                <div className="flex justify-end space-x-4">
                  <Button variant="outline" onClick={handleSaveFindings}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Draft
                  </Button>
                  <Button onClick={handleCompleteActivity}>
                    Complete Activity
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="attachments">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Upload supporting documents
                  </p>
                  <Button variant="outline" className="mt-4">
                    <FileText className="w-4 h-4 mr-2" />
                    Select Files
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}