import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Building2, User, Heart, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function C3SubmissionSelection() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const contributorTypes = [
    {
      id: "employers",
      title: "🟩 1. Employers",
      subtitle: "For companies or organizations submitting Social Security data for their employees",
      icon: Building2,
      features: [
        "Requires 6-digit Employer No.",
        "Auto-fetches employer information",
        "Employee row management with SSN validation",
        "Weekly work tracking (1-5 + H/P/B)",
        "Automatic calculation of SS, Levy, Severance & Penalties",
        "Totals tab with comprehensive breakdowns"
      ],
      route: "/c3-management/input-form?type=employer",
      screenshot: "Screenshot No. 1",
      bgColor: "bg-green-50 dark:bg-green-950/20",
      borderColor: "border-green-200 dark:border-green-800",
      textColor: "text-green-800 dark:text-green-200"
    },
    {
      id: "self-employed",
      title: "🟨 2. Self-Employed",
      subtitle: "For individuals contributing on behalf of themselves as self-employed workers",
      icon: User,
      features: [
        "Requires SSN",
        "Period and Date Received fields",
        "Weekly Work Selection (1–5)",
        "Total Wages input",
        "Social Security Contribution calculation",
        "Penalties tracking",
        "Monthly Contribution Due computation"
      ],
      route: "/c3-management/input-form?type=self-employed",
      screenshot: "Screenshot No. 2",
      bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
      borderColor: "border-yellow-200 dark:border-yellow-800",
      textColor: "text-yellow-800 dark:text-yellow-200"
    },
    {
      id: "voluntary",
      title: "🟦 3. Voluntary Contribution",
      subtitle: "For individuals not employed or self-employed, but contributing voluntarily",
      icon: Heart,
      features: [
        "Requires SSN",
        "Period and Date Received fields",
        "Weekly Work Selection (1–5)",
        "Total Wages input",
        "Social Security Contribution (calculated)",
        "Monthly Contribution Due display",
        "Payment and Balance Summary"
      ],
      route: "/c3-management/input-form?type=voluntary",
      screenshot: "Screenshot No. 3",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
      borderColor: "border-blue-200 dark:border-blue-800",
      textColor: "text-blue-800 dark:text-blue-200"
    }
  ];

  const handleContinue = () => {
    if (selectedType) {
      const selectedOption = contributorTypes.find(type => type.id === selectedType);
      if (selectedOption) {
        navigate(selectedOption.route);
      }
    }
  };

  const handleCancel = () => {
    navigate("/c3-management/manage");
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">New C3 Submission</h1>
        <p className="text-muted-foreground max-w-3xl mx-auto">
          You are about to initiate a new C3 submission. Please choose the type of contributor you are filing for. 
          Based on your selection, a corresponding C3 form with unique structure and validation will be opened.
        </p>
        
        <Alert className="max-w-2xl mx-auto">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> Once submitted, this selection cannot be changed without cancelling the form.
          </AlertDescription>
        </Alert>
      </div>

      {/* Contributor Type Selection */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-center">🧭 Please select one of the following options below:</h2>
        
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
          {contributorTypes.map((type) => {
            const Icon = type.icon;
            const isSelected = selectedType === type.id;
            
            return (
              <Card
                key={type.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  isSelected 
                    ? `${type.borderColor} ${type.bgColor} ring-2 ring-primary` 
                    : "hover:border-primary/50"
                }`}
                onClick={() => setSelectedType(type.id)}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start gap-3">
                    <Icon className={`h-6 w-6 mt-1 ${isSelected ? type.textColor : "text-muted-foreground"}`} />
                    <div className="flex-1">
                      <CardTitle className="text-lg leading-tight">{type.title}</CardTitle>
                      <CardDescription className="mt-2">{type.subtitle}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                      🧩 Key Features:
                    </h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {type.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-primary">➤</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="pt-2 border-t">
                    <Badge variant="outline" className="text-xs">
                      🖼 Reference: {type.screenshot}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Important Notes */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            ⚠️ Important Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>• All forms are aligned with the Social Security Act, 1978, and supporting legislation.</p>
          <p>• Data validation, auto-fills, and computed fields vary depending on the contributor type.</p>
          <p>• User permissions may restrict access to certain contributor types.</p>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-6">
        <Button
          onClick={handleCancel}
          variant="outline"
          className="min-w-32"
        >
          ❌ Cancel
        </Button>
        
        <Button
          onClick={handleContinue}
          disabled={!selectedType}
          className="min-w-48 group"
        >
          ✅ Continue with {selectedType ? contributorTypes.find(t => t.id === selectedType)?.title.split('.')[1].trim() : 'Selection'}
          <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </div>
  );
}