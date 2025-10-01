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
import { FileText, Send, Eye, Download, Plus } from 'lucide-react';
import { documentTemplates, auditPlans, departments } from '@/data/auditData';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

export default function LetterGeneration() {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [previewContent, setPreviewContent] = useState('');

  const generatePreview = (templateId: string) => {
    const template = documentTemplates.find(t => t.id === templateId);
    if (!template) return;

    // Sample merge with dummy data
    let preview = template.content;
    const mergeData = {
      today_date: new Date().toLocaleDateString(),
      dept_head_name: 'Sarah Williams',
      department_name: 'Benefits Department',
      plan_title: 'FY2025 Benefits Department Operational Audit',
      fiscal_year: 'FY2025',
      period_text: 'January 2025 - December 2025',
      scope: 'Review of benefits processing controls and payment accuracy',
      planned_start: '2025-10-01',
      planned_end: '2025-11-30',
      auditor_names: 'John Doe, Alice Smith',
      pbc_due_date: '2025-09-20',
      audit_manager_name: 'Manager Internal Audit'
    };

    Object.entries(mergeData).forEach(([key, value]) => {
      preview = preview.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    setPreviewContent(preview);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Letter Generation</h1>
          <p className="text-muted-foreground">
            Generate audit letters and notices using templates |
            <Link to="/" className="text-blue-600 hover:underline ml-1">← Back to Dashboard</Link>
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Generate Letter
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Generate Audit Letter</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Template</Label>
                <Select 
                  value={selectedTemplate} 
                  onValueChange={(value) => {
                    setSelectedTemplate(value);
                    generatePreview(value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTemplates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Audit Plan</Label>
                <Select>
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
                <Label>Recipient Department</Label>
                <Select>
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
                <Label>Recipient Email</Label>
                <Input type="email" placeholder="recipient@ssb.kn" />
              </div>

              {previewContent && (
                <div>
                  <Label>Preview</Label>
                  <div className="border rounded-md p-4 bg-white text-black">
                    <pre className="whitespace-pre-wrap text-sm font-mono">
                      {previewContent}
                    </pre>
                  </div>
                </div>
              )}

              <div>
                <Label>Additional Notes (optional)</Label>
                <Textarea placeholder="Add any specific notes for this letter..." rows={2} />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
                <Button onClick={() => toast({ 
                  title: "Letter Sent", 
                  description: "Audit letter has been generated and sent to recipient" 
                })}>
                  <Send className="w-4 h-4 mr-2" />
                  Send Letter
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Letter Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Merge Fields</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documentTemplates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{template.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {template.mergeFields.slice(0, 3).map((field, idx) => (
                        <Badge key={idx} className="text-xs bg-blue-100 text-blue-800">
                          {field}
                        </Badge>
                      ))}
                      {template.mergeFields.length > 3 && (
                        <Badge className="text-xs bg-gray-100 text-gray-800">
                          +{template.mergeFields.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={template.active ? 'bg-green-500' : 'bg-gray-500'}>
                      {template.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedTemplate(template.id);
                          generatePreview(template.id);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <FileText className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Letters */}
      <Card>
        <CardHeader>
          <CardTitle>Recently Generated Letters</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Related Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>2025-09-01</TableCell>
                <TableCell>Notice of Audit</TableCell>
                <TableCell>depthead.benefits@ssb.kn</TableCell>
                <TableCell>FY2025 Benefits Department Audit</TableCell>
                <TableCell>
                  <Badge className="bg-green-500">Sent</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
