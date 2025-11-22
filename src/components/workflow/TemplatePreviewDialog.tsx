import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle } from "lucide-react";

interface TemplatePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: any;
}

export default function TemplatePreviewDialog({ open, onOpenChange, template }: TemplatePreviewDialogProps) {
  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template.name}</DialogTitle>
          <DialogDescription>{template.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex gap-2">
            {template.tags.map((tag: string) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Workflow Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {template.steps.map((step: string, index: number) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{step}</h4>
                        {index === 0 && (
                          <Badge variant="outline" className="text-xs">Start</Badge>
                        )}
                        {index === template.steps.length - 1 && (
                          <Badge variant="outline" className="text-xs">End</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {getStepDescription(step)}
                      </p>
                    </div>
                    {index < template.steps.length - 1 && (
                      <ArrowRight className="h-5 w-5 text-muted-foreground mt-1" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Key Features</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Automated form validation and data capture</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Role-based task assignment and notifications</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Conditional routing based on business rules</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Integration with email and SMS notifications</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Complete audit trail and version control</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button onClick={() => onOpenChange(false)}>
              Clone This Template
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getStepDescription(stepName: string): string {
  const descriptions: Record<string, string> = {
    "Application Intake": "Collect initial application data from the applicant",
    "Eligibility Check": "Automated validation of eligibility criteria",
    "Supervisor Review": "Manual review and approval by supervisor",
    "Payment Setup": "Configure payment details and submit to finance",
    "Intake": "Capture initial claim information",
    "Medical Certificate Upload": "Upload and validate medical documentation",
    "Validation": "Automated validation of submitted documents",
    "Decision": "Review claim and make approval decision",
    "Payment": "Process approved claim payment",
    "Employer Onboarding": "Collect employer registration information",
    "Verify TIN": "Validate Tax Identification Number with government system",
    "Create Account": "Set up employer account in the system",
    "Welcome Email": "Send welcome email with login credentials",
    "Case Creation": "Create new compliance audit case",
    "Document Request": "Send document request to employer",
    "Deadline Timer": "Monitor deadline for document submission",
    "Review": "Review submitted documents and evidence",
    "Close": "Close case with findings and recommendations",
    "Categorize": "Assign category to customer inquiry",
    "Assign to Queue": "Route to appropriate support queue",
    "Agent Task": "Assign to support agent for resolution",
    "Resolve": "Close ticket with resolution notes"
  };
  return descriptions[stepName] || "Process step in workflow";
}
