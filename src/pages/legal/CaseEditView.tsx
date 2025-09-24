import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const CaseEditView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Mock case data - in real app, fetch based on ID
  const [caseData, setCaseData] = useState({
    id: id || 'LC-2024-089',
    type: 'Non-Compliance',
    party: 'ABC Manufacturing Ltd (EMP-001)',
    status: 'Under Review',
    priority: 'High',
    dateCreated: '2024-01-15',
    assignedOfficer: 'Sarah Johnson',
    description: 'Late contribution payments for Q4 2023',
    slaStatus: 'Within SLA',
    nextAction: 'Review evidence',
    nextActionDate: '2024-01-25',
    legalBasis: 'Social Security Act Section 15(2) - Timely Payment of Contributions',
    penaltyAmount: '5250.00',
    totalOutstanding: '12450.00',
    notes: 'Employer has been contacted multiple times regarding late payments. Need to escalate if no response by next action date.'
  });

  const handleInputChange = (field: string, value: string) => {
    setCaseData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    // Mock save operation
    toast({
      title: "Case Updated",
      description: `Case ${caseData.id} has been successfully updated.`,
    });
    navigate(`/legal/case-detail/${caseData.id}`);
  };

  const handleCancel = () => {
    navigate(`/legal/case-detail/${caseData.id}`);
  };

  const caseTypes = [
    'Non-Compliance',
    'Benefit Dispute',
    'Appeal',
    'Fraud Investigation',
    'Penalty Assessment',
    'Registration Violation'
  ];

  const statuses = [
    'Filed',
    'Under Review',
    'In Legal Action',
    'Pending Response',
    'Resolved',
    'Closed'
  ];

  const priorities = [
    'Low',
    'Medium',
    'High',
    'Critical'
  ];

  const officers = [
    'Sarah Johnson',
    'Michael Chen',
    'Lisa Wang',
    'David Rodriguez',
    'Emma Thompson'
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Case Detail
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <nav className="flex items-center space-x-2 text-sm text-gray-500">
                <span>Legal Module</span>
                <span>/</span>
                <span>Case Tracking</span>
                <span>/</span>
                <span>Case {caseData.id}</span>
                <span>/</span>
                <span className="text-gray-900 font-medium">Edit</span>
              </nav>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Edit Case {caseData.id}</h1>
          <p className="text-gray-600">Update case information and details</p>
        </div>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Information</TabsTrigger>
            <TabsTrigger value="details">Case Details</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="notes">Notes & Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Case Information</CardTitle>
                <CardDescription>Core case details and classification</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="case-id">Case ID</Label>
                    <Input 
                      id="case-id" 
                      value={caseData.id} 
                      disabled 
                      className="bg-gray-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date-created">Date Created</Label>
                    <Input 
                      id="date-created" 
                      type="date"
                      value={caseData.dateCreated}
                      onChange={(e) => handleInputChange('dateCreated', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="case-type">Case Type</Label>
                    <Select value={caseData.type} onValueChange={(value) => handleInputChange('type', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {caseTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={caseData.status} onValueChange={(value) => handleInputChange('status', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statuses.map(status => (
                          <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={caseData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {priorities.map(priority => (
                          <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assigned-officer">Assigned Officer</Label>
                    <Select value={caseData.assignedOfficer} onValueChange={(value) => handleInputChange('assignedOfficer', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {officers.map(officer => (
                          <SelectItem key={officer} value={officer}>{officer}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="party">Party Involved</Label>
                  <Input 
                    id="party"
                    value={caseData.party}
                    onChange={(e) => handleInputChange('party', e.target.value)}
                    placeholder="Enter party name and identifier"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Case Description</Label>
                  <Textarea 
                    id="description"
                    value={caseData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                    placeholder="Brief description of the case"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Legal & Procedural Details</CardTitle>
                <CardDescription>Legal basis and procedural information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="legal-basis">Legal Basis</Label>
                  <Textarea 
                    id="legal-basis"
                    value={caseData.legalBasis}
                    onChange={(e) => handleInputChange('legalBasis', e.target.value)}
                    rows={2}
                    placeholder="Legal authority and basis for the case"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="next-action">Next Action</Label>
                    <Input 
                      id="next-action"
                      value={caseData.nextAction}
                      onChange={(e) => handleInputChange('nextAction', e.target.value)}
                      placeholder="Next required action"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="next-action-date">Next Action Date</Label>
                    <Input 
                      id="next-action-date"
                      type="date"
                      value={caseData.nextActionDate}
                      onChange={(e) => handleInputChange('nextActionDate', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financial" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Financial Information</CardTitle>
                <CardDescription>Penalties, amounts, and financial details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="penalty-amount">Penalty Amount ($)</Label>
                    <Input 
                      id="penalty-amount"
                      type="number"
                      step="0.01"
                      value={caseData.penaltyAmount}
                      onChange={(e) => handleInputChange('penaltyAmount', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="total-outstanding">Total Outstanding ($)</Label>
                    <Input 
                      id="total-outstanding"
                      type="number"
                      step="0.01"
                      value={caseData.totalOutstanding}
                      onChange={(e) => handleInputChange('totalOutstanding', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Case Notes & Internal Comments</CardTitle>
                <CardDescription>Internal notes and observations about the case</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="notes">Internal Notes</Label>
                  <Textarea 
                    id="notes"
                    value={caseData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    rows={6}
                    placeholder="Add internal notes, observations, or reminders..."
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Fixed Save/Cancel Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-end space-x-4">
              <Button variant="outline" onClick={handleCancel}>
                Cancel Changes
              </Button>
              <Button onClick={handleSave}>
                Save Case
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaseEditView;