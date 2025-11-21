import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { ProcedureRegistry } from "./medical/ProcedureRegistry";
import { AvailabilityRouting } from "./medical/AvailabilityRouting";
import { MaximumLimits } from "./medical/MaximumLimits";

export default function MedicalRulesConfig() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Medical & Surgery Rules Configuration</h1>
        <p className="text-muted-foreground mt-2">
          Configure medical procedures, availability, routing rules, and maximum limits for local, regional, and overseas treatments
        </p>
      </div>

      <Tabs defaultValue="procedures" className="space-y-6">
        <TabsList className="bg-muted">
          <TabsTrigger value="procedures">Procedure Registry</TabsTrigger>
          <TabsTrigger value="availability">Availability & Routing</TabsTrigger>
          <TabsTrigger value="limits">Maximum Limits</TabsTrigger>
        </TabsList>

        <TabsContent value="procedures">
          <Card className="p-6">
            <ProcedureRegistry />
          </Card>
        </TabsContent>

        <TabsContent value="availability">
          <Card className="p-6">
            <AvailabilityRouting />
          </Card>
        </TabsContent>

        <TabsContent value="limits">
          <Card className="p-6">
            <MaximumLimits />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
