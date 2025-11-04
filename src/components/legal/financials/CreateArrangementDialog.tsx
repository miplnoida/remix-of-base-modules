import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { format, addMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Installment {
  date: Date;
  amount: number;
}

interface CreateArrangementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  totalAmount?: number;
}

export function CreateArrangementDialog({ open, onOpenChange, caseId, totalAmount = 0 }: CreateArrangementDialogProps) {
  const [terms, setTerms] = useState("");
  const [durationMonths, setDurationMonths] = useState("");
  const [startDate, setStartDate] = useState<Date>();
  const [status, setStatus] = useState("On Track");
  const [installments, setInstallments] = useState<Installment[]>([]);

  const handleGenerateSchedule = () => {
    if (!durationMonths || !startDate) {
      toast.error("Please set duration and start date first");
      return;
    }

    const months = parseInt(durationMonths);
    if (months <= 0) {
      toast.error("Duration must be greater than 0");
      return;
    }

    const amountPerInstallment = totalAmount / months;
    const schedule: Installment[] = [];

    for (let i = 0; i < months; i++) {
      schedule.push({
        date: addMonths(startDate, i),
        amount: parseFloat(amountPerInstallment.toFixed(2)),
      });
    }

    setInstallments(schedule);
    toast.success(`Generated ${months} installments`);
  };

  const handleAddInstallment = () => {
    setInstallments([...installments, { date: new Date(), amount: 0 }]);
  };

  const handleRemoveInstallment = (index: number) => {
    setInstallments(installments.filter((_, i) => i !== index));
  };

  const handleUpdateInstallment = (index: number, field: "date" | "amount", value: Date | number) => {
    const updated = [...installments];
    if (field === "date") {
      updated[index].date = value as Date;
    } else {
      updated[index].amount = value as number;
    }
    setInstallments(updated);
  };

  const handleSubmit = () => {
    // Validate
    if (!terms || !durationMonths || !startDate || !status) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (installments.length === 0) {
      toast.error("Please add at least one installment");
      return;
    }

    // Check for future dates on installments
    const hasFutureStartDate = startDate > new Date();
    if (hasFutureStartDate) {
      toast.error("Start date cannot be in the future");
      return;
    }

    // TODO: Submit to backend
    toast.success("Payment arrangement created successfully");
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setTerms("");
    setDurationMonths("");
    setStartDate(undefined);
    setStatus("On Track");
    setInstallments([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Payment Arrangement</DialogTitle>
          <DialogDescription>
            Set up a payment plan with installments
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="terms">Terms *</Label>
            <Textarea
              id="terms"
              placeholder="Describe the payment arrangement terms (e.g., Monthly payments over 12 months)"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="durationMonths">Duration (Months) *</Label>
              <Input
                id="durationMonths"
                type="number"
                min="1"
                placeholder="12"
                value={durationMonths}
                onChange={(e) => setDurationMonths(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="status">Status *</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="On Track">On Track</SelectItem>
                  <SelectItem value="Missed">Missed</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Start Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : "Select start date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  disabled={(date) => date > new Date()}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid gap-2">
            <div className="flex justify-between items-center">
              <Label>Payment Schedule *</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateSchedule}
                  disabled={!durationMonths || !startDate}
                >
                  Auto-Generate
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleAddInstallment}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>

            {installments.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Amount ($)</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {installments.map((installment, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="w-full justify-start">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {format(installment.date, "PPP")}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={installment.date}
                                onSelect={(date) => date && handleUpdateInstallment(index, "date", date)}
                                initialFocus
                                className="pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={installment.amount}
                            onChange={(e) => handleUpdateInstallment(index, "amount", parseFloat(e.target.value) || 0)}
                            className="text-right"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveInstallment(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="border rounded-lg p-8 text-center text-muted-foreground">
                No installments added. Use "Auto-Generate" or "Add" to create schedule.
              </div>
            )}

            {installments.length > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Total Installments:</span>
                <span className="font-semibold">{installments.length}</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Create Plan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
