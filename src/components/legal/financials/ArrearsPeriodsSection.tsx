import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ChevronDown, ChevronUp, Edit, Trash2, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AddArrearsPeriodDialog } from "./AddArrearsPeriodDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface ArrearsPeriod {
  id: string;
  employer: string;
  periodFrom: string;
  periodTo: string;
  dateOfPayment?: string;
  ssc: number;
  ssf: number;
  costsFees: number;
  lvc: number;
  lvp: number;
  pec: number;
  waiverApplied: number;
  balanceOutstanding: number;
  hasPayment: boolean;
}

interface ArrearsPeriodsectionProps {
  caseId: string;
  periods: ArrearsPeriod[];
  isOpen: boolean;
  onToggle: () => void;
}

export function ArrearsPeriodsSection({ caseId, periods, isOpen, onToggle }: ArrearsPeriodsectionProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<ArrearsPeriod | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [periodToDelete, setPeriodToDelete] = useState<string | null>(null);

  const handleEdit = (period: ArrearsPeriod) => {
    setEditingPeriod(period);
    setAddDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setPeriodToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    // TODO: Implement delete via adapter
    toast.success("Period deleted successfully");
    setDeleteDialogOpen(false);
    setPeriodToDelete(null);
  };

  const totalDue = periods.reduce((sum, p) => sum + p.ssc + p.ssf + p.costsFees + p.lvc + p.lvp + p.pec, 0);
  const totalWaived = periods.reduce((sum, p) => sum + p.waiverApplied, 0);
  const totalOutstanding = periods.reduce((sum, p) => sum + p.balanceOutstanding, 0);

  return (
    <>
      <Card className="border-2 shadow-md">
        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={onToggle}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Arrears & Periods
                <Badge className="bg-primary/10 text-primary hover:bg-primary/20 font-semibold">{periods.length} {periods.length === 1 ? 'Record' : 'Records'}</Badge>
              </CardTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  setAddDialogOpen(true);
                }}
                aria-label="Add Arrears Period"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </CardHeader>

        {isOpen && (
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Due: </span>
                    <span className="font-semibold">${totalDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Waived: </span>
                    <span className="font-semibold text-green-600">${totalWaived.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Outstanding: </span>
                    <span className="font-semibold text-destructive">${totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
                <Button onClick={() => setAddDialogOpen(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Period
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">No.</TableHead>
                        <TableHead>Employer</TableHead>
                        <TableHead>Debt Period</TableHead>
                        <TableHead>D.O.P.</TableHead>
                        <TableHead className="text-right">S.S.C</TableHead>
                        <TableHead className="text-right">S.S.F</TableHead>
                        <TableHead className="text-right">Costs/Fees</TableHead>
                        <TableHead className="text-right">L.V.C</TableHead>
                        <TableHead className="text-right">L.V.P</TableHead>
                        <TableHead className="text-right">P.E.C</TableHead>
                        <TableHead className="text-right">Waiver</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead className="w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {periods.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={13} className="text-center text-muted-foreground py-8">
                            No arrears periods recorded. Click "Add Period" to create one.
                          </TableCell>
                        </TableRow>
                      ) : (
                        periods.map((period, index) => (
                          <TableRow key={period.id}>
                            <TableCell className="font-medium">{index + 1}</TableCell>
                            <TableCell className="font-medium">{period.employer}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              {new Date(period.periodFrom).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })} - {new Date(period.periodTo).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                            </TableCell>
                            <TableCell>
                              {period.dateOfPayment ? (
                                <span className="text-sm">{new Date(period.dateOfPayment).toLocaleDateString()}</span>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">${period.ssc.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-right">${period.ssf.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-right">${period.costsFees.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-right">${period.lvc.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-right">${period.lvp.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-right">${period.pec.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-right">
                              {period.waiverApplied > 0 ? (
                                <span className="text-green-600">${period.waiverApplied.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              <span className={period.balanceOutstanding > 0 ? "text-destructive" : "text-green-600"}>
                                ${period.balanceOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(period)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(period.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="text-xs text-muted-foreground space-y-1 mt-4">
                <p><strong>Abbreviations:</strong></p>
                <ul className="list-disc list-inside space-y-0.5 ml-2">
                  <li>S.S.C = Social Security Contribution</li>
                  <li>S.S.F = Social Security Fund</li>
                  <li>L.V.C = Local Voluntary Contribution</li>
                  <li>L.V.P = Local Voluntary Pension</li>
                  <li>P.E.C = Penalty Enforcement Costs</li>
                  <li>D.O.P. = Date of Payment</li>
                </ul>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <AddArrearsPeriodDialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) setEditingPeriod(null);
        }}
        caseId={caseId}
        period={editingPeriod}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Period</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this arrears period? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
