import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save } from 'lucide-react';
import { BenefitRuleSet } from '@/types/benefitRulesConfig';
import { benefitRulesConfigService } from '@/services/benefitRulesConfigService';
import { useToast } from '@/hooks/use-toast';

// Tab Components
import BenefitDefinitionTab from '@/components/nbenefit/config/BenefitDefinitionTab';
import EligibilityRulesTab from '@/components/nbenefit/config/EligibilityRulesTab';
import CalculationRulesTab from '@/components/nbenefit/config/CalculationRulesTab';
import TimelinesTab from '@/components/nbenefit/config/TimelinesTab';
import RequiredDocumentsTab from '@/components/nbenefit/config/RequiredDocumentsTab';
import WorkflowTab from '@/components/nbenefit/config/WorkflowTab';
import PreviewTestTab from '@/components/nbenefit/config/PreviewTestTab';

export default function BenefitRuleEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('definition');
  const [benefitRule, setBenefitRule] = useState<BenefitRuleSet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (id && id !== 'new') {
      loadBenefitRule(id);
    } else {
      // Initialize empty rule for new benefit
      initializeNewRule();
    }
  }, [id]);

  const loadBenefitRule = async (ruleId: string) => {
    try {
      const rule = await benefitRulesConfigService.getBenefitRuleById(ruleId);
      if (rule) {
        setBenefitRule(rule);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load benefit rule',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const initializeNewRule = () => {
    const newRule: BenefitRuleSet = {
      id: '',
      benefitCode: '',
      benefitName: '',
      category: 'SHORT_TERM',
      branch: 'GENERAL',
      paymentType: 'PERIODIC',
      description: '',
      activeFrom: new Date().toISOString().split('T')[0],
      status: 'DRAFT',
      version: 1,
      createdBy: 'admin',
      createdAt: new Date().toISOString(),
      eligibilityRules: {
        ruleGroups: [],
        groupLogic: 'ALL_GROUPS',
      },
      calculationRules: {
        calculationBasis: 'AVERAGE_WEEKLY_EARNINGS',
        calculationType: 'PERCENTAGE_OF_WAGE',
        variables: [],
        limits: {},
        roundingRule: 'ROUND_NEAREST',
      },
      timelines: {
        paymentStartLogic: '',
        renewalRequired: false,
      },
      requiredDocuments: [],
      workflow: {
        workflowScheme: 'BENEFIT_APPROVAL_SHORT_TERM',
        requiresEmployerVerification: false,
        requiresMedicalBoardReview: false,
        requiresMeansTest: false,
        maxConcurrentClaimsAllowed: 1,
        overlapRules: [],
        preEligibilityChecks: [],
      },
    };
    setBenefitRule(newRule);
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!benefitRule) return;

    setIsSaving(true);
    try {
      if (id === 'new') {
        await benefitRulesConfigService.createBenefitRule(benefitRule);
        toast({
          title: 'Success',
          description: 'Benefit rule created successfully',
        });
      } else {
        await benefitRulesConfigService.updateBenefitRule(id!, benefitRule);
        toast({
          title: 'Success',
          description: 'Benefit rule updated successfully',
        });
      }
      navigate('/nbenefit/config/rules');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save benefit rule',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!benefitRule) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Benefit rule not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/nbenefit/config/rules')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-semibold text-foreground">
                {id === 'new' ? 'Create New Benefit Rule' : `Edit: ${benefitRule.benefitName}`}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {id === 'new'
                  ? 'Configure all aspects of the new benefit rule'
                  : `Version ${benefitRule.version} • ${benefitRule.benefitCode}`}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/nbenefit/config/rules')}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="definition">Definition</TabsTrigger>
            <TabsTrigger value="eligibility">Eligibility Rules</TabsTrigger>
            <TabsTrigger value="calculation">Calculation</TabsTrigger>
            <TabsTrigger value="timelines">Timelines</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="workflow">Workflow</TabsTrigger>
            <TabsTrigger value="preview">Preview & Test</TabsTrigger>
          </TabsList>

          <TabsContent value="definition" className="mt-6">
            <BenefitDefinitionTab benefitRule={benefitRule} onUpdate={setBenefitRule} />
          </TabsContent>

          <TabsContent value="eligibility" className="mt-6">
            <EligibilityRulesTab benefitRule={benefitRule} onUpdate={setBenefitRule} />
          </TabsContent>

          <TabsContent value="calculation" className="mt-6">
            <CalculationRulesTab benefitRule={benefitRule} onUpdate={setBenefitRule} />
          </TabsContent>

          <TabsContent value="timelines" className="mt-6">
            <TimelinesTab benefitRule={benefitRule} onUpdate={setBenefitRule} />
          </TabsContent>

          <TabsContent value="documents" className="mt-6">
            <RequiredDocumentsTab benefitRule={benefitRule} onUpdate={setBenefitRule} />
          </TabsContent>

          <TabsContent value="workflow" className="mt-6">
            <WorkflowTab benefitRule={benefitRule} onUpdate={setBenefitRule} />
          </TabsContent>

          <TabsContent value="preview" className="mt-6">
            <PreviewTestTab benefitRule={benefitRule} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
