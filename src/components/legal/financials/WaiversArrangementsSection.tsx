import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, FileCheck, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WaiversTab } from "./WaiversTab";
import { ArrangementsTab } from "./ArrangementsTab";

interface Waiver {
  id: string;
  waiverType: string;
  amount: number;
  percent?: number;
  authorizedBy: string;
  date: string;
  reason: string;
  appliedPeriods: string[];
}

interface Arrangement {
  id: string;
  terms: string;
  durationMonths: number;
  startDate: string;
  status: string;
  installments: Array<{
    date: string;
    amount: number;
    paid: boolean;
  }>;
}

interface WaiversArrangementsSectionProps {
  caseId: string;
  waivers: Waiver[];
  arrangements: Arrangement[];
  isOpen: boolean;
  onToggle: () => void;
}

export function WaiversArrangementsSection({ caseId, waivers, arrangements, isOpen, onToggle }: WaiversArrangementsSectionProps) {
  return (
    <Card>
      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={onToggle}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Waivers & Arrangements
            <Badge variant="secondary">{waivers.length} waivers</Badge>
            <Badge variant="secondary">{arrangements.length} plans</Badge>
          </CardTitle>
          {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
      </CardHeader>

      {isOpen && (
        <CardContent>
          <Tabs defaultValue="waivers" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="waivers">Waivers</TabsTrigger>
              <TabsTrigger value="arrangements">Payment Arrangements</TabsTrigger>
            </TabsList>
            <TabsContent value="waivers" className="mt-4">
              <WaiversTab caseId={caseId} waivers={waivers} />
            </TabsContent>
            <TabsContent value="arrangements" className="mt-4">
              <ArrangementsTab caseId={caseId} arrangements={arrangements} />
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
}
