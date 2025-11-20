import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Scale, 
  Search, 
  AlertTriangle, 
  DollarSign, 
  FileText,
  ChevronRight,
  CheckCircle,
  XCircle,
  Eye,
  Send
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { legalEscalationService } from '@/services/legalEscalationService';
import { LegalRecommendation, LegalRecommendationQueueStats } from '@/types/legalEscalation';

const LegalRecommendationQueue = () => {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<LegalRecommendation[]>([]);
  const [stats, setStats] = useState<LegalRecommendationQueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedZone, setSelectedZone] = useState('ALL');
  const [selectedRiskBand, setSelectedRiskBand] = useState('ALL');
  const [selectedRecommendation, setSelectedRecommendation] = useState<LegalRecommendation | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedStatus, selectedZone, selectedRiskBand]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [recommendationsData, statsData] = await Promise.all([
        legalEscalationService.getLegalRecommendations({
          status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
          zone: selectedZone !== 'ALL' ? selectedZone : undefined,
          riskBand: selectedRiskBand !== 'ALL' ? selectedRiskBand : undefined
        }),
        legalEscalationService.getQueueStats()
      ]);
      setRecommendations(recommendationsData);
      setStats(statsData);
    } catch (error) {
      toast.error('Failed to load legal recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveForReferral = async (recommendationId: string) => {
    try {
      await legalEscalationService.updateRecommendationStatus(
        recommendationId,
        'APPROVED_FOR_REFERRAL',
        'Approved by compliance officer'
      );
      toast.success('Recommendation approved for legal referral');
      loadData();
    } catch (error) {
      toast.error('Failed to approve recommendation');
    }
  };

  const handleReject = async (recommendationId: string) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      await legalEscalationService.updateRecommendationStatus(
        recommendationId,
        'REJECTED',
        reason
      );
      toast.success('Recommendation rejected');
      loadData();
    } catch (error) {
      toast.error('Failed to reject recommendation');
    }
  };

  const handleCreateReferral = (recommendation: LegalRecommendation) => {
    navigate('/compliance/legal-referral/new', { state: { recommendation } });
  };

  const filteredRecommendations = recommendations.filter(rec =>
    rec.employerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rec.employerId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRiskBadgeColor = (riskBand: string) => {
    switch (riskBand.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-green-100 text-green-800 border-green-300';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'PENDING_REVIEW':
        return 'bg-blue-100 text-blue-800';
      case 'APPROVED_FOR_REFERRAL':
        return 'bg-green-100 text-green-800';
      case 'REFERRAL_CREATED':
        return 'bg-purple-100 text-purple-800';
      case 'REJECTED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading recommendations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Scale className="h-8 w-8" />
          Legal Recommendation Queue
        </h1>
        <p className="text-muted-foreground mt-2">
          Review employers meeting legal escalation thresholds and create legal referrals
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Employers</p>
                <p className="text-2xl font-bold">{stats.totalEmployers}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Subcases</p>
                <p className="text-2xl font-bold">{stats.totalSubcases}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Amount at Risk</p>
                <p className="text-2xl font-bold">EC${stats.totalAmountAtRisk.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold">{stats.pendingReview}</p>
              </div>
              <Scale className="h-8 w-8 text-purple-500" />
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="PENDING_REVIEW">Pending Review</SelectItem>
              <SelectItem value="APPROVED_FOR_REFERRAL">Approved for Referral</SelectItem>
              <SelectItem value="REFERRAL_CREATED">Referral Created</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedZone} onValueChange={setSelectedZone}>
            <SelectTrigger>
              <SelectValue placeholder="All Zones" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Zones</SelectItem>
              <SelectItem value="Zone 1 - Basseterre">Zone 1 - Basseterre</SelectItem>
              <SelectItem value="Zone 2 - Sandy Point">Zone 2 - Sandy Point</SelectItem>
              <SelectItem value="Zone 3 - Charlestown">Zone 3 - Charlestown</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedRiskBand} onValueChange={setSelectedRiskBand}>
            <SelectTrigger>
              <SelectValue placeholder="All Risk Bands" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Risk Bands</SelectItem>
              <SelectItem value="Critical">Critical</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Recommendations List */}
      <div className="space-y-4">
        {filteredRecommendations.map((rec) => (
          <Card key={rec.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-semibold">{rec.employerName}</h3>
                  <Badge className={getRiskBadgeColor(rec.riskBand)}>
                    {rec.riskBand} Risk ({rec.riskScore})
                  </Badge>
                  <Badge className={getStatusBadgeColor(rec.status)}>
                    {rec.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {rec.employerZone} • Recommended {new Date(rec.recommendedDate).toLocaleDateString()}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setSelectedRecommendation(rec); setShowDetailsDialog(true); }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Button>
                {rec.status === 'PENDING_REVIEW' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleApproveForReferral(rec.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReject(rec.id)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </>
                )}
                {rec.status === 'APPROVED_FOR_REFERRAL' && (
                  <Button
                    size="sm"
                    onClick={() => handleCreateReferral(rec)}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Create Referral
                  </Button>
                )}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-4 gap-4 p-4 bg-muted rounded-lg mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Principal</p>
                <p className="text-lg font-semibold">EC${rec.totalPrincipal.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Penalties</p>
                <p className="text-lg font-semibold">EC${rec.totalPenalties.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Interest</p>
                <p className="text-lg font-semibold">EC${rec.totalInterest.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Grand Total</p>
                <p className="text-xl font-bold text-primary">EC${rec.grandTotal.toLocaleString()}</p>
              </div>
            </div>

            {/* Subcases Summary */}
            <div className="mb-4">
              <p className="text-sm font-medium mb-2">Qualifying Subcases ({rec.subcaseSummary.length})</p>
              <div className="space-y-2">
                {rec.subcaseSummary.map((subcase) => (
                  <div key={subcase.subcaseId} className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded">
                    <span className="font-medium">{subcase.caseNumber}</span>
                    <span className="text-muted-foreground">{subcase.caseType.replace(/_/g, ' ')}</span>
                    <span>{subcase.periodFrom} to {subcase.periodTo}</span>
                    <span className="font-medium">EC${subcase.totalAmount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Triggered Rules */}
            <div>
              <p className="text-sm font-medium mb-2">Escalation Reasons ({rec.triggeredRules.length})</p>
              <div className="flex flex-wrap gap-2">
                {rec.triggeredRules.map((rule) => (
                  <Badge key={rule.ruleId} variant="outline" className="text-xs">
                    {rule.ruleName}: {rule.reason}
                  </Badge>
                ))}
              </div>
            </div>
          </Card>
        ))}

        {filteredRecommendations.length === 0 && (
          <Card className="p-12 text-center">
            <Scale className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No recommendations found matching your filters</p>
          </Card>
        )}
      </div>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Legal Recommendation Details</DialogTitle>
          </DialogHeader>

          {selectedRecommendation && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-2">{selectedRecommendation.employerName}</h3>
                <div className="flex gap-2">
                  <Badge className={getRiskBadgeColor(selectedRecommendation.riskBand)}>
                    {selectedRecommendation.riskBand} Risk
                  </Badge>
                  <Badge>{selectedRecommendation.employerZone}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground">Risk Score</p>
                  <p className="text-2xl font-bold">{selectedRecommendation.riskScore}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground">Grand Total</p>
                  <p className="text-2xl font-bold">EC${selectedRecommendation.grandTotal.toLocaleString()}</p>
                </Card>
              </div>

              <div>
                <h4 className="font-medium mb-2">Qualifying Subcases</h4>
                <div className="space-y-2">
                  {selectedRecommendation.subcaseSummary.map((subcase) => (
                    <Card key={subcase.subcaseId} className="p-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Case:</span> {subcase.caseNumber}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Type:</span> {subcase.caseType.replace(/_/g, ' ')}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Period:</span> {subcase.periodFrom} - {subcase.periodTo}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Amount:</span> EC${subcase.totalAmount.toLocaleString()}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Escalation Rules Triggered</h4>
                <div className="space-y-2">
                  {selectedRecommendation.triggeredRules.map((rule) => (
                    <Card key={rule.ruleId} className="p-3">
                      <p className="font-medium text-sm">{rule.ruleName}</p>
                      <p className="text-sm text-muted-foreground">{rule.reason}</p>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LegalRecommendationQueue;
