import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Send, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const CaseIntake = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    caseId: `LC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
    caseType: '',
    linkedParty: '',
    partyType: '',
    caseDescription: '',
    assignedOfficer: '',
    priority: 'Medium',
    dateCreated: new Date().toISOString().split('T')[0]
  });

  const caseTypes = [
    'Non-Compliance',
    'Benefit Dispute', 
    'Fraud Investigation',
    'Appeal',
    'License Violation',
    'Other'
  ];

  const officers = [
    'Sarah Johnson',
    'Michael Chen',
    'Lisa Wang',
    'David Rodriguez',
    'Emma Thompson'
  ];

  const mockEmployers = [
    { id: 'EMP-001', name: 'ABC Manufacturing Ltd', registrationNumber: 'REG-12345' },
    { id: 'EMP-002', name: 'XYZ Services Corp', registrationNumber: 'REG-23456' },
    { id: 'EMP-003', name: 'Tech Solutions Inc', registrationNumber: 'REG-34567' }
  ];

  const mockInsuredPersons = [
    { id: 'IP-001', name: 'John Smith', ssn: '123-45-6789' },
    { id: 'IP-002', name: 'Jane Doe', ssn: '234-56-7890' },
    { id: 'IP-003', name: 'Robert Johnson', ssn: '345-67-8901' }
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    toast({
      title: "Case Saved",
      description: `Case ${formData.caseId} has been saved as draft.`,
    });
  };

  const handleSubmit = () => {
    if (!formData.caseType || !formData.linkedParty || !formData.caseDescription || !formData.assignedOfficer) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Case Submitted",
      description: `Case ${formData.caseId} has been submitted successfully.`,
    });
    navigate('/legal');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/legal')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Legal Module
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <nav className="flex items-center space-x-2 text-sm text-gray-500">
                <span>Legal Module</span>
                <span>/</span>
                <span className="text-gray-900 font-medium">Case Intake & Registration</span>
              </nav>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              <Button size="sm" onClick={handleSubmit}>
                <Send className="h-4 w-4 mr-2" />
                Submit Case
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Case Intake & Registration</h1>
          <p className="text-gray-600">Create and register a new legal case</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Case Information</CardTitle>
            <CardDescription>Enter the details for the new legal case</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Case ID and Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="caseId">Case ID</Label>
                <Input
                  id="caseId"
                  value={formData.caseId}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500">Auto-generated</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateCreated">Date Filed</Label>
                <Input
                  id="dateCreated"
                  type="date"
                  value={formData.dateCreated}
                  disabled
                  className="bg-gray-50"
                />
              </div>
            </div>

            {/* Case Type */}
            <div className="space-y-2">
              <Label htmlFor="caseType">Case Type *</Label>
              <Select value={formData.caseType} onValueChange={(value) => handleInputChange('caseType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select case type" />
                </SelectTrigger>
                <SelectContent>
                  {caseTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Party Type Selection */}
            <div className="space-y-2">
              <Label htmlFor="partyType">Party Type *</Label>
              <Select value={formData.partyType} onValueChange={(value) => handleInputChange('partyType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select party type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employer">Employer</SelectItem>
                  <SelectItem value="insured-person">Insured Person</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Linked Party Selection */}
            {formData.partyType && (
              <div className="space-y-2">
                <Label htmlFor="linkedParty">
                  Linked {formData.partyType === 'employer' ? 'Employer' : 'Insured Person'} *
                </Label>
                <div className="flex space-x-2">
                  <Select value={formData.linkedParty} onValueChange={(value) => handleInputChange('linkedParty', value)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={`Select ${formData.partyType === 'employer' ? 'employer' : 'insured person'}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.partyType === 'employer' ? (
                        mockEmployers.map((employer) => (
                          <SelectItem key={employer.id} value={`${employer.name} (${employer.registrationNumber})`}>
                            {employer.name} ({employer.registrationNumber})
                          </SelectItem>
                        ))
                      ) : (
                        mockInsuredPersons.map((person) => (
                          <SelectItem key={person.id} value={`${person.name} (${person.ssn})`}>
                            {person.name} ({person.ssn})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Case Description */}
            <div className="space-y-2">
              <Label htmlFor="caseDescription">Case Description *</Label>
              <Textarea
                id="caseDescription"
                placeholder="Describe the legal case, violation, or dispute in detail..."
                value={formData.caseDescription}
                onChange={(e) => handleInputChange('caseDescription', e.target.value)}
                rows={4}
              />
            </div>

            {/* Assigned Officer */}
            <div className="space-y-2">
              <Label htmlFor="assignedOfficer">Assigned Officer *</Label>
              <Select value={formData.assignedOfficer} onValueChange={(value) => handleInputChange('assignedOfficer', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select assigned officer" />
                </SelectTrigger>
                <SelectContent>
                  {officers.map((officer) => (
                    <SelectItem key={officer} value={officer}>{officer}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex space-x-2 mt-2">
                <Badge variant={
                  formData.priority === 'High' ? 'destructive' :
                  formData.priority === 'Medium' ? 'default' : 'secondary'
                }>
                  {formData.priority} Priority
                </Badge>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-gray-600 mb-4">* Required fields</p>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Draft
                </Button>
                <Button onClick={handleSubmit}>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Case
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CaseIntake;