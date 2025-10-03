import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/legal/StatusBadge";
import { EmptyState } from "@/components/ui/empty-state";
import { mockCases } from "@/data/mockLegalCases";
import { ArrowLeft, Edit, Upload, MoreVertical, Calendar, FileText, CheckSquare, Users, Mail, Shield, Gavel, Clock, History } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export default function SSBCaseView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const caseData = mockCases.find(c => c.id === id);

  useEffect(() => {
    // Scroll to top on navigation
    window.scrollTo(0, 0);
    // Set focus to page title
    document.getElementById('case-title')?.focus();
  }, [id]);

  if (!caseData) {
    return (
      <div className="container mx-auto py-6 px-4">
        <Button onClick={() => navigate('/legal/cases')} variant="outline" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Cases
        </Button>
        <EmptyState title="Case not found" description="The case you're looking for doesn't exist." />
      </div>
    );
  }

  const handleAction = (action: string) => {
    toast.info(`Preview mode: ${action} not available`);
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b mb-6 -mx-4 px-4 pb-4">
        <Button 
          onClick={() => navigate('/legal/cases')} 
          variant="ghost" 
          size="sm"
          className="mb-3"
          aria-label="Back to cases list"
        >
          <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
          Back to Cases
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 
              id="case-title"
              className="text-2xl font-bold mb-2 flex flex-wrap items-center gap-2"
              tabIndex={-1}
            >
              <span className="font-mono text-lg text-muted-foreground">{caseData.number}</span>
              <span className="text-muted-foreground">·</span>
              <span className="break-words">{caseData.title}</span>
            </h1>
            <div className="flex flex-wrap gap-2 items-center">
              <StatusBadge status={caseData.status} />
              {caseData.flags.map((flag, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {flag}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => handleAction('Edit')} variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" aria-hidden="true" />
              Edit
            </Button>
            <Button onClick={() => handleAction('Add Note')} variant="outline" size="sm">
              Add Note
            </Button>
            <Button onClick={() => handleAction('Upload')} variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" aria-hidden="true" />
              Upload
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" aria-label="More actions">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background">
                <DropdownMenuItem onClick={() => handleAction('Schedule Hearing')}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Hearing
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAction('Create Task')}>
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Create Task
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAction('Issue Notice')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Issue Notice
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAction('Change Status')}>
                  <Shield className="h-4 w-4 mr-2" />
                  Change Status
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="parties">Parties & Reps</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="hearings">Hearings</TabsTrigger>
          <TabsTrigger value="correspondence">Correspondence</TabsTrigger>
          <TabsTrigger value="evidence">Evidence</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-1">Case Summary</h4>
                  <p className="text-sm text-muted-foreground">{caseData.summary}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-1">Relief Sought</h4>
                  <p className="text-sm text-muted-foreground">{caseData.relief_sought}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">Type</p>
                    <Badge variant="secondary" className="mt-1">{caseData.type}</Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Priority</p>
                    <Badge variant="outline" className="mt-1">{caseData.priority}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" aria-hidden="true" />
                  Parties
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {caseData.parties.map((party, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                      <span className="text-sm font-medium">{party}</span>
                      <Badge variant="outline" className="text-xs">
                        {idx === 0 ? 'Applicant' : idx === 1 ? 'Respondent' : 'Party'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" aria-hidden="true" />
                  Key Dates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Filed</p>
                  <p className="text-sm font-medium mt-1">
                    {new Date(caseData.filed_at).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
                {caseData.next_event_at && (
                  <div>
                    <p className="text-xs text-muted-foreground">Next Event</p>
                    <p className="text-sm font-medium mt-1">
                      {new Date(caseData.next_event_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Age</p>
                  <p className="text-sm font-medium mt-1">{caseData.age_days} days</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5" aria-hidden="true" />
                  Case Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Current Stage</p>
                  <p className="text-sm font-medium mt-1">{caseData.stage}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Assigned To</p>
                  <p className="text-sm font-medium mt-1">{caseData.assignee}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" aria-hidden="true" />
                  SLA Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 w-3/4" />
                  </div>
                  <span className="text-xs text-muted-foreground">On Track</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Expected completion in 45 days
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5" aria-hidden="true" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {caseData.activities.map((activity, idx) => (
                  <div key={idx} className="flex gap-4 pb-4 border-b last:border-0 last:pb-0">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <History className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {activity.user} · {new Date(activity.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parties">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Parties & Representatives</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {caseData.parties.map((party, idx) => (
                  <div key={idx} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{party}</h4>
                        <Badge variant="outline" className="mt-2 text-xs">
                          {idx === 0 ? 'Applicant' : idx === 1 ? 'Respondent' : 'Third Party'}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-3">
                      Representative information would appear here in the full version.
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <EmptyState 
            title="No documents yet" 
            description="Documents will appear here once uploaded."
          />
        </TabsContent>

        <TabsContent value="tasks">
          <EmptyState 
            title="No tasks assigned" 
            description="Create tasks to track case-related work."
          />
        </TabsContent>

        <TabsContent value="hearings">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Scheduled Hearings</CardTitle>
            </CardHeader>
            <CardContent>
              {caseData.hearings.length > 0 ? (
                <div className="space-y-4">
                  {caseData.hearings.map((hearing, idx) => (
                    <div key={idx} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold">{hearing.type}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {new Date(hearing.date).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <Badge variant="outline">Upcoming</Badge>
                      </div>
                      <div className="text-sm space-y-1">
                        <p><span className="font-medium">Venue:</span> {hearing.venue}</p>
                        <p><span className="font-medium">Notes:</span> {hearing.notes}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="No hearings scheduled" description="Schedule a hearing from the actions menu." />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="correspondence">
          <EmptyState 
            title="No correspondence" 
            description="Email and letter correspondence will appear here."
          />
        </TabsContent>

        <TabsContent value="evidence">
          <EmptyState 
            title="No evidence uploaded" 
            description="Upload evidence documents to support the case."
          />
        </TabsContent>

        <TabsContent value="orders">
          <EmptyState 
            title="No orders issued" 
            description="Court orders and decisions will appear here."
          />
        </TabsContent>

        <TabsContent value="timeline">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Case Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {caseData.activities.map((activity, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="flex-shrink-0 w-24 text-sm text-muted-foreground">
                      {new Date(activity.date).toLocaleDateString()}
                    </div>
                    <div className="flex-1 pb-4 border-l-2 pl-4 border-muted">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-xs text-muted-foreground mt-1">by {activity.user}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Audit Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>All case modifications and access logs would appear here.</p>
                <p className="text-xs">This helps maintain compliance and accountability.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
