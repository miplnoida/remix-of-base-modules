import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MockCase } from "@/data/mockLegalCases";
import { DollarSign, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";

interface CaseFinancialsTabProps {
  caseData: MockCase;
}

export function CaseFinancialsTab({ caseData }: CaseFinancialsTabProps) {
  const financialData = {
    assessed: 15000,
    collected: 5000,
    balance: 10000
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Financials</h2>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Assessed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">
                ${financialData.assessed.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Amount Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold text-green-600">
                ${financialData.collected.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Outstanding Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              <span className="text-2xl font-bold text-red-600">
                ${financialData.balance.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Penalties Table */}
      <Card>
        <CardHeader>
          <CardTitle>Penalties & Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg border">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <div className="flex-1">
                <div className="font-medium">Non-Payment Penalty</div>
                <div className="text-sm text-muted-foreground">Due: February 28, 2025</div>
              </div>
              <div className="text-right">
                <div className="font-bold">${financialData.assessed.toLocaleString()}</div>
                <Badge variant="warning" className="mt-1">Pending</Badge>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-lg border">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <div className="font-medium">Partial Payment Received</div>
                <div className="text-sm text-muted-foreground">Paid: January 30, 2025</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-green-600">${financialData.collected.toLocaleString()}</div>
                <Badge variant="success" className="mt-1">Received</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
