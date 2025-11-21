import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Edit, ArrowRight, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const BenefitWorkflows = () => {
  const workflowStages = [
    {
      stage: "Intake",
      description: "Application received and registered",
      icon: <Clock className="h-5 w-5" />,
      color: "text-blue-500"
    },
    {
      stage: "Eligibility Check",
      description: "Verify contribution requirements",
      icon: <CheckCircle2 className="h-5 w-5" />,
      color: "text-purple-500"
    },
    {
      stage: "Calculation",
      description: "Compute benefit amount",
      icon: <CheckCircle2 className="h-5 w-5" />,
      color: "text-green-500"
    },
    {
      stage: "Approval",
      description: "Management review and approval",
      icon: <CheckCircle2 className="h-5 w-5" />,
      color: "text-orange-500"
    },
    {
      stage: "Payment",
      description: "Benefit payment processed",
      icon: <CheckCircle2 className="h-5 w-5" />,
      color: "text-primary"
    },
    {
      stage: "Closure",
      description: "Claim closed and archived",
      icon: <CheckCircle2 className="h-5 w-5" />,
      color: "text-gray-500"
    },
  ];

  const shortTermWorkflow = {
    name: "Short-Term Benefits Workflow",
    benefits: ["Sickness", "Employment Injury", "Maternity"],
    stages: [
      {
        step: 1,
        name: "Application Intake",
        duration: "1 day",
        actions: ["Receive claim form", "Verify medical certificate", "Create claim record"],
        assignedTo: "Claims Officer"
      },
      {
        step: 2,
        name: "Initial Review",
        duration: "2-3 days",
        actions: ["Check contribution history", "Verify employment", "Request additional docs if needed"],
        assignedTo: "Benefits Examiner"
      },
      {
        step: 3,
        name: "Eligibility Assessment",
        duration: "1-2 days",
        actions: ["Verify contribution weeks", "Check waiting period", "Assess claim validity"],
        assignedTo: "Senior Examiner"
      },
      {
        step: 4,
        name: "Calculation",
        duration: "1 day",
        actions: ["Calculate AWW", "Apply benefit rate (60-65%)", "Determine weekly amount"],
        assignedTo: "Benefits Calculator"
      },
      {
        step: 5,
        name: "Approval",
        duration: "1-2 days",
        actions: ["Review calculation", "Approve payment", "Generate approval letter"],
        assignedTo: "Benefits Manager"
      },
      {
        step: 6,
        name: "Payment Processing",
        duration: "2-3 days",
        actions: ["Process payment", "Update records", "Send notification"],
        assignedTo: "Finance"
      },
    ],
    totalDuration: "8-12 days"
  };

  const longTermWorkflow = {
    name: "Long-Term Benefits Workflow",
    benefits: ["Age Pension/Grant", "Invalidity", "Survivors"],
    stages: [
      {
        step: 1,
        name: "Application Intake",
        duration: "1-2 days",
        actions: ["Receive application", "Verify identity", "Create claim record"],
        assignedTo: "Claims Officer"
      },
      {
        step: 2,
        name: "Document Collection",
        duration: "5-7 days",
        actions: ["Request birth certificate", "Request medical evidence (if invalidity)", "Request death certificate (if survivors)"],
        assignedTo: "Claims Officer"
      },
      {
        step: 3,
        name: "Contribution Verification",
        duration: "3-5 days",
        actions: ["Pull contribution history", "Verify total contributions", "Calculate contribution years"],
        assignedTo: "Contributions Officer"
      },
      {
        step: 4,
        name: "Medical Assessment (if applicable)",
        duration: "7-14 days",
        actions: ["Schedule medical exam", "Obtain medical board opinion", "Assess degree of invalidity"],
        assignedTo: "Medical Officer"
      },
      {
        step: 5,
        name: "Eligibility Determination",
        duration: "2-3 days",
        actions: ["Review all evidence", "Determine eligibility", "Choose pension vs grant"],
        assignedTo: "Senior Benefits Examiner"
      },
      {
        step: 6,
        name: "Benefit Calculation",
        duration: "2-3 days",
        actions: ["Calculate AWW", "Apply pension formula", "Determine monthly amount"],
        assignedTo: "Benefits Calculator"
      },
      {
        step: 7,
        name: "Approval",
        duration: "2-3 days",
        actions: ["Review decision", "Approve benefit", "Generate decision letter"],
        assignedTo: "Benefits Manager / Director"
      },
      {
        step: 8,
        name: "Payment Setup",
        duration: "3-5 days",
        actions: ["Set up recurring payment", "Process first payment", "Send approval letter"],
        assignedTo: "Finance"
      },
    ],
    totalDuration: "25-42 days"
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Benefit Application Workflows</h1>
          <p className="text-muted-foreground mt-2">
            Configure standard workflow stages, approval paths, and processing timelines
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Workflow
        </Button>
      </div>

      <Card className="p-6 border-2">
        <h3 className="text-lg font-semibold mb-4">Standard Workflow Stages</h3>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {workflowStages.map((stage, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Card className="p-4 border-2 flex-1 min-w-[180px]">
                <div className={`${stage.color} mb-2`}>{stage.icon}</div>
                <h4 className="font-semibold text-sm mb-1">{stage.stage}</h4>
                <p className="text-xs text-muted-foreground">{stage.description}</p>
              </Card>
              {idx < workflowStages.length - 1 && (
                <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </Card>

      <Tabs defaultValue="short-term" className="space-y-6">
        <TabsList className="bg-muted">
          <TabsTrigger value="short-term">Short-Term Benefits</TabsTrigger>
          <TabsTrigger value="long-term">Long-Term Benefits</TabsTrigger>
          <TabsTrigger value="approval-matrix">Approval Matrix</TabsTrigger>
          <TabsTrigger value="sla">Service Level Agreements</TabsTrigger>
        </TabsList>

        <TabsContent value="short-term">
          <Card className="p-6">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">{shortTermWorkflow.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Applies to: {shortTermWorkflow.benefits.join(", ")}
                  </p>
                </div>
                <Badge className="text-lg px-4 py-2">
                  Target: {shortTermWorkflow.totalDuration}
                </Badge>
              </div>

              <div className="space-y-4">
                {shortTermWorkflow.stages.map((stage, idx) => (
                  <Card key={idx} className="p-4 border-l-4 border-l-primary">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                          {stage.step}
                        </div>
                        <div>
                          <h4 className="font-semibold">{stage.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Assigned to: {stage.assignedTo}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">{stage.duration}</Badge>
                    </div>
                    <div className="ml-11">
                      <p className="text-sm font-medium mb-2">Actions:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        {stage.actions.map((action, i) => (
                          <li key={i}>{action}</li>
                        ))}
                      </ul>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Processing Notes:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Sickness claims require medical certificate from registered practitioner</li>
                  <li>Employment injury claims require employer accident report</li>
                  <li>Maternity claims require medical certificate confirming expected delivery date</li>
                  <li>Fast-track available for urgent cases with supervisor approval</li>
                </ul>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="long-term">
          <Card className="p-6">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">{longTermWorkflow.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Applies to: {longTermWorkflow.benefits.join(", ")}
                  </p>
                </div>
                <Badge className="text-lg px-4 py-2">
                  Target: {longTermWorkflow.totalDuration}
                </Badge>
              </div>

              <div className="space-y-4">
                {longTermWorkflow.stages.map((stage, idx) => (
                  <Card key={idx} className="p-4 border-l-4 border-l-primary">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                          {stage.step}
                        </div>
                        <div>
                          <h4 className="font-semibold">{stage.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Assigned to: {stage.assignedTo}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">{stage.duration}</Badge>
                    </div>
                    <div className="ml-11">
                      <p className="text-sm font-medium mb-2">Actions:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        {stage.actions.map((action, i) => (
                          <li key={i}>{action}</li>
                        ))}
                      </ul>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Processing Notes:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Medical board assessment required for all invalidity claims</li>
                  <li>Age pension applications must include proof of age (birth certificate)</li>
                  <li>Survivors' claims require death certificate and relationship proof</li>
                  <li>Director approval required for all long-term benefit awards</li>
                </ul>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="approval-matrix">
          <Card className="p-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Approval Authority Matrix</h3>
              <p className="text-sm text-muted-foreground">
                Define who can approve benefits at each level based on type and amount
              </p>

              <div className="space-y-4">
                <Card className="p-4 border">
                  <h4 className="font-semibold mb-3">Short-Term Benefits</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center p-2 bg-muted rounded">
                      <span className="font-medium">Benefits Examiner</span>
                      <span className="text-muted-foreground">Up to XCD 500/week</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-muted rounded">
                      <span className="font-medium">Senior Examiner</span>
                      <span className="text-muted-foreground">XCD 500 - 1,000/week</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-muted rounded">
                      <span className="font-medium">Benefits Manager</span>
                      <span className="text-muted-foreground">Any amount</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 border">
                  <h4 className="font-semibold mb-3">Long-Term Benefits (Pensions)</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center p-2 bg-muted rounded">
                      <span className="font-medium">Benefits Manager</span>
                      <span className="text-muted-foreground">Up to XCD 500/month</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-muted rounded">
                      <span className="font-medium">Director of Benefits</span>
                      <span className="text-muted-foreground">XCD 500 - 1,500/month</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-muted rounded">
                      <span className="font-medium">Director General</span>
                      <span className="text-muted-foreground">Above XCD 1,500/month</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 border">
                  <h4 className="font-semibold mb-3">Lump Sum Benefits</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center p-2 bg-muted rounded">
                      <span className="font-medium">Benefits Manager</span>
                      <span className="text-muted-foreground">Funeral Grant, Maternity Grant</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-muted rounded">
                      <span className="font-medium">Director of Benefits</span>
                      <span className="text-muted-foreground">Age Grant up to XCD 20,000</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-muted rounded">
                      <span className="font-medium">Director General</span>
                      <span className="text-muted-foreground">Age Grant above XCD 20,000</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="sla">
          <Card className="p-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Service Level Agreements (SLAs)</h3>
              <p className="text-sm text-muted-foreground">
                Target processing times for benefit applications from receipt to first payment
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4 border-2">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">Sickness Benefit</h4>
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-3xl font-bold text-primary mb-2">10 days</div>
                  <p className="text-sm text-muted-foreground">
                    From receipt of complete application to first payment
                  </p>
                </Card>

                <Card className="p-4 border-2">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">Employment Injury</h4>
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-3xl font-bold text-primary mb-2">10 days</div>
                  <p className="text-sm text-muted-foreground">
                    From receipt of accident report and medical certificate
                  </p>
                </Card>

                <Card className="p-4 border-2">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">Maternity Benefit</h4>
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-3xl font-bold text-primary mb-2">12 days</div>
                  <p className="text-sm text-muted-foreground">
                    From receipt of complete application and medical cert
                  </p>
                </Card>

                <Card className="p-4 border-2">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">Age Pension/Grant</h4>
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-3xl font-bold text-primary mb-2">30 days</div>
                  <p className="text-sm text-muted-foreground">
                    From receipt of complete application with all documents
                  </p>
                </Card>

                <Card className="p-4 border-2">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">Invalidity Benefit</h4>
                    <Clock className="h-5 w-5 text-orange-500" />
                  </div>
                  <div className="text-3xl font-bold text-primary mb-2">42 days</div>
                  <p className="text-sm text-muted-foreground">
                    Includes medical board assessment and review
                  </p>
                </Card>

                <Card className="p-4 border-2">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">Survivors' Benefit</h4>
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-3xl font-bold text-primary mb-2">30 days</div>
                  <p className="text-sm text-muted-foreground">
                    From receipt of death certificate and relationship proof
                  </p>
                </Card>
              </div>

              <div className="p-4 bg-muted rounded-lg mt-6">
                <h4 className="font-semibold mb-2">SLA Performance Tracking:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>SLAs measured from receipt of complete application with all required documents</li>
                  <li>Incomplete applications do not start SLA clock until all documents received</li>
                  <li>Expedited processing available for urgent cases with supervisor approval</li>
                  <li>Monthly reports track SLA compliance by benefit type and examiner</li>
                </ul>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BenefitWorkflows;
