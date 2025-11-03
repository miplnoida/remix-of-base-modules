import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign } from "lucide-react";
import { ArrearsPeriodsSection } from "@/components/legal/financials/ArrearsPeriodsSection";
import { PaymentsLogSection } from "@/components/legal/financials/PaymentsLogSection";
import { CostsFeesSection } from "@/components/legal/financials/CostsFeesSection";
import { WaiversArrangementsSection } from "@/components/legal/financials/WaiversArrangementsSection";
import { ImportExportSection } from "@/components/legal/financials/ImportExportSection";
import { useFinancialData } from "@/hooks/useFinancialData";

interface CaseFinancialsTabProps {
  caseData: any;
}

export function CaseFinancialsTab({ caseData }: CaseFinancialsTabProps) {
  const { data: financialData, isLoading } = useFinancialData(caseData.id);
  const [activeSection, setActiveSection] = useState<string | null>("arrears");

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  if (isLoading || !financialData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading financial data...</p>
        </div>
      </div>
    );
  }

  // Calculate summary
  const totalOwed = financialData.periods.reduce((sum, p) => 
    sum + p.ssc + p.ssf + p.costsFees + p.lvc + p.lvp + p.pec, 0
  );
  
  const totalCollected = financialData.payments.reduce((sum, p) => sum + p.amountPaid, 0);
  const totalWaived = financialData.periods.reduce((sum, p) => sum + p.waiverApplied, 0);
  const totalOutstanding = totalOwed - totalCollected - totalWaived;

  // Find next payment due from arrangements
  let nextPaymentDue = null;
  if (financialData.arrangements.length > 0) {
    const activeArrangement = financialData.arrangements.find(a => a.status === 'On Track');
    if (activeArrangement) {
      const nextInstallment = activeArrangement.installments.find(i => !i.paid);
      if (nextInstallment) {
        nextPaymentDue = new Date(nextInstallment.date).toLocaleDateString();
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-2 border-primary/30 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <DollarSign className="h-6 w-6 text-primary" />
            Financial Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2 p-4 rounded-lg bg-background/50 border">
              <p className="text-sm font-medium text-muted-foreground">Total Owed</p>
              <p className="text-3xl font-bold text-foreground">
                ${totalOwed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="space-y-2 p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
              <p className="text-sm font-medium text-green-700 dark:text-green-400">Total Collected</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-500">
                ${totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="space-y-2 p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
              <p className="text-sm font-medium text-red-700 dark:text-red-400">Total Outstanding</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-500">
                ${totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="space-y-2 p-4 rounded-lg bg-background/50 border">
              <p className="text-sm font-medium text-muted-foreground">Next Payment Due</p>
              {nextPaymentDue ? (
                <p className="text-xl font-semibold text-foreground">{nextPaymentDue}</p>
              ) : (
                <p className="text-lg text-muted-foreground">No payment plan</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Arrears & Periods */}
      <ArrearsPeriodsSection
        caseId={caseData.id}
        periods={financialData.periods}
        isOpen={activeSection === "arrears"}
        onToggle={() => toggleSection("arrears")}
      />

      {/* Payments Log */}
      <PaymentsLogSection
        caseId={caseData.id}
        payments={financialData.payments}
        periods={financialData.periods}
        isOpen={activeSection === "payments"}
        onToggle={() => toggleSection("payments")}
      />

      {/* Costs & Fees */}
      <CostsFeesSection
        caseId={caseData.id}
        costs={financialData.costs}
        isOpen={activeSection === "costs"}
        onToggle={() => toggleSection("costs")}
      />

      {/* Waivers & Arrangements */}
      <WaiversArrangementsSection
        caseId={caseData.id}
        waivers={financialData.waivers}
        arrangements={financialData.arrangements}
        isOpen={activeSection === "waivers"}
        onToggle={() => toggleSection("waivers")}
      />

      {/* Import/Export */}
      <ImportExportSection
        caseId={caseData.id}
        isOpen={activeSection === "import"}
        onToggle={() => toggleSection("import")}
      />
    </div>
  );
}
