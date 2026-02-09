
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgeBenefitForm } from "@/components/benefits/AgeBenefitForm";
import { NonContribPensionForm } from "@/components/benefits/NonContribPensionForm";
import { InjuryBenefitForm } from "@/components/benefits/InjuryBenefitForm";
import { FuneralGrantForm } from "@/components/benefits/FuneralGrantForm";
import { MaternityBenefitForm } from "@/components/benefits/MaternityBenefitForm";
import { SicknessBenefitForm } from "@/components/benefits/SicknessBenefitForm";

const benefitForms = [
  {
    label: "Age Benefit",
    key: "age-benefit",
    description: "Claim for Age Benefit",
    component: AgeBenefitForm
  },
  {
    label: "Non-Contributory Pension",
    key: "noncontrib-pension",
    description: "Claim for Assistance Non-Contributory Pension",
    component: NonContribPensionForm
  },
  {
    label: "Injury Benefit",
    key: "injury-benefit",
    description: "Claim for Injury Benefit",
    component: InjuryBenefitForm
  },
  {
    label: "Funeral Grant",
    key: "funeral-grant",
    description: "Claim for Funeral Grant",
    component: FuneralGrantForm
  },
  {
    label: "Maternity Benefit",
    key: "maternity-benefit",
    description: "Claim for Maternity Benefit",
    component: MaternityBenefitForm
  },
  {
    label: "Sickness Benefit",
    key: "sickness-benefit",
    description: "Claim for Sickness/Injury Benefit",
    component: SicknessBenefitForm
  }
];

const AllBenefitsTabs = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <nav className="flex items-center space-x-2 text-sm text-gray-500">
                <span>Benefits Management</span>
                <span>/</span>
                <span className="text-gray-900 font-medium">All Benefits</span>
              </nav>
            </div>
            <Button onClick={() => navigate("/")} variant="outline" size="sm">
              Main Menu
            </Button>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Social Security Benefits Forms</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={benefitForms[0].key} className="w-full">
              <TabsList className="mb-6">
                {benefitForms.map(benefit => (
                  <TabsTrigger key={benefit.key} value={benefit.key} className="whitespace-nowrap">
                    {benefit.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {benefitForms.map(benefit => {
                const FormComponent = benefit.component;
                return (
                  <TabsContent key={benefit.key} value={benefit.key} className="min-h-[400px]">
                    <FormComponent />
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default AllBenefitsTabs;
