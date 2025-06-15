
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const benefitForms = [
  {
    label: "Age Benefit",
    key: "age-benefit",
    description: "Claim for Age Benefit",
    img: "/lovable-uploads/530f1ad9-168b-40ea-9d60-ca9d589c80cc.png"
  },
  {
    label: "Non-Contributory Pension",
    key: "noncontrib-pension",
    description: "Claim for Assistance Non-Contributory Pension",
    img: "/lovable-uploads/0c2a2198-5621-44ee-ad39-d617feed4f21.png"
  },
  {
    label: "Injury Benefit",
    key: "injury-benefit",
    description: "Claim for Injury Benefit",
    img: "/lovable-uploads/b9900617-0f66-45e0-8614-677b09cf8ba2.png"
  },
  {
    label: "Funeral Grant",
    key: "funeral-grant",
    description: "Claim for Funeral Grant",
    img: "/lovable-uploads/c1da20b5-c370-4da3-8354-24f334cefebc.png"
  },
  {
    label: "Maternity Benefit",
    key: "maternity-benefit",
    description: "Claim for Maternity Benefit",
    img: "/lovable-uploads/a96380cd-3336-4888-9dd4-89f9a1dc343b.png"
  },
  {
    label: "Sickness Benefit",
    key: "sickness-benefit",
    description: "Claim for Sickness/Injury Benefit",
    img: "/lovable-uploads/2c228eb4-15d0-4f29-b4cb-4f4f1d857b2e.png"
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
              <TabsList className="mb-6 flex flex-wrap overflow-x-auto">
                {benefitForms.map(benefit => (
                  <TabsTrigger key={benefit.key} value={benefit.key} className="whitespace-nowrap">
                    {benefit.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {benefitForms.map(benefit => (
                <TabsContent key={benefit.key} value={benefit.key} className="min-h-[400px]">
                  <div className="flex flex-col items-center gap-4">
                    <div className="mb-2 text-lg font-semibold">{benefit.description}</div>
                    <img src={benefit.img} alt={benefit.label} className="max-w-full rounded bg-white border shadow-md" />
                    {/* In a real implementation, replace the image with the actual form component */}
                    {/* Example: <AgeBenefitForm /> */}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default AllBenefitsTabs;

