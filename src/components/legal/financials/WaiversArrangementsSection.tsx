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
  // Find next payment due from arrangements
  const getNextPaymentDue = () => {
    const activeArrangement = arrangements.find(a => a.status === 'On Track');
    if (!activeArrangement) return null;
    
    const nextInstallment = activeArrangement.installments.find(i => !i.paid);
    return nextInstallment ? new Date(nextInstallment.date) : null;
  };

  const nextPaymentDue = getNextPaymentDue();

  return (
    <Card className="border-2 shadow-lg border-purple-200 bg-gradient-to-br from-purple-50/50 to-background">
      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={onToggle}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <CardTitle className="flex items-center gap-3 text-lg">
              <FileCheck className="h-6 w-6 text-primary" />
              Waivers & Arrangements
              <Badge className="bg-primary/10 text-primary hover:bg-primary/20 font-semibold px-3 py-1">
                {waivers.length + arrangements.length} {waivers.length + arrangements.length === 1 ? 'Item' : 'Items'}
              </Badge>
            </CardTitle>
            {nextPaymentDue && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Next Due: {nextPaymentDue.toLocaleDateString()}
              </div>
            )}
          </div>
          {isOpen ? <ChevronUp className="h-5 w-5 text-primary" /> : <ChevronDown className="h-5 w-5 text-primary" />}
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
              <ArrangementsTab caseId={caseId} arrangements={arrangements} totalAmount={0} />
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
}
