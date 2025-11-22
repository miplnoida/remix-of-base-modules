import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Eye } from "lucide-react";
import TemplatePreviewDialog from "./TemplatePreviewDialog";
import { useToast } from "@/hooks/use-toast";

const templates = [
  {
    id: "tpl-001",
    name: "Retirement Benefit Application",
    description: "Complete workflow for processing retirement benefit applications with eligibility checks and supervisor approval",
    tags: ["Benefits", "Retirement"],
    steps: ["Application Intake", "Eligibility Check", "Supervisor Review", "Payment Setup"],
  },
  {
    id: "tpl-002",
    name: "Sickness Benefit Claim",
    description: "Process sickness benefit claims with medical certificate upload and validation",
    tags: ["Benefits", "Sickness"],
    steps: ["Intake", "Medical Certificate Upload", "Validation", "Decision", "Payment"],
  },
  {
    id: "tpl-003",
    name: "Employer Contribution Registration",
    description: "Onboard new employers with TIN verification and account creation",
    tags: ["Employers", "Registration"],
    steps: ["Employer Onboarding", "Verify TIN", "Create Account", "Welcome Email"],
  },
  {
    id: "tpl-004",
    name: "Compliance Audit Case",
    description: "Manage compliance audits with document requests and deadline tracking",
    tags: ["Compliance", "Audit"],
    steps: ["Case Creation", "Document Request", "Deadline Timer", "Review", "Close"],
  },
  {
    id: "tpl-005",
    name: "Customer Service Ticket",
    description: "Route and resolve customer service inquiries efficiently",
    tags: ["Support", "Customer Service"],
    steps: ["Intake", "Categorize", "Assign to Queue", "Agent Task", "Resolve"],
  },
];

export default function WorkflowTemplates() {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  const handleClone = (templateName: string) => {
    toast({
      title: "Template Cloned",
      description: `"${templateName}" has been added to your workflows`,
    });
  };

  const handlePreview = (template: any) => {
    setSelectedTemplate(template);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <div className="flex gap-1 mt-2">
                    {template.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{template.description}</p>

              <div>
                <p className="text-sm font-semibold mb-2">Workflow Steps:</p>
                <div className="flex flex-wrap gap-2">
                  {template.steps.map((step, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {index + 1}. {step}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleClone(template.name)}
                  className="flex-1"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Clone Template
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreview(template)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <TemplatePreviewDialog
        open={!!selectedTemplate}
        onOpenChange={(open) => !open && setSelectedTemplate(null)}
        template={selectedTemplate}
      />
    </div>
  );
}
