import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, FileCheck, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WaiversTab } from "./WaiversTab";
import { ArrangementsTab } from "./ArrangementsTab";
import { formatDisplayDate } from "@/lib/dateFormat";

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
    <Card className="border-2 shadow-lg border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={onToggle}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" />
            Waivers & Arrangements
            <Badge className="bg-primary/10 text-primary hover:bg-primary/20 font-semibold">
              {waivers.length + arrangements.length} {waivers.length + arrangements.length === 1 ? 'Item' : 'Items'}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            {nextPaymentDue && (
              <Badge variant="outline" className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Next Due: {formatDisplayDate(nextPaymentDue)}
              </Badge>
            )}
            {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
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
