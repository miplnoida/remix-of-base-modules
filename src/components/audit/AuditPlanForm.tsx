import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { zones, employers } from '@/data/auditData';
import { useToast } from '@/hooks/use-toast';

interface AuditPlanFormProps {
  plan?: any;
  onClose: () => void;
}

export function AuditPlanForm({ plan, onClose }: AuditPlanFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    period: plan?.period || 'Monthly',
    monthYear: plan?.monthYear || '',
    zone: plan?.zone || '',
    description: ''
  });

  const [selectedEmployers, setSelectedEmployers] = useState<any[]>([]);
  const [employerAssignments, setEmployerAssignments] = useState<any[]>([]);

  const zoneEmployers = employers.filter(emp => emp.zone === formData.zone);

  const handleZoneChange = (zone: string) => {
    setFormData({ ...formData, zone });
    setSelectedEmployers([]);
    setEmployerAssignments([]);
  };

  const handleEmployerSelection = (employer: any) => {
    if (!selectedEmployers.find(e => e.id === employer.id)) {
      const newAssignment = {
        employer,
        riskRating: 'Medium',
        rationale: '',
        auditor: ''
      };
      setSelectedEmployers([...selectedEmployers, employer]);
      setEmployerAssignments([...employerAssignments, newAssignment]);
    }
  };

  const updateAssignment = (employerId: string, field: string, value: string) => {
    setEmployerAssignments(prev => 
      prev.map(assignment => 
        assignment.employer.id === employerId 
          ? { ...assignment, [field]: value }
          : assignment
      )
    );
  };

  const removeEmployer = (employerId: string) => {
    setSelectedEmployers(prev => prev.filter(e => e.id !== employerId));
    setEmployerAssignments(prev => prev.filter(a => a.employer.id !== employerId));
  };

  const handleSaveDraft = () => {
    toast({
      title: "Draft Saved",
      description: "Audit plan has been saved as draft."
    });
    onClose();
  };

  const handleSubmit = () => {
    if (!formData.zone || !formData.monthYear || employerAssignments.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields and assign at least one employer.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Plan Submitted",
      description: "Audit plan has been submitted for approval."
    });
    onClose();
  };

  const getRiskBadge = (risk: string) => {
    const colors = {
      'Low': 'bg-green-500',
      'Medium': 'bg-yellow-500',
      'High': 'bg-red-500'
    };
    return <Badge className={colors[risk as keyof typeof colors]}>{risk}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Plan Header */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="period">Period Type</Label>
              <Select value={formData.period} onValueChange={(value) => setFormData({ ...formData, period: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Quarterly">Quarterly</SelectItem>
                  <SelectItem value="Annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthYear">Month/Year</Label>
              <Input
                id="monthYear"
                type="month"
                value={formData.monthYear.replace(' ', '-')}
                onChange={(e) => setFormData({ ...formData, monthYear: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zone">Zone</Label>
              <Select value={formData.zone} onValueChange={handleZoneChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select zone" />
                </SelectTrigger>
                <SelectContent>
                  {zones.map(zone => (
                    <SelectItem key={zone.id} value={zone.id}>{zone.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter plan description..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Available Employers */}
      {formData.zone && (
        <Card>
          <CardHeader>
            <CardTitle>Available Employers in {zones.find(z => z.id === formData.zone)?.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {zoneEmployers.map(employer => (
                <Card key={employer.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleEmployerSelection(employer)}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{employer.name}</h4>
                        <p className="text-sm text-muted-foreground">{employer.registrationNumber}</p>
                        <p className="text-sm text-muted-foreground">{employer.contactPerson}</p>
                      </div>
                      <Badge variant={employer.status === 'Active' ? 'default' : 'secondary'}>
                        {employer.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Employers */}
      {employerAssignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Employer Assignments ({employerAssignments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employer</TableHead>
                  <TableHead>Risk Rating</TableHead>
                  <TableHead>Rationale</TableHead>
                  <TableHead>Auditor</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employerAssignments.map((assignment) => (
                  <TableRow key={assignment.employer.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{assignment.employer.name}</div>
                        <div className="text-sm text-muted-foreground">{assignment.employer.registrationNumber}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={assignment.riskRating} 
                        onValueChange={(value) => updateAssignment(assignment.employer.id, 'riskRating', value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Textarea
                        placeholder="Enter rationale..."
                        value={assignment.rationale}
                        onChange={(e) => updateAssignment(assignment.employer.id, 'rationale', e.target.value)}
                        className="min-h-[80px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={assignment.auditor} 
                        onValueChange={(value) => updateAssignment(assignment.employer.id, 'auditor', value)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Select auditor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auditor.jdoe@secureserve.gov">John Doe</SelectItem>
                          <SelectItem value="auditor.asmith@secureserve.gov">Alice Smith</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => removeEmployer(assignment.employer.id)}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant="outline" onClick={handleSaveDraft}>Save Draft</Button>
        <Button onClick={handleSubmit}>Submit for Approval</Button>
      </div>
    </div>
  );
}