import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AddWaiverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
}

export function AddWaiverDialog({ open, onOpenChange, caseId }: AddWaiverDialogProps) {
  const [waiverType, setWaiverType] = useState("");
  const [amountType, setAmountType] = useState<"amount" | "percent">("amount");
  const [amount, setAmount] = useState("");
  const [percent, setPercent] = useState("");
  const [authorizedBy, setAuthorizedBy] = useState("");
  const [date, setDate] = useState<Date>();
  const [reason, setReason] = useState("");

  const handleSubmit = () => {
    // Validate fields
    if (!waiverType || !authorizedBy || !date || !reason) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (amountType === "amount" && !amount) {
      toast.error("Please enter a waiver amount");
      return;
    }

    if (amountType === "percent") {
      const percentValue = parseFloat(percent);
      if (!percent || percentValue < 0 || percentValue > 100) {
        toast.error("Percent must be between 0 and 100");
        return;
      }
    }

    if (date > new Date()) {
      toast.error("Date cannot be in the future");
      return;
    }

    // TODO: Submit to backend
    toast.success("Waiver created successfully");
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setWaiverType("");
    setAmountType("amount");
    setAmount("");
    setPercent("");
    setAuthorizedBy("");
    setDate(undefined);
    setReason("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Waiver</DialogTitle>
          <DialogDescription>
            Create a new waiver to adjust the outstanding balance
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="waiverType">Waiver Type *</Label>
            <Select value={waiverType} onValueChange={setWaiverType}>
              <SelectTrigger id="waiverType">
                <SelectValue placeholder="Select waiver type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Penalty 5k">Penalty 5k</SelectItem>
                <SelectItem value="Contribution">Contribution</SelectItem>
                <SelectItem value="Administrative Fee">Administrative Fee</SelectItem>
                <SelectItem value="Court Costs">Court Costs</SelectItem>
                <SelectItem value="Interest">Interest</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Waiver Amount Type *</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={amountType === "amount"}
                  onChange={() => setAmountType("amount")}
                  className="cursor-pointer"
                />
                <span>Fixed Amount</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={amountType === "percent"}
                  onChange={() => setAmountType("percent")}
                  className="cursor-pointer"
                />
                <span>Percentage</span>
              </label>
            </div>
          </div>

          {amountType === "amount" ? (
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount ($) *</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="percent">Percentage (%) *</Label>
              <Input
                id="percent"
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="0"
                value={percent}
                onChange={(e) => setPercent(e.target.value)}
              />
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="authorizedBy">Authorized By *</Label>
            <Input
              id="authorizedBy"
              placeholder="Enter name"
              value={authorizedBy}
              onChange={(e) => setAuthorizedBy(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label>Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(date) => date > new Date()}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="reason">Reason *</Label>
            <Textarea
              id="reason"
              placeholder="Explain the reason for this waiver"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Create Waiver</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
