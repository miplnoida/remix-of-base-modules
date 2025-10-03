import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLegalCase } from '@/hooks/useLegalCases';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ArrowLeft,
  Edit,
  Trash2,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  FileText,
  Users,
  Calendar,
  CheckSquare,
  Mail,
  Scale,
  DollarSign,
  Clock,
  Shield,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const STATUS_COLORS: Record<string, string> = {
  'Draft': 'bg-neutral-100 text-neutral-800',
  'Filed': 'bg-blue-100 text-blue-800',
  'Under Review': 'bg-indigo-100 text-indigo-800',
  'Hearing Scheduled': 'bg-teal-100 text-teal-800',
  'Decision Pending': 'bg-amber-100 text-amber-800',
  'Order Issued': 'bg-purple-100 text-purple-800',
  'Closed – Compliant': 'bg-green-100 text-green-800',
  'Closed – Non-Compliant': 'bg-red-100 text-red-800',
};

export default function LegalCaseView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: caseData, isLoading } = useLegalCase(id!);
  const [isCaseInfoOpen, setIsCaseInfoOpen] = useState(true);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading case...</div>;
  }

  if (!caseData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-lg text-muted-foreground">Case not found</p>
        <Button onClick={() => navigate('/legal/cases')}>Back to Cases</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/legal/cases')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Cases
            </Button>
            <h1 className="text-3xl font-bold">{caseData.title}</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Edit className="h-4 w-4" />
              Edit
            </Button>
            {caseData.status === 'Draft' && (
              <Button className="gap-2">
                Submit
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Hearing
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Create Task
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Mail className="h-4 w-4 mr-2" />
                  Issue Notice
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Case
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Case Summary Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Case Number</p>
                <p className="font-semibold">{caseData.number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Status</p>
                <Badge className={STATUS_COLORS[caseData.status] || 'bg-gray-100 text-gray-800'}>
                  {caseData.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Priority</p>
                <Badge variant={caseData.priority === 'Urgent' ? 'destructive' : 'outline'}>
                  {caseData.priority}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Flags</p>
                <div className="flex flex-wrap gap-1">
                  {caseData.flags && caseData.flags.length > 0 ? (
                    caseData.flags.map((flag, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {flag}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">None</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Case Information Tabs */}
        <Collapsible open={isCaseInfoOpen} onOpenChange={setIsCaseInfoOpen}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5" />
                  Case Information
                </CardTitle>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                    {isCaseInfoOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="overview" className="gap-2">
                      <FileText className="h-4 w-4" />
                      Overview
                    </TabsTrigger>
                    <TabsTrigger value="parties" className="gap-2">
                      <Users className="h-4 w-4" />
                      Parties
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="gap-2">
                      <FileText className="h-4 w-4" />
                      Documents
                    </TabsTrigger>
                    <TabsTrigger value="tasks" className="gap-2">
                      <CheckSquare className="h-4 w-4" />
                      Tasks
                    </TabsTrigger>
                    <TabsTrigger value="hearings" className="gap-2">
                      <Calendar className="h-4 w-4" />
                      Hearings
                    </TabsTrigger>
                    <TabsTrigger value="timeline" className="gap-2">
                      <Clock className="h-4 w-4" />
                      Timeline
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-sm font-semibold mb-2">Case Type</h3>
                          <p>{caseData.case_type}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold mb-2">Source</h3>
                          <p>{caseData.source}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold mb-2">Stage</h3>
                          <p>{caseData.stage}</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-sm font-semibold mb-2">Filed Date</h3>
                          <p>{caseData.filed_at ? format(new Date(caseData.filed_at), 'PPP') : 'Not yet filed'}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold mb-2">Next Event</h3>
                          <p>{caseData.next_event_at ? format(new Date(caseData.next_event_at), 'PPP') : 'None scheduled'}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold mb-2">Confidential</h3>
                          <Badge variant={caseData.confidential ? 'destructive' : 'secondary'}>
                            {caseData.confidential ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Summary</h3>
                      <p className="text-muted-foreground">{caseData.summary || 'No summary provided'}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Relief Sought</h3>
                      <p className="text-muted-foreground">{caseData.relief_sought || 'Not specified'}</p>
                    </div>
                  </TabsContent>

                  <TabsContent value="parties">
                    <div className="text-center py-8 text-muted-foreground">
                      No parties added yet
                    </div>
                  </TabsContent>

                  <TabsContent value="documents">
                    <div className="text-center py-8 text-muted-foreground">
                      No documents uploaded yet
                    </div>
                  </TabsContent>

                  <TabsContent value="tasks">
                    <div className="text-center py-8 text-muted-foreground">
                      No tasks created yet
                    </div>
                  </TabsContent>

                  <TabsContent value="hearings">
                    <div className="text-center py-8 text-muted-foreground">
                      No hearings scheduled yet
                    </div>
                  </TabsContent>

                  <TabsContent value="timeline">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Activity Timeline</h3>
                        <Button variant="outline" size="sm">
                          <FileText className="h-4 w-4 mr-2" />
                          Export
                        </Button>
                      </div>
                      <div className="space-y-4">
                        <div className="flex gap-4 border-l-2 border-primary pl-4 pb-4">
                          <div className="flex-1">
                            <p className="font-medium">Case Created</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(caseData.created_at), 'PPP p')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    </div>
  );
}
