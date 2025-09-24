import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Download, Send, Eye, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const NoticeGeneration = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    noticeId: `NOT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
    caseId: '',
    noticeType: '',
    template: '',
    recipient: '',
    issueDate: new Date().toISOString().split('T')[0],
    deliveryMethod: '',
    subject: '',
    customContent: ''
  });
  const [showPreview, setShowPreview] = useState(false);

  const noticeTypes = [
    'Demand Letter',
    'Court Summons',
    'Penalty Notice',
    'Hearing Notice',
    'Compliance Warning',
    'Final Notice',
    'Settlement Offer'
  ];

  const deliveryMethods = [
    'Email',
    'Registered Mail',
    'Personal Service',
    'SMS',
    'Courier Service'
  ];

  const mockCases = [
    { id: 'LC-2024-089', party: 'ABC Manufacturing Ltd', type: 'Non-Compliance' },
    { id: 'LC-2024-088', party: 'John Smith', type: 'Benefit Dispute' },
    { id: 'LC-2024-087', party: 'XYZ Services Corp', type: 'Appeal' }
  ];

  const noticeTemplates = {
    'Demand Letter': [
      'Standard Demand Letter',
      'Final Demand Letter',
      'Payment Demand Letter'
    ],
    'Court Summons': [
      'Civil Court Summons',
      'Administrative Hearing Summons'
    ],
    'Penalty Notice': [
      'Late Payment Penalty',
      'Non-Compliance Penalty',
      'Fraud Penalty'
    ],
    'Hearing Notice': [
      'Administrative Hearing Notice',
      'Mediation Notice',
      'Appeal Hearing Notice'
    ],
    'Compliance Warning': [
      'First Warning Notice',
      'Final Warning Notice'
    ]
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const generateNoticeContent = () => {
    const selectedCase = mockCases.find(c => c.id === formData.caseId);
    
    let content = `NOTICE TO: ${formData.recipient}\n\n`;
    content += `CASE REFERENCE: ${formData.caseId}\n`;
    content += `NOTICE TYPE: ${formData.noticeType}\n`;
    content += `DATE ISSUED: ${formData.issueDate}\n\n`;
    
    switch (formData.noticeType) {
      case 'Demand Letter':
        content += `Dear ${formData.recipient},\n\n`;
        content += `This letter serves as a formal demand for compliance with the Social Security regulations.\n\n`;
        content += `You are hereby required to:\n`;
        content += `1. Remit all outstanding contributions\n`;
        content += `2. Submit required documentation\n`;
        content += `3. Ensure ongoing compliance\n\n`;
        content += `Failure to comply within 30 days may result in legal action.\n\n`;
        break;
        
      case 'Penalty Notice':
        content += `PENALTY ASSESSMENT NOTICE\n\n`;
        content += `You are hereby notified of a penalty assessment for non-compliance.\n\n`;
        content += `Details:\n`;
        content += `- Violation: ${selectedCase?.type}\n`;
        content += `- Penalty Amount: $[AMOUNT]\n`;
        content += `- Due Date: [DUE_DATE]\n\n`;
        break;
        
      case 'Hearing Notice':
        content += `NOTICE OF HEARING\n\n`;
        content += `You are required to appear at a hearing regarding case ${formData.caseId}.\n\n`;
        content += `Hearing Details:\n`;
        content += `- Date: [HEARING_DATE]\n`;
        content += `- Time: [HEARING_TIME]\n`;
        content += `- Location: [HEARING_LOCATION]\n\n`;
        break;
        
      default:
        content += `This notice is issued in connection with case ${formData.caseId}.\n\n`;
    }
    
    content += formData.customContent ? `\n${formData.customContent}\n\n` : '';
    content += `Sincerely,\n`;
    content += `St. Kitts & Nevis Social Security Board\n`;
    content += `Legal Department`;
    
    return content;
  };

  const handlePreview = () => {
    if (!formData.caseId || !formData.noticeType || !formData.recipient) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields before previewing.",
        variant: "destructive"
      });
      return;
    }
    setShowPreview(true);
  };

  const handleGenerate = () => {
    toast({
      title: "Notice Generated",
      description: `Notice ${formData.noticeId} has been generated successfully.`,
    });
  };

  const handleSend = () => {
    toast({
      title: "Notice Sent",
      description: `Notice has been sent via ${formData.deliveryMethod}.`,
    });
  };

  if (showPreview) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(false)}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Editor
                </Button>
                <div className="h-6 w-px bg-gray-300" />
                <Badge variant="secondary">Preview Mode</Badge>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={handleGenerate}>
                  <Download className="h-4 w-4 mr-2" />
                  Generate PDF
                </Button>
                <Button size="sm" onClick={handleSend}>
                  <Send className="h-4 w-4 mr-2" />
                  Send Notice
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Notice Preview - {formData.noticeId}</CardTitle>
              <CardDescription>Review the notice before sending</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-white border p-8 min-h-96" style={{ fontFamily: 'serif' }}>
                <div className="text-center mb-8">
                  <h2 className="text-xl font-bold">ST. KITTS & NEVIS SOCIAL SECURITY BOARD</h2>
                  <p className="text-sm">Legal Department</p>
                </div>
                
                <pre className="whitespace-pre-wrap text-sm leading-relaxed">
                  {generateNoticeContent()}
                </pre>
                
                <div className="mt-8 pt-4 border-t text-xs text-gray-500">
                  <p>Notice ID: {formData.noticeId}</p>
                  <p>Generated on: {new Date().toLocaleDateString()}</p>
                  <p>Delivery Method: {formData.deliveryMethod}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
                <span className="text-gray-900 font-medium">Notice Generation</span>
              </nav>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handlePreview}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button size="sm" onClick={handleGenerate}>
                <FileText className="h-4 w-4 mr-2" />
                Generate Notice
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Notice Generation</h1>
          <p className="text-gray-600">Create and send legal notices and documents</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Legal Notice</CardTitle>
            <CardDescription>Generate formal legal notices and documents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Notice ID and Issue Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="noticeId">Notice ID</Label>
                <Input
                  id="noticeId"
                  value={formData.noticeId}
                  disabled
                  className="bg-gray-50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="issueDate">Issue Date</Label>
                <Input
                  id="issueDate"
                  type="date"
                  value={formData.issueDate}
                  onChange={(e) => handleInputChange('issueDate', e.target.value)}
                />
              </div>
            </div>

            {/* Case ID */}
            <div className="space-y-2">
              <Label htmlFor="caseId">Linked Case ID *</Label>
              <Select value={formData.caseId} onValueChange={(value) => handleInputChange('caseId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select case" />
                </SelectTrigger>
                <SelectContent>
                  {mockCases.map((case_) => (
                    <SelectItem key={case_.id} value={case_.id}>
                      {case_.id} - {case_.party} ({case_.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notice Type */}
            <div className="space-y-2">
              <Label htmlFor="noticeType">Notice Type *</Label>
              <Select value={formData.noticeType} onValueChange={(value) => handleInputChange('noticeType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select notice type" />
                </SelectTrigger>
                <SelectContent>
                  {noticeTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notice Template */}
            {formData.noticeType && (
              <div className="space-y-2">
                <Label htmlFor="template">Notice Template</Label>
                <Select value={formData.template} onValueChange={(value) => handleInputChange('template', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    {noticeTemplates[formData.noticeType as keyof typeof noticeTemplates]?.map((template) => (
                      <SelectItem key={template} value={template}>{template}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Recipient */}
            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient *</Label>
              <Input
                id="recipient"
                placeholder="Enter recipient name/organization"
                value={formData.recipient}
                onChange={(e) => handleInputChange('recipient', e.target.value)}
              />
            </div>

            {/* Delivery Method */}
            <div className="space-y-2">
              <Label htmlFor="deliveryMethod">Delivery Method *</Label>
              <Select value={formData.deliveryMethod} onValueChange={(value) => handleInputChange('deliveryMethod', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select delivery method" />
                </SelectTrigger>
                <SelectContent>
                  {deliveryMethods.map((method) => (
                    <SelectItem key={method} value={method}>{method}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="Notice subject line"
                value={formData.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
              />
            </div>

            {/* Custom Content */}
            <div className="space-y-2">
              <Label htmlFor="customContent">Additional Content</Label>
              <Textarea
                id="customContent"
                placeholder="Add any additional content or special instructions..."
                value={formData.customContent}
                onChange={(e) => handleInputChange('customContent', e.target.value)}
                rows={4}
              />
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-gray-600 mb-4">* Required fields</p>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={handlePreview}>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview Notice
                </Button>
                <Button onClick={handleGenerate}>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Notice
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NoticeGeneration;