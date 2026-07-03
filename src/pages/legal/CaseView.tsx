/** @deprecated Legal V1 legacy — retired 2026-07. See docs/legal/LEGAL_LEGACY_RETIREMENT_AUDIT.md. Not routed / not linked from canonical UI. */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Edit,
  FileText,
  Calendar,
  Users,
  Scale,
  MessageSquare,
  DollarSign,
  AlertTriangle,
  Clock,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Download,
  Plus,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { LegalCase, STATUS_COLOR_MAP, Party, Hearing, LegalTask, LegalDocument, TimelineEvent } from '@/types/legal';
import { LegalService } from '@/services/legalService';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const CaseView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [case_, setCase] = useState<LegalCase | null>(null);
  const [parties, setParties] = useState<Party[]>([]);
  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [tasks, setTasks] = useState<LegalTask[]>([]);
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCaseInfoOpen, setIsCaseInfoOpen] = useState(true);
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);

  useEffect(() => {
    if (id) {
      loadCaseData(id);
    }
  }, [id]);

  const loadCaseData = async (caseId: string) => {
    setLoading(true);
    try {
      const [caseData, partiesData, hearingsData, tasksData, docsData, timelineData] = await Promise.all([
        LegalService.getCaseById(caseId),
        LegalService.getParties(caseId),
        LegalService.getHearings(caseId),
        LegalService.getTasks(caseId),
        LegalService.getDocuments(caseId),
        LegalService.getTimeline(caseId),
      ]);

      setCase(caseData);
      setParties(partiesData);
      setHearings(hearingsData);
      setTasks(tasksData);
      setDocuments(docsData);
      setTimeline(timelineData);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load case data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading case...</p>
        </div>
      </div>
    );
  }

  if (!case_) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Case not found</h3>
          <Button onClick={() => navigate('/legal/cases')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Cases
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/legal/cases')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">
                  {case_.number} · {case_.title}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={STATUS_COLOR_MAP[case_.status]}>
                    {case_.status}
                  </Badge>
                  {case_.flags.map(flag => (
                    <Badge key={flag} variant="secondary">
                      {flag}
                    </Badge>
                  ))}
                  <span className="text-sm text-muted-foreground">Assigned to: {case_.assignee}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="outline">Add Note</Button>
              <Button variant="outline">Upload</Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    More
                    <MoreVertical className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Schedule Hearing</DropdownMenuItem>
                  <DropdownMenuItem>Create Task</DropdownMenuItem>
                  <DropdownMenuItem>Issue Notice</DropdownMenuItem>
                  <DropdownMenuItem>Change Status</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="parties">Parties & Reps</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="hearings">Hearings</TabsTrigger>
            <TabsTrigger value="correspondence">Correspondence</TabsTrigger>
            <TabsTrigger value="evidence">Evidence</TabsTrigger>
            <TabsTrigger value="orders">Orders & Judgments</TabsTrigger>
            <TabsTrigger value="financials">Financials</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Case Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium">Type</p>
                      <p className="text-muted-foreground">{case_.caseType}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Summary</p>
                      <p className="text-muted-foreground">{case_.summary}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Relief Sought</p>
                      <p className="text-muted-foreground">{case_.reliefSought}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Key Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium">Filed On</p>
                      <p className="text-muted-foreground">
                        {case_.filedOn ? new Date(case_.filedOn).toLocaleDateString() : 'Not yet filed'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Next Event</p>
                      <p className="text-muted-foreground">
                        {case_.nextEventAt ? new Date(case_.nextEventAt).toLocaleString() : 'No scheduled events'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Age</p>
                      <p className="text-muted-foreground">{case_.ageDays} days</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Priority</p>
                      <Badge variant={case_.priority === 'Urgent' ? 'destructive' : 'secondary'}>
                        {case_.priority}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Activity Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {timeline.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No activity yet</p>
                ) : (
                  <div className="space-y-4">
                    {timeline.map(event => (
                      <div key={event.id} className="flex gap-4 items-start">
                        <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                        <div className="flex-1">
                          <p className="font-medium">{event.type}</p>
                          <p className="text-sm text-muted-foreground">{event.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {event.actor} · {new Date(event.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Parties Tab */}
          <TabsContent value="parties">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Parties</CardTitle>
                  <Button>Add Party</Button>
                </div>
              </CardHeader>
              <CardContent>
                {parties.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No parties added yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Role</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Service Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parties.map(party => (
                        <TableRow key={party.id}>
                          <TableCell>{party.role}</TableCell>
                          <TableCell className="font-medium">{party.name}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {party.contact.email && <div>{party.contact.email}</div>}
                              {party.contact.phone && <div>{party.contact.phone}</div>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                party.serviceStatus === 'Served'
                                  ? 'default'
                                  : party.serviceStatus === 'Service Failed'
                                  ? 'destructive'
                                  : 'secondary'
                              }
                            >
                              {party.serviceStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Documents</CardTitle>
                  <Button>Upload Document</Button>
                </div>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No documents uploaded yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Uploaded By</TableHead>
                        <TableHead>Uploaded On</TableHead>
                        <TableHead>Size</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map(doc => (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium">{doc.name}</TableCell>
                          <TableCell>{doc.type}</TableCell>
                          <TableCell>{doc.uploadedBy}</TableCell>
                          <TableCell>{new Date(doc.uploadedOn).toLocaleDateString()}</TableCell>
                          <TableCell>{doc.size}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Tasks</CardTitle>
                  <Button>Create Task</Button>
                </div>
              </CardHeader>
              <CardContent>
                {tasks.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No tasks created yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tasks.map(task => (
                        <TableRow key={task.id}>
                          <TableCell className="font-medium">{task.title}</TableCell>
                          <TableCell>{task.owner}</TableCell>
                          <TableCell>{new Date(task.dueOn).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge variant={task.priority === 'Urgent' ? 'destructive' : 'secondary'}>
                              {task.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={task.status === 'Completed' ? 'default' : 'secondary'}>
                              {task.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Hearings Tab */}
          <TabsContent value="hearings">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Hearings</CardTitle>
                  <Button>Schedule Hearing</Button>
                </div>
              </CardHeader>
              <CardContent>
                {hearings.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No hearings scheduled yet</p>
                ) : (
                  <div className="space-y-4">
                    {hearings.map(hearing => (
                      <div key={hearing.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold">{hearing.type}</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              <Calendar className="h-4 w-4 inline mr-1" />
                              {new Date(hearing.startAt).toLocaleString()}
                            </p>
                            <p className="text-sm text-muted-foreground">Venue: {hearing.venue}</p>
                            <p className="text-sm text-muted-foreground">Panel: {hearing.panel.join(', ')}</p>
                          </div>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Other tabs would go here... */}
          <TabsContent value="correspondence">
            <Card>
              <CardHeader>
                <CardTitle>Correspondence</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">No correspondence yet</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="evidence">
            <Card>
              <CardHeader>
                <CardTitle>Evidence</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">No evidence items yet</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>Orders & Judgments</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">No orders issued yet</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financials">
            <Card>
              <CardHeader>
                <CardTitle>Financials</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">No financial records yet</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline">
            <Card>
              <CardHeader>
                <CardTitle>Complete Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                {timeline.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No timeline events</p>
                ) : (
                  <div className="space-y-4">
                    {timeline.map(event => (
                      <div key={event.id} className="flex gap-4 items-start pb-4 border-b last:border-0">
                        <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                        <div className="flex-1">
                          <p className="font-medium">{event.type}</p>
                          <p className="text-sm text-muted-foreground">{event.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {event.actor} · {new Date(event.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle>Audit Log</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">Full audit trail will appear here</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
