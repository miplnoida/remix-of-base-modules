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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Send, Eye, Download, Plus, Mail, Filter, Search, Calendar, Users, Clock } from 'lucide-react';
import { documentTemplates, auditPlans, departments } from '@/data/auditData';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import logo from '@/assets/stkitts-logo.png';
import { TemplateCommunicationDialog } from '@/components/audit/TemplateCommunicationDialog';
import { DocumentTemplate } from '@/types/audit';

export default function CommunicationCenter() {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedAudit, setSelectedAudit] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [previewContent, setPreviewContent] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [additionalRecipients, setAdditionalRecipients] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTemplateObj, setSelectedTemplateObj] = useState<DocumentTemplate | null>(null);

  const generatePreview = (templateId: string, auditId?: string, deptId?: string) => {
    const template = documentTemplates.find(t => t.id === templateId);
    if (!template) return;

    const audit = auditId ? auditPlans.find(a => a.id === auditId) : null;
    const dept = deptId ? departments.find(d => d.id === deptId) : null;

    // Sample merge with data
    let preview = template.content;
    const mergeData: Record<string, string> = {
      today_date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      dept_head_name: dept?.head || 'Department Head Name',
      dept_head_title: 'Head of Department',
      department_name: dept?.name || 'Department Name',
      plan_title: audit?.title || 'Audit Title',
      fiscal_year: audit?.fiscalYear || 'FY2025',
      period_text: 'January 2025 - December 2025',
      scope: audit?.scope || 'Comprehensive review of operations and controls',
      planned_start: audit?.startDate || '2025-10-01',
      planned_end: audit?.endDate || '2025-11-30',
      auditor_names: 'John Doe, Alice Smith',
      lead_auditor_name: 'Alice Smith',
      audit_manager_name: 'Michael Johnson',
      audit_manager_ext: '2345',
      manager_ext: '2345',
      manager_email: 'michael.johnson@ssb.kn',
      pbc_due_date: '2025-09-20',
      auditor_email: 'alice.smith@ssb.kn',
      auditor_ext: '2346',
      audit_period: 'January 2025 - June 2025',
      meeting_date: '2025-10-05',
      meeting_time: '10:00 AM',
      meeting_location: 'Conference Room A',
      meeting_format: 'In-person / Virtual (Teams)',
      key_staff_1: 'Senior Officer Name',
      key_staff_2: 'Finance Officer Name',
      audit_team: 'Bob Williams, Carol Davis',
      confirmation_date: '2025-10-01',
      duration: '2 hours',
      additional_attendees: 'Any relevant supervisors',
      reminder_subject: 'Outstanding PBC Documents',
      reminder_topic: 'outstanding document requests',
      original_request_date: '2025-09-15',
      original_due_date: '2025-09-20',
      items_description: 'Financial records, policy manuals, and process documentation',
      new_due_date: '2025-09-27',
      audit_opinion: 'Satisfactory with Areas for Improvement',
      total_findings: '8',
      high_risk_count: '2',
      medium_risk_count: '4',
      low_risk_count: '2',
      key_findings_summary: '• Control gaps in payment approval process\n• Documentation requirements not consistently met',
      response_due_date: '2025-12-15',
      director_general_name: 'Director General Name',
      chairman_name: 'Audit Committee Chairman Name',
      audit_scope_summary: 'Review of operational controls, compliance with regulations, and efficiency of processes',
      opinion_statement: 'Overall controls are adequate with some improvements needed in specific areas',
      earliest_date: '2026-01-15',
      latest_date: '2026-06-30',
      key_recommendations_summary: '• Strengthen approval workflows\n• Enhance documentation practices\n• Implement periodic control reviews',
      followup_date: '2026-07-01',
      finding_reference: 'FY2025-BEN-001',
      finding_title: 'Inadequate Segregation of Duties in Payment Processing',
      risk_rating: 'High',
      finding_description: 'Current payment processing allows single individuals to initiate and approve payments',
      recommendation: 'Implement mandatory dual authorization for all payments exceeding $5,000',
      response_deadline: '2025-12-10',
      original_audit_title: audit?.title || 'Previous Audit Title',
      original_report_date: '2025-11-30',
      total_responses: '8',
      high_risk_findings_list: '• Finding 1: Control weakness identified\n• Finding 2: Compliance gap noted',
      medium_risk_findings_list: '• Finding 3: Process improvement needed\n• Finding 4: Documentation enhancement required',
      followup_team: 'Alice Smith, Bob Williams',
      contact_days: '5',
      days_overdue: '15',
      reminder_count: '3',
      high_risk_findings_pending: '• Critical control gap in authorization process\n• Regulatory compliance deficiency',
      date_1: '2025-11-30',
      date_2: '2025-12-10',
      date_3: '2025-12-20',
      date_4: '2025-12-27',
      risk_implications: '• Potential financial losses\n• Regulatory non-compliance exposure\n• Operational inefficiencies',
      new_deadline: '2026-01-10',
      fieldwork_duration: '6 weeks',
      report_date: '2025-11-30',
      positive_observations: '• Strong management oversight\n• Effective communication channels\n• Commitment to continuous improvement',
    };

    Object.entries(mergeData).forEach(([key, value]) => {
      preview = preview.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    setPreviewContent(preview);
  };

  const handleSendCommunication = () => {
    toast({
      title: "Communication Sent",
      description: `Letter sent successfully to ${recipientEmail}${additionalRecipients ? ` and ${additionalRecipients}` : ''}`,
    });
  };

  const filteredTemplates = documentTemplates.filter(t => {
    const matchesCategory = filterCategory === 'all' || t.category === filterCategory;
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.type.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch && t.active;
  });

  const categories = ['Planning', 'Fieldwork', 'Reporting', 'Follow-up', 'Closeout'];

  const recentCommunications = [
    {
      id: '1',
      date: '2025-01-15',
      template: 'Notice of Audit',
      recipient: 'depthead.benefits@ssb.kn',
      department: 'Benefits Department',
      audit: 'FY2025 Benefits Department Audit',
      status: 'Delivered',
      sentBy: 'Alice Smith'
    },
    {
      id: '2',
      date: '2025-01-14',
      template: 'PBC Request List',
      recipient: 'depthead.contributions@ssb.kn',
      department: 'Contributions Department',
      audit: 'FY2025 Contributions Audit',
      status: 'Delivered',
      sentBy: 'John Doe'
    },
    {
      id: '3',
      date: '2025-01-13',
      template: 'Entrance Meeting Invitation',
      recipient: 'depthead.benefits@ssb.kn',
      department: 'Benefits Department',
      audit: 'FY2025 Benefits Department Audit',
      status: 'Read',
      sentBy: 'Alice Smith'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Communication Center</h1>
          <p className="text-muted-foreground">
            Generate and send official audit communications to departments |
            <Link to="/audit/plans" className="text-primary hover:underline ml-1">← Back to Audit Plans</Link>
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="lg">
              <Plus className="w-4 h-4 mr-2" />
              New Communication
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Generate Audit Communication
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Letter Template *</Label>
                  <Select 
                    value={selectedTemplate} 
                    onValueChange={(value) => {
                      setSelectedTemplate(value);
                      generatePreview(value, selectedAudit, selectedDepartment);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select letter template" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <div key={category}>
                          <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                            {category}
                          </div>
                          {documentTemplates
                            .filter(t => t.category === category && t.active)
                            .map(template => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.name}
                              </SelectItem>
                            ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Related Audit Plan</Label>
                  <Select 
                    value={selectedAudit}
                    onValueChange={(value) => {
                      setSelectedAudit(value);
                      if (selectedTemplate) generatePreview(selectedTemplate, value, selectedDepartment);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select audit plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {auditPlans.map(plan => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Recipient Department *</Label>
                  <Select 
                    value={selectedDepartment}
                    onValueChange={(value) => {
                      setSelectedDepartment(value);
                      const dept = departments.find(d => d.id === value);
                      if (dept) setRecipientEmail(dept.email);
                      if (selectedTemplate) generatePreview(selectedTemplate, selectedAudit, value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(dept => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name} - {dept.head}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Primary Recipient Email *</Label>
                  <Input 
                    type="email" 
                    placeholder="recipient@ssb.kn" 
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                  />
                </div>

                <div className="md:col-span-2">
                  <Label>Additional Recipients (CC)</Label>
                  <Input 
                    type="text" 
                    placeholder="email1@ssb.kn, email2@ssb.kn"
                    value={additionalRecipients}
                    onChange={(e) => setAdditionalRecipients(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Separate multiple emails with commas</p>
                </div>
              </div>

              {previewContent && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted px-4 py-2 border-b">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Letter Preview
                    </h3>
                  </div>
                  <div className="bg-white text-black p-8 max-h-[500px] overflow-y-auto">
                    <div className="flex justify-center mb-6">
                      <img src={logo} alt="SSB Logo" className="h-16" />
                    </div>
                    <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                      {previewContent}
                    </pre>
                  </div>
                </div>
              )}

              <div>
                <Label>Subject Line (Optional Override)</Label>
                <Input placeholder="Custom subject line (leave blank to use default)" />
              </div>

              <div>
                <Label>Additional Notes (Internal - Not Included in Letter)</Label>
                <Textarea 
                  placeholder="Add any internal notes about this communication..."
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
                <Button 
                  onClick={handleSendCommunication}
                  disabled={!selectedTemplate || !recipientEmail}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Communication
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates">
            <FileText className="w-4 h-4 mr-2" />
            Letter Templates
          </TabsTrigger>
          <TabsTrigger value="sent">
            <Mail className="w-4 h-4 mr-2" />
            Sent Communications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search templates..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="hover:border-primary transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline">{template.type}</Badge>
                        <Badge className="bg-blue-100 text-blue-800">{template.category}</Badge>
                      </div>
                    </div>
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setSelectedTemplateObj(template);
                        setDialogOpen(true);
                      }}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Generate & Send
                    </Button>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Merge Fields:</p>
                      <div className="flex flex-wrap gap-1">
                        {template.mergeFields.slice(0, 4).map((field, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {field}
                          </Badge>
                        ))}
                        {template.mergeFields.length > 4 && (
                          <Badge variant="secondary" className="text-xs">
                            +{template.mergeFields.length - 4} more
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              setSelectedTemplate(template.id);
                              generatePreview(template.id);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Preview
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>{template.name}</DialogTitle>
                          </DialogHeader>
                          <div className="bg-white text-black p-6 border rounded-lg">
                            <div className="flex justify-center mb-6">
                              <img src={logo} alt="SSB Logo" className="h-16" />
                            </div>
                            <pre className="whitespace-pre-wrap text-sm font-mono">
                              {previewContent || template.content}
                            </pre>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSelectedTemplate(template.id);
                          generatePreview(template.id);
                        }}
                      >
                        <Send className="w-4 h-4 mr-1" />
                        Use
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Communication History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Date
                    </TableHead>
                    <TableHead>
                      <FileText className="w-4 h-4 inline mr-1" />
                      Template
                    </TableHead>
                    <TableHead>
                      <Mail className="w-4 h-4 inline mr-1" />
                      Recipient
                    </TableHead>
                    <TableHead>
                      <Users className="w-4 h-4 inline mr-1" />
                      Department
                    </TableHead>
                    <TableHead>Related Audit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>
                      <Clock className="w-4 h-4 inline mr-1" />
                      Sent By
                    </TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentCommunications.map((comm) => (
                    <TableRow key={comm.id}>
                      <TableCell className="font-medium">{comm.date}</TableCell>
                      <TableCell>{comm.template}</TableCell>
                      <TableCell className="text-sm">{comm.recipient}</TableCell>
                      <TableCell>{comm.department}</TableCell>
                      <TableCell className="text-sm">{comm.audit}</TableCell>
                      <TableCell>
                        <Badge className={
                          comm.status === 'Delivered' ? 'bg-green-600' :
                          comm.status === 'Read' ? 'bg-blue-600' : 'bg-gray-600'
                        }>
                          {comm.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{comm.sentBy}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Template Communication Dialog */}
      <TemplateCommunicationDialog
        template={selectedTemplateObj}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
