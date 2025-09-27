import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useNewBenefitAuth } from '@/contexts/NewBenefitAuthContext';
import { newBenefitService } from '@/services/newBenefitService';
import { Claim, ClaimEvent, Person } from '@/types/newBenefit';
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  DollarSign, 
  FileText, 
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  Building,
  Stethoscope,
  Calculator,
  Award,
  Eye,
  Edit,
  Send,
  Upload,
  Download
} from 'lucide-react';

export const Claim360View: React.FC = () => {
  const { claimId } = useParams<{ claimId: string }>();
  const navigate = useNavigate();
  const { currentUser, hasPermission } = useNewBenefitAuth();
  
  const [claim, setClaim] = useState<Claim | null>(null);
  const [contributor, setContributor] = useState<Person | null>(null);
  const [claimEvents, setClaimEvents] = useState<ClaimEvent[]>([]);
  const [eligibilityResult, setEligibilityResult] = useState<any>(null);
  const [calculationResult, setCalculationResult] = useState<any>(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (claimId) {
      loadClaimData();
    }
  }, [claimId]);

  const loadClaimData = async () => {
    if (!claimId) return;
    
    try {
      const [claimData, eventsData] = await Promise.all([
        newBenefitService.getClaimById(claimId),
        newBenefitService.getClaimEvents(claimId)
      ]);

      if (claimData) {
        setClaim(claimData);
        setClaimEvents(eventsData);
        
        // Load contributor data
        const contributorData = await newBenefitService.getContributorProfile(claimData.ssn);
        setContributor(contributorData);
        
        // Load eligibility and calculation data
        const eligibility = await newBenefitService.checkEligibility(claimData.ssn, claimData.benefitType);
        setEligibilityResult(eligibility);
        
        const calculation = await newBenefitService.calculateBenefit(claimData.ssn, claimData.benefitType);
        setCalculationResult(calculation);
      }
    } catch (error) {
      console.error('Error loading claim data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: any) => {
    if (!claim || !currentUser?.username) return;
    
    try {
      await newBenefitService.updateClaimStatus(claim.id, newStatus, currentUser.username, note);
      loadClaimData(); // Refresh data
      setNote('');
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleAddNote = async () => {
    if (!claim || !currentUser?.username || !note.trim()) return;
    
    try {
      await newBenefitService.sendMessage({
        fromUser: currentUser.username,
        toUser: claim.ssn,
        claimId: claim.id,
        subject: 'Claim Update',
        message: note,
        read: false
      });
      setNote('');
      loadClaimData();
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'PAID':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'DENIED':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const formatBenefitType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading claim details...</p>
        </div>
      </div>
    );
  }

  if (!claim || !contributor) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Claim Not Found</h1>
        <p className="text-muted-foreground mb-4">The requested claim could not be found.</p>
        <Button onClick={() => navigate('/newbenefit/worklists')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Worklists
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={() => navigate('/newbenefit/worklists')} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Worklists
          </Button>
          <h1 className="text-2xl font-bold flex items-center space-x-2">
            {getStatusIcon(claim.status)}
            <span>Claim {claim.id}</span>
          </h1>
          <p className="text-muted-foreground">
            {formatBenefitType(claim.benefitType)} - {contributor.firstName} {contributor.lastName}
          </p>
        </div>
        <div className="flex space-x-2">
          <Badge variant="outline">
            {claim.status.replace(/_/g, ' ')}
          </Badge>
          <Badge variant={claim.priority === 'URGENT' ? 'destructive' : 'outline'}>
            {claim.priority}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-6 lg:grid-cols-11">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="eligibility">Eligibility</TabsTrigger>
          <TabsTrigger value="contributions">Contributions</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="medical">Medical</TabsTrigger>
          <TabsTrigger value="employer">Employer</TabsTrigger>
          <TabsTrigger value="calculation">Calculation</TabsTrigger>
          <TabsTrigger value="decision">Decision</TabsTrigger>
          <TabsTrigger value="award">Award & Payments</TabsTrigger>
          <TabsTrigger value="notes">Notes & Logs</TabsTrigger>
          <TabsTrigger value="diaries">Diaries & Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Contributor Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">SSN</p>
                    <p>{contributor.ssn}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Name</p>
                    <p>{contributor.firstName} {contributor.lastName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
                    <p>{new Date(contributor.dateOfBirth).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Phone</p>
                    <p>{contributor.phone}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Address</p>
                  <p>{contributor.address}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Claim Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Benefit Type</p>
                    <p>{formatBenefitType(claim.benefitType)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Submission Date</p>
                    <p>{new Date(claim.submissionDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Assigned To</p>
                    <p>{claim.assignedTo || 'Unassigned'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                    <p>{new Date(claim.lastUpdated).toLocaleDateString()}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Bank Account</p>
                  <p>{claim.bankAccount} (Routing: {claim.bankRoutingNumber})</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          {hasPermission('update_claim_status') && (
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => handleStatusChange('ELIGIBILITY_CHECK')}>
                    Move to Eligibility Check
                  </Button>
                  <Button size="sm" onClick={() => handleStatusChange('EVIDENCE_REVIEW')}>
                    Request Evidence
                  </Button>
                  <Button size="sm" onClick={() => handleStatusChange('CALCULATION')}>
                    Calculate Benefits
                  </Button>
                  <Button size="sm" variant="outline">
                    Assign to Me
                  </Button>
                  <Button size="sm" variant="outline">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Message Contributor
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="eligibility" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5" />
                <span>Eligibility Assessment</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {eligibilityResult ? (
                <div className="space-y-4">
                  <div className={`p-4 rounded-lg ${eligibilityResult.eligibilityMet ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <h3 className={`font-semibold ${eligibilityResult.eligibilityMet ? 'text-green-900' : 'text-red-900'}`}>
                      {eligibilityResult.eligibilityMet ? 'ELIGIBLE' : 'NOT ELIGIBLE'}
                    </h3>
                    <p className={`text-sm ${eligibilityResult.eligibilityMet ? 'text-green-700' : 'text-red-700'}`}>
                      Contribution Weeks: {eligibilityResult.contributionWeeks} / {eligibilityResult.requiredWeeks} required
                    </p>
                  </div>

                  {eligibilityResult.reasonsPass.length > 0 && (
                    <div>
                      <h4 className="font-medium text-green-700 mb-2">Eligibility Criteria Met:</h4>
                      <ul className="space-y-1">
                        {eligibilityResult.reasonsPass.map((reason: string, index: number) => (
                          <li key={index} className="flex items-center space-x-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {eligibilityResult.reasonsFailure.length > 0 && (
                    <div>
                      <h4 className="font-medium text-red-700 mb-2">Eligibility Issues:</h4>
                      <ul className="space-y-1">
                        {eligibilityResult.reasonsFailure.map((reason: string, index: number) => (
                          <li key={index} className="flex items-center space-x-2 text-sm">
                            <AlertCircle className="h-4 w-4 text-red-500" />
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Eligibility check not yet performed</p>
                  <Button className="mt-2">Run Eligibility Check</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calculation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calculator className="h-5 w-5" />
                <span>Benefit Calculation</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {calculationResult ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {calculationResult.weeklyAmount && (
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">
                          ${calculationResult.weeklyAmount.toFixed(2)}
                        </p>
                        <p className="text-sm text-blue-600">Weekly Benefit</p>
                      </div>
                    )}
                    {calculationResult.monthlyAmount && (
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">
                          ${calculationResult.monthlyAmount.toFixed(2)}
                        </p>
                        <p className="text-sm text-green-600">Monthly Benefit</p>
                      </div>
                    )}
                    {calculationResult.lumpSumAmount && (
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <p className="text-2xl font-bold text-purple-600">
                          ${calculationResult.lumpSumAmount.toFixed(2)}
                        </p>
                        <p className="text-sm text-purple-600">Lump Sum</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Calculation Details:</h4>
                    <ul className="space-y-1 text-sm">
                      {calculationResult.calculationDetails.map((detail: string, index: number) => (
                        <li key={index} className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Benefit calculation not yet performed</p>
                  <Button className="mt-2">Calculate Benefits</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5" />
                <span>Notes & Activity Log</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Add Note Section */}
                {hasPermission('update_claim_status') && (
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Add Note</h4>
                    <Textarea
                      placeholder="Add a note about this claim..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="mb-2"
                    />
                    <Button onClick={handleAddNote} disabled={!note.trim()}>
                      <Send className="h-4 w-4 mr-2" />
                      Add Note
                    </Button>
                  </div>
                )}

                {/* Activity Timeline */}
                <div className="space-y-3">
                  <h4 className="font-medium">Activity Timeline</h4>
                  {claimEvents.length === 0 ? (
                    <p className="text-muted-foreground">No activity recorded</p>
                  ) : (
                    <div className="space-y-3">
                      {claimEvents.map((event) => (
                        <div key={event.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                          <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium">{event.eventType.replace(/_/g, ' ')}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(event.eventDate).toLocaleString()}
                              </p>
                            </div>
                            <p className="text-sm text-muted-foreground">By: {event.performedBy}</p>
                            {event.notes && (
                              <p className="text-sm mt-1">{event.notes}</p>
                            )}
                            {event.fromStatus && event.toStatus && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Status changed from {event.fromStatus} to {event.toStatus}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Add other tab contents for documents, medical, employer, etc. */}
        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Documents & Evidence</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Document management functionality</p>
                <Button className="mt-4">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Add placeholder content for other tabs */}
      </Tabs>
    </div>
  );
};