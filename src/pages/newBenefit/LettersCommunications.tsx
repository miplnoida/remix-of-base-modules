import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Mail, MessageSquare, FileText, Send, Edit, Eye, Plus, Search, Filter } from 'lucide-react';

const LettersCommunications = () => {
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const letterTemplates = [
    { id: '1', name: 'Decision Letter - Approved', category: 'Decisions', status: 'Active' },
    { id: '2', name: 'Decision Letter - Denied', category: 'Decisions', status: 'Active' },
    { id: '3', name: 'Award Letter', category: 'Awards', status: 'Active' },
    { id: '4', name: 'Request for Information', category: 'Requests', status: 'Active' },
    { id: '5', name: 'Medical Board Appointment', category: 'Medical', status: 'Active' },
    { id: '6', name: 'Payment Notification', category: 'Payments', status: 'Active' },
    { id: '7', name: 'Suspension Notice', category: 'Notices', status: 'Draft' },
    { id: '8', name: 'Appeal Rights Notice', category: 'Appeals', status: 'Active' }
  ];

  const communications = [
    { id: '1', recipient: 'John Contributor (123456789)', type: 'Decision Letter', status: 'Sent', date: '2024-01-15', channel: 'Portal + Email' },
    { id: '2', recipient: 'Jane Smith (987654321)', type: 'Request Info', status: 'Draft', date: '2024-01-14', channel: 'Portal' },
    { id: '3', recipient: 'Robert Brown (555444333)', type: 'Award Letter', status: 'Sent', date: '2024-01-13', channel: 'Portal + SMS' },
    { id: '4', recipient: 'Mary Johnson (111222333)', type: 'Medical Appointment', status: 'Delivered', date: '2024-01-12', channel: 'Email + SMS' }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Letters & Communications</h1>
          <p className="text-muted-foreground">Manage letter templates and communications</p>
        </div>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Letter Template</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Template Name</Label>
                    <Input placeholder="Enter template name" />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="decisions">Decisions</SelectItem>
                        <SelectItem value="awards">Awards</SelectItem>
                        <SelectItem value="requests">Requests</SelectItem>
                        <SelectItem value="medical">Medical</SelectItem>
                        <SelectItem value="payments">Payments</SelectItem>
                        <SelectItem value="notices">Notices</SelectItem>
                        <SelectItem value="appeals">Appeals</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Subject Line</Label>
                  <Input placeholder="Email subject (supports variables: {{claimRef}}, {{benefitType}})" />
                </div>
                <div>
                  <Label>Letter Content</Label>
                  <Textarea 
                    className="min-h-[200px]" 
                    placeholder="Dear {{contributorName}},&#10;&#10;We are writing to inform you about your {{benefitType}} claim ({{claimRef}})...&#10;&#10;Variables: {{contributorName}}, {{ssn}}, {{claimRef}}, {{benefitType}}, {{decisionDate}}, {{awardAmount}}, {{paymentDate}}"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline">Save as Draft</Button>
                  <Button>Save & Activate</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList>
          <TabsTrigger value="templates">Letter Templates</TabsTrigger>
          <TabsTrigger value="communications">Communications Log</TabsTrigger>
          <TabsTrigger value="compose">Compose Letter</TabsTrigger>
          <TabsTrigger value="settings">Delivery Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Letter Templates</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search templates..."
                      className="pl-8 w-[300px]"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="decisions">Decisions</SelectItem>
                      <SelectItem value="awards">Awards</SelectItem>
                      <SelectItem value="requests">Requests</SelectItem>
                      <SelectItem value="medical">Medical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Modified</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {letterTemplates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell>{template.category}</TableCell>
                      <TableCell>
                        <Badge variant={template.status === 'Active' ? 'default' : 'secondary'}>
                          {template.status}
                        </Badge>
                      </TableCell>
                      <TableCell>2024-01-10</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
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

        <TabsContent value="communications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Communications Log</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Communication Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Delivery Channel</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {communications.map((comm) => (
                    <TableRow key={comm.id}>
                      <TableCell className="font-medium">{comm.recipient}</TableCell>
                      <TableCell>{comm.type}</TableCell>
                      <TableCell>
                        <Badge variant={comm.status === 'Sent' || comm.status === 'Delivered' ? 'default' : 'secondary'}>
                          {comm.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{comm.date}</TableCell>
                      <TableCell>{comm.channel}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Send className="h-4 w-4" />
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

        <TabsContent value="compose" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compose Letter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Select Template</Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {letterTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Recipient</Label>
                  <Input placeholder="Enter SSN or search contributor" />
                </div>
              </div>
              
              <Separator />
              
              <div>
                <Label>Subject</Label>
                <Input value="Decision on Your Sickness Benefit Claim - Ref: SB-2024-001" />
              </div>
              
              <div>
                <Label>Letter Content</Label>
                <Textarea 
                  className="min-h-[300px]" 
                  value="Dear John Contributor,

We are writing to inform you about your Sickness Benefit claim (SB-2024-001) submitted on January 10, 2024.

After careful review of your application and supporting documentation, we are pleased to inform you that your claim has been APPROVED.

Benefit Details:
- Weekly Benefit Amount: $450.00
- Benefit Period: January 8, 2024 to February 5, 2024 (4 weeks)
- Total Award: $1,800.00

Your first payment will be processed on January 22, 2024, and subsequent payments will be made weekly thereafter.

If you have any questions about this decision, please contact our office at (869) 465-2309.

Sincerely,
Social Security Board
St. Kitts and Nevis"
                />
              </div>
              
              <div>
                <Label>Delivery Options</Label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked />
                    Portal Inbox
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked />
                    Email
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" />
                    SMS
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" />
                    Print for Mailing
                  </label>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline">Save as Draft</Button>
                <Button variant="outline">Preview</Button>
                <Button>
                  <Send className="h-4 w-4 mr-2" />
                  Send Letter
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Delivery Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Email Configuration</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>SMTP Server</Label>
                    <Input value="smtp.gov.kn" />
                  </div>
                  <div>
                    <Label>From Address</Label>
                    <Input value="noreply@socialsecurity.gov.kn" />
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-semibold mb-4">SMS Configuration</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>SMS Gateway</Label>
                    <Input value="api.sms.kn" />
                  </div>
                  <div>
                    <Label>Sender ID</Label>
                    <Input value="SSB-KN" />
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-semibold mb-4">Default Delivery Preferences</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked />
                    Always deliver to Portal Inbox
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked />
                    Send email notifications for urgent communications
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" />
                    Send SMS for payment notifications
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" />
                    Auto-print decision letters for mailing
                  </label>
                </div>
              </div>
              
              <Button>Save Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LettersCommunications;