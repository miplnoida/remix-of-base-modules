import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Scale, 
  ChevronRight, 
  ChevronLeft,
  FileText,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Upload
} from 'lucide-react';
import { 
  ContributionComponent, 
  ComponentSubcase, 
  COMPONENT_LABELS,
  LegalReferralComponentSummary 
} from '@/types/contributionComponents';
import { LegalReferralDraft } from '@/types/legalReferralTypes';
import { legalReferralService } from '@/services/legalReferralService';

const LegalReferralWizard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const recommendation = location.state?.recommendation;

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [subcases, setSubcases] = useState<ComponentSubcase[]>([]);
  const [selectedSubcases, setSelectedSubcases] = useState<ComponentSubcase[]>([]);
  const [componentSummary, setComponentSummary] = useState<LegalReferralComponentSummary | null>(null);
  
  const [complianceNarrative, setComplianceNarrative] = useState('');
  const [noticesSent, setNoticesSent] = useState(0);
  const [lastNoticeDate, setLastNoticeDate] = useState('');
  const [paymentPlanHistory, setPaymentPlanHistory] = useState('');
  const [auditFindings, setAuditFindings] = useState('');
  const [contactAttempts, setContactAttempts] = useState('');

  useEffect(() => {
    loadSubcases();
  }, []);

  useEffect(() => {
    if (selectedSubcases.length > 0) {
      const summary = legalReferralService.aggregateComponents(selectedSubcases);
      setComponentSummary(summary);
    } else {
      setComponentSummary(null);
    }
  }, [selectedSubcases]);

  const loadSubcases = async () => {
    try {
      setLoading(true);
      if (!recommendation?.employerId) {
        toast.error('No employer context — open this wizard from a compliance recommendation.');
        setSubcases([]);
        return;
      }
      const data = await legalReferralService.getSubcasesForEmployer(recommendation.employerId);
      setSubcases(data);
    } catch (error) {
      toast.error('Failed to load subcases');
    } finally {
      setLoading(false);
    }
  };

  const toggleSubcase = (subcase: ComponentSubcase) => {
    setSelectedSubcases(prev => {
      const exists = prev.find(s => s.id === subcase.id);
      if (exists) {
        return prev.filter(s => s.id !== subcase.id);
      } else {
        return [...prev, subcase];
      }
    });
  };

  const handleSubmit = async () => {
    if (!recommendation?.employerId) {
      toast.error('Employer context required — open this wizard from a compliance recommendation.');
      return;
    }
    if (selectedSubcases.length === 0) {
      toast.error('Please select at least one subcase');
      return;
    }

    if (!complianceNarrative.trim()) {
      toast.error('Please provide compliance narrative');
      return;
    }

    try {
      const draft: LegalReferralDraft = {
        id: `REF-${Date.now()}`,
        employerId: recommendation.employerId,
        employerName: recommendation.employerName,
        employerZone: recommendation.employerZone,
        selectedSubcases,
        componentSummary: componentSummary!,
        complianceNarrative,
        noticesSent,
        lastNoticeDate,
        paymentPlanHistory,
        auditFindings,
        contactAttempts,
        attachments: [],
        createdBy: 'USER-001',
        createdDate: new Date().toISOString(),
        status: 'DRAFT'
      };

      const submission = await legalReferralService.submitReferral(draft);
      toast.success(`Legal Referral ${submission.referralNumber} created successfully`);
      navigate('/compliance/legal-recommendation-queue');
    } catch (error) {
      toast.error('Failed to submit legal referral');
    }
  };

  const getComponentColor = (component: ContributionComponent) => {
    switch (component) {
      case ContributionComponent.SSC:
      case ContributionComponent.SSF:
        return 'bg-info/10 text-info border-info/30';
      case ContributionComponent.LVC:
      case ContributionComponent.LVF:
        return 'bg-success/10 text-success border-success/30';
      case ContributionComponent.PEC:
      case ContributionComponent.PEF:
        return 'bg-accent text-accent-foreground border-accent';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const groupedSubcases = {
    [ContributionComponent.SSC]: subcases.filter(s => s.component === ContributionComponent.SSC || s.component === ContributionComponent.SSF),
    [ContributionComponent.LVC]: subcases.filter(s => s.component === ContributionComponent.LVC || s.component === ContributionComponent.LVF),
    [ContributionComponent.PEC]: subcases.filter(s => s.component === ContributionComponent.PEC || s.component === ContributionComponent.PEF),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading subcases...</p>
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
          Create Legal Referral
        </h1>
        <p className="text-muted-foreground mt-2">
          {recommendation?.employerName || 'Sample Employer Ltd.'} • {recommendation?.employerZone || 'Zone 1'}
        </p>
      </div>

      {/* Progress Steps */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              1
            </div>
            <span className="font-medium">Select Subcases</span>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              2
            </div>
            <span className="font-medium">Review Summary</span>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
          <div className={`flex items-center gap-2 ${step >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              3
            </div>
            <span className="font-medium">Compliance Narrative</span>
          </div>
        </div>
      </Card>

      {/* Step 1: Select Subcases by Component */}
      {step === 1 && (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Select Component Subcases for Legal Referral
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Select the contribution component subcases and periods to include in this legal referral. 
              The system will automatically aggregate principals and penalties by component group.
            </p>

            {/* Social Security Group */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Badge className="bg-info/10 text-info">Social Security</Badge>
                SSC + SSF
              </h3>
              <div className="space-y-2">
                {groupedSubcases[ContributionComponent.SSC].map(subcase => (
                  <Card key={subcase.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedSubcases.some(s => s.id === subcase.id)}
                        onCheckedChange={() => toggleSubcase(subcase)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getComponentColor(subcase.component)}>
                            {subcase.component}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {subcase.periodFrom} to {subcase.periodTo}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {subcase.daysOverdue} days overdue
                          </Badge>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Principal:</span>
                            <p className="font-medium">EC${subcase.principal.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Penalty:</span>
                            <p className="font-medium">EC${subcase.penalty.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Interest:</span>
                            <p className="font-medium">EC${subcase.interest.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Total:</span>
                            <p className="font-bold text-primary">EC${subcase.totalAmount.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Levy Group */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Badge className="bg-success/10 text-success">Levy</Badge>
                LVC + LVF
              </h3>
              <div className="space-y-2">
                {groupedSubcases[ContributionComponent.LVC].map(subcase => (
                  <Card key={subcase.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedSubcases.some(s => s.id === subcase.id)}
                        onCheckedChange={() => toggleSubcase(subcase)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getComponentColor(subcase.component)}>
                            {subcase.component}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {subcase.periodFrom} to {subcase.periodTo}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {subcase.daysOverdue} days overdue
                          </Badge>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Principal:</span>
                            <p className="font-medium">EC${subcase.principal.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Penalty:</span>
                            <p className="font-medium">EC${subcase.penalty.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Interest:</span>
                            <p className="font-medium">EC${subcase.interest.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Total:</span>
                            <p className="font-bold text-primary">EC${subcase.totalAmount.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Severance Group */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Badge className="bg-accent text-accent-foreground">Severance</Badge>
                PEC + PEF
              </h3>
              <div className="space-y-2">
                {groupedSubcases[ContributionComponent.PEC].map(subcase => (
                  <Card key={subcase.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedSubcases.some(s => s.id === subcase.id)}
                        onCheckedChange={() => toggleSubcase(subcase)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getComponentColor(subcase.component)}>
                            {subcase.component}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {subcase.periodFrom} to {subcase.periodTo}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {subcase.daysOverdue} days overdue
                          </Badge>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Principal:</span>
                            <p className="font-medium">EC${subcase.principal.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Penalty:</span>
                            <p className="font-medium">EC${subcase.penalty.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Interest:</span>
                            <p className="font-medium">EC${subcase.interest.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Total:</span>
                            <p className="font-bold text-primary">EC${subcase.totalAmount.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={() => setStep(2)}
              disabled={selectedSubcases.length === 0}
            >
              Next: Review Summary
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Review Component Aggregation */}
      {step === 2 && componentSummary && (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Component Aggregation Summary
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Auto-aggregated totals by component group (Principal + Penalties)
            </p>

            {/* Overall Summary */}
            <div className="grid grid-cols-4 gap-4 mb-6 p-4 bg-primary/10 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Total Principal</p>
                <p className="text-2xl font-bold">EC${componentSummary.overallPrincipal.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Penalties</p>
                <p className="text-2xl font-bold">EC${componentSummary.overallPenalty.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Interest</p>
                <p className="text-2xl font-bold">EC${componentSummary.overallInterest.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Grand Total</p>
                <p className="text-3xl font-bold text-primary">EC${componentSummary.overallTotal.toLocaleString()}</p>
              </div>
            </div>

            {/* Component Breakdown */}
            <div className="space-y-4">
              {/* Social Security */}
              <Card className="p-4 border-info/20 bg-info/5">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Badge className="bg-info/10 text-info">Social Security</Badge>
                  SSC + SSF Combined
                </h3>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Principal (SSC)</p>
                    <p className="text-lg font-bold">EC${componentSummary.socialSecurity.totalPrincipal.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Penalties (SSF)</p>
                    <p className="text-lg font-bold">EC${componentSummary.socialSecurity.totalPenalty.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Interest</p>
                    <p className="text-lg font-bold">EC${componentSummary.socialSecurity.totalInterest.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Subtotal</p>
                    <p className="text-xl font-bold text-info">EC${componentSummary.socialSecurity.grandTotal.toLocaleString()}</p>
                  </div>
                </div>
              </Card>

              {/* Levy */}
              <Card className="p-4 border-success/20 bg-success/5">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Badge className="bg-success/10 text-success">Levy</Badge>
                  LVC + LVF Combined
                </h3>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Principal (LVC)</p>
                    <p className="text-lg font-bold">EC${componentSummary.levy.totalPrincipal.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Penalties (LVF)</p>
                    <p className="text-lg font-bold">EC${componentSummary.levy.totalPenalty.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Interest</p>
                    <p className="text-lg font-bold">EC${componentSummary.levy.totalInterest.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Subtotal</p>
                    <p className="text-xl font-bold text-success">EC${componentSummary.levy.grandTotal.toLocaleString()}</p>
                  </div>
                </div>
              </Card>

              {/* Severance */}
              <Card className="p-4 border-accent bg-accent/50">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Badge className="bg-accent text-accent-foreground">Severance</Badge>
                  PEC + PEF Combined
                </h3>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Principal (PEC)</p>
                    <p className="text-lg font-bold">EC${componentSummary.severance.totalPrincipal.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Penalties (PEF)</p>
                    <p className="text-lg font-bold">EC${componentSummary.severance.totalPenalty.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Interest</p>
                    <p className="text-lg font-bold">EC${componentSummary.severance.totalInterest.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Subtotal</p>
                    <p className="text-xl font-bold text-accent-foreground">EC${componentSummary.severance.grandTotal.toLocaleString()}</p>
                  </div>
                </div>
              </Card>
            </div>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button onClick={() => setStep(3)}>
              Next: Compliance Narrative
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Compliance Narrative */}
      {step === 3 && (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Compliance History & Narrative
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Provide comprehensive compliance history to support the legal referral
            </p>

            <div className="space-y-6">
              <div>
                <Label htmlFor="narrative">Compliance Narrative *</Label>
                <Textarea
                  id="narrative"
                  value={complianceNarrative}
                  onChange={(e) => setComplianceNarrative(e.target.value)}
                  placeholder="Provide detailed narrative of compliance efforts, employer engagement history, and reasons for legal escalation..."
                  rows={6}
                  className="mt-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="notices">Notices Sent</Label>
                  <Input
                    id="notices"
                    type="number"
                    value={noticesSent}
                    onChange={(e) => setNoticesSent(parseInt(e.target.value) || 0)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="lastNotice">Last Notice Date</Label>
                  <Input
                    id="lastNotice"
                    type="date"
                    value={lastNoticeDate}
                    onChange={(e) => setLastNoticeDate(e.target.value)}
                    className="mt-2"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="paymentPlan">Payment Plan History</Label>
                <Textarea
                  id="paymentPlan"
                  value={paymentPlanHistory}
                  onChange={(e) => setPaymentPlanHistory(e.target.value)}
                  placeholder="Detail any payment arrangement attempts, defaults, or breaches..."
                  rows={4}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="auditFindings">Audit Findings</Label>
                <Textarea
                  id="auditFindings"
                  value={auditFindings}
                  onChange={(e) => setAuditFindings(e.target.value)}
                  placeholder="Summarize key audit findings, compliance issues discovered..."
                  rows={4}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="contactAttempts">Contact Attempts</Label>
                <Textarea
                  id="contactAttempts"
                  value={contactAttempts}
                  onChange={(e) => setContactAttempts(e.target.value)}
                  placeholder="Document all contact attempts, meetings, responses or lack thereof..."
                  rows={4}
                  className="mt-2"
                />
              </div>
            </div>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button onClick={handleSubmit}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Submit Legal Referral
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LegalReferralWizard;
