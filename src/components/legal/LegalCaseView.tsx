
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, 
  Gavel, 
  FileText, 
  Calendar, 
  DollarSign, 
  MessageSquare,
  Clock,
  CheckCircle,
  AlertTriangle,
  Download,
  Send,
  Edit,
  Eye,
  Phone,
  Mail
} from 'lucide-react';

interface LegalCase {
  id: string;
  employerName: string;
  employerId: string;
  caseType: string;
  violationType: string;
  filingDate: string;
  status: string;
  jurisdiction: string;
  assignedOfficer: string;
  penaltyAmount: string;
  nextHearing: string;
  paymentStatus: string;
  violationDescription: string;
  evidenceSummary: string;
}

interface LegalCaseViewProps {
  caseData: LegalCase;
  onBack: () => void;
  onEdit: () => void;
}

const LegalCaseView: React.FC<LegalCaseViewProps> = ({ caseData, onBack, onEdit }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [newNote, setNewNote] = useState('');

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'initiated': return 'bg-blue-500';
      case 'under trial': return 'bg-yellow-500';
      case 'judgment passed': return 'bg-red-500';
      case 'enforced': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusProgress = (status: string) => {
    switch (status.toLowerCase()) {
      case 'initiated': return 25;
      case 'under trial': return 50;
      case 'judgment passed': return 75;
      case 'enforced': return 100;
      default: return 0;
    }
  };

  const mockDocuments = [
    { name: 'Complaint_Petition.pdf', date: '2024-01-15', type: 'Legal Filing' },
    { name: 'Evidence_Package.zip', date: '2024-01-18', type: 'Evidence' },
    { name: 'Employer_Response.pdf', date: '2024-01-25', type: 'Response' }
  ];

  const mockHearings = [
    {
      date: '2024-02-10',
      time: '10:00 AM',
      type: 'Main Hearing',
      judge: 'Hon. Justice Smith',
      location: 'Courtroom 3',
      status: 'Scheduled',
      notes: 'Initial hearing for penalty determination'
    },
    {
      date: '2024-01-20',
      time: '2:00 PM',
      type: 'Preliminary',
      judge: 'Magistrate Jones',
      location: 'Tribunal Hall A',
      status: 'Completed',
      notes: 'Case admitted for trial'
    }
  ];

  const mockCommunications = [
    {
      date: '2024-01-30',
      type: 'Email',
      subject: 'Notice of Hearing',
      recipient: 'ABC Manufacturing Ltd',
      status: 'Delivered'
    },
    {
      date: '2024-01-25',
      type: 'Registered Mail',
      subject: 'Legal Summons',
      recipient: 'ABC Manufacturing Ltd',
      status: 'Delivered'
    }
  ];

  const mockNotes = [
    {
      id: 1,
      author: 'Sarah Johnson',
      date: '2024-01-30',
      content: 'Employer has requested extension for response filing. Granted 5 additional days.',
      visibility: 'Internal'
    },
    {
      id: 2,
      author: 'Michael Chen',
      date: '2024-01-28',
      content: 'Evidence package reviewed. Strong case for penalty enforcement.',
      visibility: 'Internal'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Cases
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <nav className="flex items-center space-x-2 text-sm text-gray-500">
                <span>Legal Proceedings</span>
                <span>/</span>
                <span className="text-gray-900 font-medium">{caseData.id}</span>
              </nav>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Case
              </Button>
              <Button size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Hearing
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Banner */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Case {caseData.id}</h1>
                <p className="text-lg text-gray-600">{caseData.employerName}</p>
                <p className="text-sm text-gray-500">Filed: {caseData.filingDate}</p>
              </div>
              <div className="text-right">
                <Badge className={`${getStatusColor(caseData.status)} text-white mb-2`}>
                  {caseData.status}
                </Badge>
                <p className="text-lg font-semibold">{caseData.penaltyAmount}</p>
                <p className="text-sm text-gray-500">Penalty Amount</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Case Progress</span>
                <span className="text-sm text-gray-500">{getStatusProgress(caseData.status)}%</span>
              </div>
              <Progress value={getStatusProgress(caseData.status)} className="h-2" />
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-lg font-semibold text-blue-600">{caseData.caseType}</div>
                <p className="text-xs text-gray-500">Case Type</p>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-orange-600">{caseData.violationType}</div>
                <p className="text-xs text-gray-500">Violation</p>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-green-600">{caseData.assignedOfficer}</div>
                <p className="text-xs text-gray-500">Legal Officer</p>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-purple-600">{caseData.nextHearing}</div>
                <p className="text-xs text-gray-500">Next Hearing</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabbed Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="violations">Violations</TabsTrigger>
            <TabsTrigger value="proceedings">Proceedings</TabsTrigger>
            <TabsTrigger value="financials">Financials</TabsTrigger>
            <TabsTrigger value="communications">Communications</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-500" />
                    Case Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-500">Employer ID:</span>
                      <p>{caseData.employerId}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">Jurisdiction:</span>
                      <p>{caseData.jurisdiction}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">Filing Date:</span>
                      <p>{caseData.filingDate}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">Payment Status:</span>
                      <Badge variant={caseData.paymentStatus === 'Paid' ? 'default' : 'destructive'}>
                        {caseData.paymentStatus}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-green-500" />
                    Upcoming Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Clock className="h-4 w-4 text-yellow-600" />
                        <div>
                          <p className="font-medium text-sm">Hearing Scheduled</p>
                          <p className="text-xs text-gray-500">{caseData.nextHearing} at 10:00 AM</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline">View</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="violations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Violation Details</CardTitle>
                <CardDescription>Complete information about the compliance violations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Violation Description</Label>
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm">{caseData.violationDescription || 'Non-payment of employee contributions for period Oct-Dec 2023. Supporting documents include payroll records and bank statements.'}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">Evidence Summary</Label>
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm">{caseData.evidenceSummary || 'Comprehensive audit trail showing systematic under-reporting of employee wages and contribution amounts over a 3-month period.'}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">Supporting Documents</Label>
                  <div className="mt-2 space-y-2">
                    {mockDocuments.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium">{doc.name}</p>
                            <p className="text-xs text-gray-500">{doc.type} • {doc.date}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="proceedings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Court Proceedings</CardTitle>
                <CardDescription>Hearing schedule and court activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockHearings.map((hearing, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${hearing.status === 'Completed' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                          <div>
                            <h4 className="font-medium">{hearing.type}</h4>
                            <p className="text-sm text-gray-500">{hearing.date} at {hearing.time}</p>
                          </div>
                        </div>
                        <Badge variant={hearing.status === 'Completed' ? 'default' : 'secondary'}>
                          {hearing.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-500">Judge:</span>
                          <p>{hearing.judge}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-500">Location:</span>
                          <p>{hearing.location}</p>
                        </div>
                      </div>
                      {hearing.notes && (
                        <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                          <span className="font-medium text-gray-500">Notes: </span>
                          {hearing.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financials" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-500" />
                  Financial Recovery Tracking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{caseData.penaltyAmount}</div>
                    <p className="text-sm text-gray-600">Total Penalty</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">$5,000</div>
                    <p className="text-sm text-gray-600">Amount Paid</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">$10,000</div>
                    <p className="text-sm text-gray-600">Outstanding</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Payment History</h4>
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Partial Payment</p>
                        <p className="text-sm text-gray-500">January 25, 2024</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">$5,000</p>
                        <Badge variant="secondary">Bank Transfer</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="communications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-500" />
                  Communication History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockCommunications.map((comm, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          {comm.type === 'Email' ? 
                            <Mail className="h-4 w-4 text-blue-500" /> : 
                            <FileText className="h-4 w-4 text-orange-500" />
                          }
                          <div>
                            <p className="font-medium">{comm.subject}</p>
                            <p className="text-sm text-gray-500">{comm.type} • {comm.date}</p>
                          </div>
                        </div>
                        <Badge variant={comm.status === 'Delivered' ? 'default' : 'secondary'}>
                          {comm.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">To: {comm.recipient}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 border rounded-lg">
                  <h4 className="font-medium mb-3">Send New Notice</h4>
                  <div className="space-y-3">
                    <Input placeholder="Subject" />
                    <Textarea placeholder="Message content..." rows={3} />
                    <div className="flex space-x-2">
                      <Button size="sm">
                        <Send className="h-4 w-4 mr-2" />
                        Send Email
                      </Button>
                      <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4 mr-2" />
                        Generate Notice
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Legal Notes & Comments</CardTitle>
                <CardDescription>Internal notes and case observations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mb-6">
                  {mockNotes.map((note) => (
                    <div key={note.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{note.author}</span>
                          <Badge variant="outline" className="text-xs">{note.visibility}</Badge>
                        </div>
                        <span className="text-sm text-gray-500">{note.date}</span>
                      </div>
                      <p className="text-sm">{note.content}</p>
                    </div>
                  ))}
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3">Add New Note</h4>
                  <Textarea 
                    placeholder="Add your notes about the case..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={3}
                  />
                  <div className="flex items-center justify-between mt-3">
                    <select className="px-3 py-1 border rounded text-sm">
                      <option>Internal Only</option>
                      <option>Shared</option>
                    </select>
                    <Button size="sm">
                      Add Note
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default LegalCaseView;
