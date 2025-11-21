import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { ReactNode } from "react";

interface SharedBenefitLayoutProps {
  title: string;
  tabs: {
    value: string;
    label: string;
    content: ReactNode;
  }[];
}

export const SharedBenefitLayout = ({ title, tabs }: SharedBenefitLayoutProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">{title}</h1>
        <p className="text-muted-foreground mt-2">
          Manage {title.toLowerCase()} applications, rules, and reports
        </p>
      </div>

      <Tabs defaultValue={tabs[0]?.value} className="space-y-6">
        <TabsList className="bg-muted">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <Card className="p-6">{tab.content}</Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
