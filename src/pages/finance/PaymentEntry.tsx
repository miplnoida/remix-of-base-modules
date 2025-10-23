import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2, Save, Search } from "lucide-react";

interface PaymentLine {
  id: string;
  amount: string;
  head: string;
  fund: string;
  method: string;
  period: string;
  mopNumber: string;
}

export default function PaymentEntry() {
  const [payerType, setPayerType] = useState("");
  const [payerId, setPayerId] = useState("");
  const [payerName, setPayerName] = useState("");
  const [remarks, setRemarks] = useState("");
  const [dateReceived, setDateReceived] = useState(new Date().toISOString().split('T')[0]);
  
  const [paymentLines, setPaymentLines] = useState<PaymentLine[]>([
    { id: "1", amount: "", head: "", fund: "", method: "", period: "", mopNumber: "" }
  ]);

  const addPaymentLine = () => {
    setPaymentLines([
      ...paymentLines,
      { id: Date.now().toString(), amount: "", head: "", fund: "", method: "", period: "", mopNumber: "" }
    ]);
  };

  const removePaymentLine = (id: string) => {
    if (paymentLines.length > 1) {
      setPaymentLines(paymentLines.filter(line => line.id !== id));
    }
  };

  const updatePaymentLine = (id: string, field: keyof PaymentLine, value: string) => {
    setPaymentLines(paymentLines.map(line => 
      line.id === id ? { ...line, [field]: value } : line
    ));
  };

  const calculateTotal = () => {
    return paymentLines.reduce((sum, line) => sum + (parseFloat(line.amount) || 0), 0);
  };

  const handleLookupPayer = () => {
    if (payerId) {
      setPayerName("Sample Payer Name (ID: " + payerId + ")");
      toast.success("Payer details loaded");
    } else {
      toast.error("Enter Payer ID first");
    }
  };

  const handleSavePayment = () => {
    if (!payerType || !payerId || paymentLines.some(l => !l.amount || !l.head)) {
      toast.error("Please fill all required fields");
      return;
    }
    toast.success("Payment recorded successfully! Receipt generated.");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="bema-h1 mb-2" style={{ color: "hsl(var(--bema-text-primary))" }}>Payment Entry</h1>
        <p className="bema-t1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Record payments from employers, insured persons, or other contributors</p>
      </div>

      <Card className="bema-card">
        <CardHeader>
          <CardTitle className="bema-h2">Payer Identification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="bema-t1">Payer Type *</Label>
              <Select value={payerType} onValueChange={setPayerType}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employer">Employer</SelectItem>
                  <SelectItem value="ip">Insured Person</SelectItem>
                  <SelectItem value="self">Self-Employed</SelectItem>
                  <SelectItem value="vol">Voluntary Contributor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="bema-t1">Payer ID *</Label>
              <div className="flex gap-2 mt-1">
                <Input 
                  placeholder="Enter ID" 
                  value={payerId}
                  onChange={(e) => setPayerId(e.target.value)}
                />
                <Button onClick={handleLookupPayer} variant="outline" size="icon">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label className="bema-t1">Payer Name</Label>
              <Input value={payerName} disabled className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="bema-t1">Date Received</Label>
              <Input type="date" value={dateReceived} onChange={(e) => setDateReceived(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="bema-t1">Remarks</Label>
              <Input placeholder="Optional notes" value={remarks} onChange={(e) => setRemarks(e.target.value)} className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bema-card">
        <CardHeader>
          <CardTitle className="bema-h2 flex items-center justify-between">
            Payment Details
            <Button onClick={addPaymentLine} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Line
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="bema-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Amount *</TableHead>
                  <TableHead>Head *</TableHead>
                  <TableHead>Fund</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>MOP #</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentLines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>
                      <Input 
                        type="number" 
                        placeholder="0.00" 
                        value={line.amount}
                        onChange={(e) => updatePaymentLine(line.id, "amount", e.target.value)}
                        className="w-32"
                      />
                    </TableCell>
                    <TableCell>
                      <Select value={line.head} onValueChange={(val) => updatePaymentLine(line.id, "head", val)}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ss">SS Contribution</SelectItem>
                          <SelectItem value="levy">Levy</SelectItem>
                          <SelectItem value="pe">PE</SelectItem>
                          <SelectItem value="loan">Loan</SelectItem>
                          <SelectItem value="rental">Rental</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={line.fund} onValueChange={(val) => updatePaymentLine(line.id, "fund", val)}>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Fund" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ss">SS</SelectItem>
                          <SelectItem value="levy">Levy</SelectItem>
                          <SelectItem value="loan">Loan</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={line.method} onValueChange={(val) => updatePaymentLine(line.id, "method", val)}>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="MOP" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="cheque">Cheque</SelectItem>
                          <SelectItem value="eft">EFT</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="month" 
                        value={line.period}
                        onChange={(e) => updatePaymentLine(line.id, "period", e.target.value)}
                        className="w-40"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        placeholder="Cheque/Ref #" 
                        value={line.mopNumber}
                        onChange={(e) => updatePaymentLine(line.id, "mopNumber", e.target.value)}
                        className="w-32"
                      />
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => removePaymentLine(line.id)}
                        disabled={paymentLines.length === 1}
                      >
                        <Trash2 className="h-4 w-4" style={{ color: "hsl(var(--bema-warning))" }} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: "hsl(var(--bema-secondary))" }}>
            <div className="flex justify-between items-center">
              <span className="bema-h2">Total Amount:</span>
              <span className="bema-h1" style={{ color: "hsl(var(--bema-primary))" }}>
                ${calculateTotal().toFixed(2)}
              </span>
            </div>
          </div>

          <Button onClick={handleSavePayment} className="w-full mt-4 bema-btn-primary">
            <Save className="h-4 w-4 mr-2" />
            Save Payment & Generate Receipt
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
