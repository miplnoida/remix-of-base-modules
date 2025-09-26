import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Building2, 
  User, 
  Calendar, 
  FileText, 
  DollarSign, 
  Scale, 
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { CourtCase, CaseDocument, HearingJudgment, Enforcement } from '@/types/legalFinal';
import { LegalFinalService } from '@/services/legalFinalService';

interface CaseDetailViewProps {
  case: CourtCase;
  onClose: () => void;
}

export const CaseDetailView = ({ case: courtCase, onClose }: CaseDetailViewProps) => {
  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [hearings, setHearings] = useState<HearingJudgment[]>([]);
  const [enforcements, setEnforcements] = useState<Enforcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCaseDetails = async () => {
      try {
        const [docsData, hearingsData, enforcementsData] = await Promise.all([
          LegalFinalService.getCaseDocuments(courtCase.caseID),
          LegalFinalService.getCaseHearings(courtCase.caseID),
          LegalFinalService.getCaseEnforcements(courtCase.caseID)
        ]);
        
        setDocuments(docsData);
        setHearings(hearingsData);
        setEnforcements(enforcementsData);
      } catch (error) {
        console.error('Failed to load case details:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCaseDetails();
  }, [courtCase.caseID]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'secondary';
      case 'Filed': return 'default';
      case 'Pending Hearing': return 'warning';
      case 'In Court': return 'info';
      case 'Judgment Delivered': return 'success';
      case 'Enforcement Ongoing': return 'destructive';
      case 'Closed': return 'outline';
      case 'Settled': return 'success';
      default: return 'default';
    }
  };

  const getStatusProgress = (status: string): number => {
    const statusMap = {
      'Draft': 10,
      'Filed': 25,
      'Pending Hearing': 40,
      'In Court': 60,
      'Judgment Delivered': 80,
      'Enforcement Ongoing': 90,
      'Closed': 100,
      'Settled': 100
    };
    return statusMap[status as keyof typeof statusMap] || 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading case details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Case Overview */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Case Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Case ID:</span>
                <span className="font-medium">{courtCase.caseID}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Type:</span>
                <Badge variant="outline">{courtCase.caseType}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge variant={getStatusColor(courtCase.caseStatus) as any}>
                  {courtCase.caseStatus}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Date Opened:</span>
                <span className="font-medium">{courtCase.dateOpened}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Officer:</span>
                <span className="font-medium">{courtCase.officerAssigned}</span>
              </div>
              {courtCase.courtReferenceNumber && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Court Ref:</span>
                  <span className="font-medium">{courtCase.courtReferenceNumber}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {courtCase.employerName ? <Building2 className="h-5 w-5" /> : <User className="h-5 w-5" />}
              Party Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {courtCase.employerName && (
              <div>
                <p className="text-sm text-muted-foreground">Employer</p>
                <p className="font-medium">{courtCase.employerName}</p>
                <p className="text-xs text-muted-foreground">ID: {courtCase.linkedEmployerID}</p>
              </div>
            )}
            {courtCase.contributorName && (
              <div>
                <p className="text-sm text-muted-foreground">Contributor</p>
                <p className="font-medium">{courtCase.contributorName}</p>
                <p className="text-xs text-muted-foreground">ID: {courtCase.linkedContributorID}</p>
              </div>
            )}
            {courtCase.nextHearingDate && (
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Next Hearing
                </p>
                <p className="font-medium">{courtCase.nextHearingDate}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Case Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Case Progress</CardTitle>
          <CardDescription>Current status and completion progress</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{getStatusProgress(courtCase.caseStatus)}%</span>
            </div>
            <Progress value={getStatusProgress(courtCase.caseStatus)} />
            <p className="text-xs text-muted-foreground">
              Current status: {courtCase.caseStatus}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for detailed information */}
      <Tabs defaultValue="notes" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
          <TabsTrigger value="hearings">Hearings ({hearings.length})</TabsTrigger>
          <TabsTrigger value="enforcement">Enforcement ({enforcements.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle>Case Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {courtCase.caseNotes || 'No notes available'}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Case Documents</CardTitle>
              <CardDescription>All documents related to this case</CardDescription>
            </CardHeader>
            <CardContent>
              {documents.length > 0 ? (
                <div className="space-y-4">
                  {documents.map((doc) => (
                    <div key={doc.documentID} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{doc.fileName}</p>
                          <p className="text-sm text-muted-foreground">
                            {doc.documentType} • Uploaded by {doc.uploadedBy}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {doc.uploadDate} • {doc.fileSize}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No documents uploaded yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hearings">
          <Card>
            <CardHeader>
              <CardTitle>Hearings & Judgments</CardTitle>
              <CardDescription>Court proceedings and outcomes</CardDescription>
            </CardHeader>
            <CardContent>
              {hearings.length > 0 ? (
                <div className="space-y-4">
                  {hearings.map((hearing) => (
                    <div key={hearing.hearingID} className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4" />
                        <span className="font-medium">{hearing.hearingDate}</span>
                        <Badge variant={
                          hearing.outcome === 'Judgment Delivered' ? 'success' :
                          hearing.outcome === 'Adjourned' ? 'warning' : 'default'
                        }>
                          {hearing.outcome}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{hearing.courtNotes}</p>
                      {hearing.judgmentSummary && (
                        <div className="mt-2 p-2 bg-muted rounded">
                          <p className="text-sm font-medium">Judgment Summary:</p>
                          <p className="text-sm">{hearing.judgmentSummary}</p>
                          {hearing.amountAwarded && (
                            <p className="text-sm mt-1">
                              Amount Awarded: <span className="font-medium">${hearing.amountAwarded.toLocaleString()}</span>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No hearings scheduled yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="enforcement">
          <Card>
            <CardHeader>
              <CardTitle>Enforcement Actions</CardTitle>
              <CardDescription>Collection and enforcement activities</CardDescription>
            </CardHeader>
            <CardContent>
              {enforcements.length > 0 ? (
                <div className="space-y-4">
                  {enforcements.map((enforcement) => (
                    <div key={enforcement.enforcementID} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          <span className="font-medium">{enforcement.enforcementType}</span>
                        </div>
                        <Badge variant={
                          enforcement.enforcementStatus === 'Completed' ? 'success' :
                          enforcement.enforcementStatus === 'Failed' ? 'destructive' : 'warning'
                        }>
                          {enforcement.enforcementStatus}
                        </Badge>
                      </div>
                      
                      <div className="grid gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Amount Ordered:</span>
                          <span className="font-medium">${enforcement.amountOrdered.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Amount Collected:</span>
                          <span className="font-medium">${enforcement.amountCollected.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Officer:</span>
                          <span>{enforcement.officerResponsible}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Date Created:</span>
                          <span>{enforcement.dateCreated}</span>
                        </div>
                      </div>

                      {enforcement.amountOrdered > 0 && (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs mb-1">
                            <span>Collection Progress</span>
                            <span>{((enforcement.amountCollected / enforcement.amountOrdered) * 100).toFixed(1)}%</span>
                          </div>
                          <Progress value={(enforcement.amountCollected / enforcement.amountOrdered) * 100} />
                        </div>
                      )}

                      {enforcement.notes && (
                        <div className="mt-2 p-2 bg-muted rounded">
                          <p className="text-xs font-medium">Notes:</p>
                          <p className="text-xs">{enforcement.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No enforcement actions yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};