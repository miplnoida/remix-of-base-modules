import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2, Calculator, Receipt } from "lucide-react";

export default function PaymentEntry() {
  const [payerType, setPayerType] = useState("");
  const [paymentLines, setPaymentLines] = useState<any[]>([]);
  const [currentLine, setCurrentLine] = useState({
    head: "",
    period: "",
    amount: "",
    method: "",
    fund: "",
    reference: ""
  });

  const addPaymentLine = () => {
    if (!currentLine.head || !currentLine.amount) {
      toast.error("Please fill in required fields");
      return;
    }

    setPaymentLines([...paymentLines, { ...currentLine, id: Date.now() }]);
    setCurrentLine({
      head: "",
      period: "",
      amount: "",
      method: "",
      fund: "",
      reference: ""
    });
    toast.success("Payment line added");
  };

  const removeLine = (id: number) => {
    setPaymentLines(paymentLines.filter(line => line.id !== id));
    toast.info("Payment line removed");
  };

  const calculateTotal = () => {
    return paymentLines.reduce((sum, line) => sum + parseFloat(line.amount || 0), 0).toFixed(2);
  };

  const generateReceipt = () => {
    if (paymentLines.length === 0) {
      toast.error("No payment lines to process");
      return;
    }
    toast.success("Receipt generated successfully");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Payment Entry</h1>
        <p className="text-muted-foreground">Record payments from employers, insured persons, or contributors</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payer Information</CardTitle>
          <CardDescription>Select payer type and link to database</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Payer Type</Label>
              <Select value={payerType} onValueChange={setPayerType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employer">Employer</SelectItem>
                  <SelectItem value="insured">Insured Person</SelectItem>
                  <SelectItem value="self-employed">Self-Employed</SelectItem>
                  <SelectItem value="voluntary">Voluntary Contributor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Payer ID / SSN</Label>
              <Input placeholder="Enter ID or SSN" />
            </div>

            <div>
              <Label>Payer Name</Label>
              <Input placeholder="Auto-filled from database" disabled />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
          <CardDescription>Add payment lines for this transaction</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Payment Head</Label>
              <Select value={currentLine.head} onValueChange={(v) => setCurrentLine({...currentLine, head: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select head" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="social-security">Social Security Contribution</SelectItem>
                  <SelectItem value="levy">Education Levy</SelectItem>
                  <SelectItem value="pe">Public Enterprise</SelectItem>
                  <SelectItem value="penalty">Penalty</SelectItem>
                  <SelectItem value="interest">Interest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Period</Label>
              <Input 
                type="month"
                value={currentLine.period}
                onChange={(e) => setCurrentLine({...currentLine, period: e.target.value})}
              />
            </div>

            <div>
              <Label>Amount (XCD)</Label>
              <Input 
                type="number"
                step="0.01"
                placeholder="0.00"
                value={currentLine.amount}
                onChange={(e) => setCurrentLine({...currentLine, amount: e.target.value})}
              />
            </div>

            <div>
              <Label>Payment Method</Label>
              <Select value={currentLine.method} onValueChange={(v) => setCurrentLine({...currentLine, method: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="card">Debit/Credit Card</SelectItem>
                  <SelectItem value="eft">EFT/Wire Transfer</SelectItem>
                  <SelectItem value="mop">Money Order/Postal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Fund Category</Label>
              <Select value={currentLine.fund} onValueChange={(v) => setCurrentLine({...currentLine, fund: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select fund" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="social">Social Security Fund</SelectItem>
                  <SelectItem value="levy">Levy Fund</SelectItem>
                  <SelectItem value="pe">PE Fund</SelectItem>
                  <SelectItem value="rental">Rental Fund</SelectItem>
                  <SelectItem value="loan">Loan Repayment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Reference / MOP Number</Label>
              <Input 
                placeholder="Enter reference"
                value={currentLine.reference}
                onChange={(e) => setCurrentLine({...currentLine, reference: e.target.value})}
              />
            </div>
          </div>

          <Button onClick={addPaymentLine} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Payment Line
          </Button>
        </CardContent>
      </Card>

      {paymentLines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Lines Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Head</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Fund</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentLines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="font-medium">{line.head}</TableCell>
                    <TableCell>{line.period}</TableCell>
                    <TableCell>${line.amount}</TableCell>
                    <TableCell>{line.method}</TableCell>
                    <TableCell>{line.fund}</TableCell>
                    <TableCell>{line.reference}</TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => removeLine(line.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex justify-between items-center mt-6 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                <span className="text-lg font-semibold">Total Amount:</span>
              </div>
              <span className="text-2xl font-bold">${calculateTotal()}</span>
            </div>

            <div className="flex gap-4 mt-6">
              <Button onClick={generateReceipt} className="flex-1">
                <Receipt className="h-4 w-4 mr-2" />
                Generate Receipt
              </Button>
              <Button variant="outline" className="flex-1">
                View Denomination Preview
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
