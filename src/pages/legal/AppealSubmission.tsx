import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, FileText, Eye, CheckCircle, XCircle, Clock, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AppealSubmission = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('submit');
  const [formData, setFormData] = useState({
    appealId: `APP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
    linkedCaseId: '',
    appellant: '',
    appealGrounds: '',
    dateSubmitted: new Date().toISOString().split('T')[0],
    supportingDocuments: [] as string[]
  });

  const mockCases = [
    { id: 'LC-2024-089', party: 'ABC Manufacturing Ltd', type: 'Non-Compliance', decision: 'Penalty Imposed' },
    { id: 'LC-2024-088', party: 'John Smith', type: 'Benefit Dispute', decision: 'Benefit Denied' },
    { id: 'LC-2024-087', party: 'XYZ Services Corp', type: 'License Violation', decision: 'License Suspended' }
  ];

  const mockAppeals = [
    {
      id: 'APP-2024-001',
      caseId: 'LC-2024-089',
      appellant: 'ABC Manufacturing Ltd',
      grounds: 'Procedural error in penalty calculation',
      dateSubmitted: '2024-01-20',
      status: 'Under Review',
      reviewOfficer: 'Sarah Johnson',
      documents: ['penalty_calculation.pdf', 'company_records.xlsx'],
      decision: '',
      decisionDate: ''
    },
    {
      id: 'APP-2024-002',
      caseId: 'LC-2024-088',
      appellant: 'John Smith',
      grounds: 'New medical evidence supporting disability claim',
      dateSubmitted: '2024-01-18',
      status: 'Approved',
      reviewOfficer: 'Michael Chen',
      documents: ['medical_report.pdf', 'doctor_statement.pdf'],
      decision: 'Appeal approved - benefit reinstated',
      decisionDate: '2024-01-25'
    },
    {
      id: 'APP-2024-003',
      caseId: 'LC-2024-087',
      appellant: 'XYZ Services Corp',
      grounds: 'License suspension was excessive for the violation',
      dateSubmitted: '2024-01-15',
      status: 'Rejected',
      reviewOfficer: 'Lisa Wang',
      documents: ['violation_details.pdf'],
      decision: 'Appeal rejected - suspension upheld',
      decisionDate: '2024-01-22'
    }
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileUpload = () => {
    // Mock file upload
    const newDocument = `document_${Date.now()}.pdf`;
    setFormData(prev => ({
      ...prev,
      supportingDocuments: [...prev.supportingDocuments, newDocument]
    }));
    toast({
      title: "Document Uploaded",
      description: "Supporting document has been uploaded successfully.",
    });
  };

  const handleSubmitAppeal = () => {
    if (!formData.linkedCaseId || !formData.appellant || !formData.appealGrounds) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Appeal Submitted",
      description: `Appeal ${formData.appealId} has been submitted successfully.`,
    });

    // Reset form
    setFormData({
      appealId: `APP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      linkedCaseId: '',
      appellant: '',
      appealGrounds: '',
      dateSubmitted: new Date().toISOString().split('T')[0],
      supportingDocuments: []
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Under Review': return 'default';
      case 'Approved': return 'default';
      case 'Rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Under Review': return <Clock className="h-4 w-4" />;
      case 'Approved': return <CheckCircle className="h-4 w-4" />;
      case 'Rejected': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
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
                <span className="text-gray-900 font-medium">Appeal Submission</span>
              </nav>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant={activeTab === 'submit' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setActiveTab('submit')}
              >
                Submit Appeal
              </Button>
              <Button 
                variant={activeTab === 'track' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setActiveTab('track')}
              >
                Track Appeals
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Appeal Submission</h1>
          <p className="text-gray-600">Submit and manage appeals against legal decisions</p>
        </div>

        {activeTab === 'submit' ? (
          <Card>
            <CardHeader>
              <CardTitle>Submit New Appeal</CardTitle>
              <CardDescription>File an appeal against a legal decision or penalty</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Appeal ID and Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="appealId">Appeal ID</Label>
                  <Input
                    id="appealId"
                    value={formData.appealId}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateSubmitted">Date Submitted</Label>
                  <Input
                    id="dateSubmitted"
                    type="date"
                    value={formData.dateSubmitted}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              </div>

              {/* Linked Case */}
              <div className="space-y-2">
                <Label htmlFor="linkedCaseId">Linked Case ID *</Label>
                <Select value={formData.linkedCaseId} onValueChange={(value) => handleInputChange('linkedCaseId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select the case to appeal" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockCases.map((case_) => (
                      <SelectItem key={case_.id} value={case_.id}>
                        {case_.id} - {case_.party} ({case_.type}) - {case_.decision}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Appellant */}
              <div className="space-y-2">
                <Label htmlFor="appellant">Appellant *</Label>
                <Input
                  id="appellant"
                  placeholder="Name of the person/organization filing the appeal"
                  value={formData.appellant}
                  onChange={(e) => handleInputChange('appellant', e.target.value)}
                />
              </div>

              {/* Grounds for Appeal */}
              <div className="space-y-2">
                <Label htmlFor="appealGrounds">Grounds for Appeal *</Label>
                <Textarea
                  id="appealGrounds"
                  placeholder="Detailed explanation of why you are appealing this decision..."
                  value={formData.appealGrounds}
                  onChange={(e) => handleInputChange('appealGrounds', e.target.value)}
                  rows={6}
                />
                <p className="text-sm text-gray-500">
                  Please provide specific reasons such as procedural errors, new evidence, or legal misinterpretation.
                </p>
              </div>

              {/* Supporting Documents */}
              <div className="space-y-2">
                <Label>Supporting Documents</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <div className="text-center">
                    <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 mb-2">Upload supporting documents</p>
                    <Button variant="outline" size="sm" onClick={handleFileUpload}>
                      <Upload className="h-4 w-4 mr-2" />
                      Choose Files
                    </Button>
                  </div>
                  
                  {formData.supportingDocuments.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-2">Uploaded Documents:</h4>
                      <div className="space-y-1">
                        {formData.supportingDocuments.map((doc, index) => (
                          <div key={index} className="flex items-center space-x-2 text-sm">
                            <FileText className="h-4 w-4 text-blue-500" />
                            <span>{doc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600 mb-4">* Required fields</p>
                <Button onClick={handleSubmitAppeal}>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Appeal
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Appeal Tracking</CardTitle>
              <CardDescription>Monitor the status of submitted appeals</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Appeal ID</TableHead>
                    <TableHead>Case ID</TableHead>
                    <TableHead>Appellant</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Review Officer</TableHead>
                    <TableHead>Date Submitted</TableHead>
                    <TableHead>Decision Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockAppeals.map((appeal) => (
                    <TableRow key={appeal.id}>
                      <TableCell className="font-medium">{appeal.id}</TableCell>
                      <TableCell>{appeal.caseId}</TableCell>
                      <TableCell>{appeal.appellant}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={getStatusBadgeVariant(appeal.status)}
                          className="flex items-center space-x-1"
                        >
                          {getStatusIcon(appeal.status)}
                          <span>{appeal.status}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>{appeal.reviewOfficer}</TableCell>
                      <TableCell>{appeal.dateSubmitted}</TableCell>
                      <TableCell>{appeal.decisionDate || 'Pending'}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Appeal Details */}
              <div className="mt-6 space-y-4">
                <h3 className="text-lg font-medium">Recent Appeal Details</h3>
                {mockAppeals.slice(0, 2).map((appeal) => (
                  <Card key={appeal.id} className="border">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">{appeal.id}</h4>
                        <Badge variant={getStatusBadgeVariant(appeal.status)}>
                          {appeal.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Grounds:</strong> {appeal.grounds}
                      </p>
                      {appeal.decision && (
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>Decision:</strong> {appeal.decision}
                        </p>
                      )}
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Submitted: {appeal.dateSubmitted}</span>
                        <span>Officer: {appeal.reviewOfficer}</span>
                        <span>Documents: {appeal.documents.length}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AppealSubmission;