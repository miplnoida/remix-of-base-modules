import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ChevronDown, ChevronUp, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AddCostDialog } from "./AddCostDialog";

// Format date as dd-mm-yyyy
const formatDate = (date: Date | string): string => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

interface Cost {
  id: string;
  costDate: string;
  costType: string;
  amount: number;
  description: string;
}

interface CostsFeesSectionProps {
  caseId: string;
  costs: Cost[];
  isOpen: boolean;
  onToggle: () => void;
}

export function CostsFeesSection({ caseId, costs, isOpen, onToggle }: CostsFeesSectionProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const totalCosts = costs.reduce((sum, c) => sum + c.amount, 0);

  return (
    <>
      <Card className="border-2 shadow-md">
        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={onToggle}>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-orange-600" />
              Costs & Fees
              <Badge className="bg-orange-600/10 text-orange-700 hover:bg-orange-600/20 font-semibold">{costs.length} {costs.length === 1 ? 'Item' : 'Items'}</Badge>
            </CardTitle>
            {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </CardHeader>

        {isOpen && (
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-sm">
                  <span className="text-muted-foreground">Total Costs: </span>
                  <span className="font-semibold">${totalCosts.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <Button onClick={() => setAddDialogOpen(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Cost
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cost Date</TableHead>
                      <TableHead>Cost Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {costs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          No costs or fees recorded. Click "Add Cost" to create one.
                        </TableCell>
                      </TableRow>
                    ) : (
                      costs.map((cost) => (
                        <TableRow key={cost.id}>
                          <TableCell>{formatDate(cost.costDate)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{cost.costType}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            ${cost.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{cost.description}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <AddCostDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        caseId={caseId}
      />
    </>
  );
}
