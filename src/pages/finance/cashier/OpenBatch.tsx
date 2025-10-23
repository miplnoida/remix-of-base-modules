import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Play, Info } from "lucide-react";

export default function OpenBatch() {
  const [formData, setFormData] = useState({
    cashier: "John Smith",
    office: "",
    openingCashXCD: "",
    openingCashUSD: "",
  });
  const [opening, setOpening] = useState(false);

  const handleOpenBatch = () => {
    if (!formData.office) {
      toast.error("Please select an office location");
      return;
    }

    setOpening(true);
    setTimeout(() => {
      toast.success("Batch opened successfully!");
      setOpening(false);
    }, 1500);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="bema-h1 mb-2" style={{ color: "hsl(var(--bema-text-primary))" }}>Open Cashier Batch</h1>
        <p className="bema-t1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Start a new cashier session with opening balance</p>
      </div>

      {/* Main Form Card */}
      <Card className="bema-card">
        <CardHeader>
          <CardTitle className="bema-h2">Batch Details</CardTitle>
          <CardDescription>Enter opening cash balances and select office location</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="bema-t1">Cashier Name</Label>
              <Input value={formData.cashier} disabled className="mt-1" />
            </div>
            <div>
              <Label className="bema-t1">Office Location *</Label>
              <Select value={formData.office} onValueChange={(val) => setFormData({ ...formData, office: val })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select office" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basseterre">Basseterre Main Office</SelectItem>
                  <SelectItem value="charlestown">Charlestown Branch</SelectItem>
                  <SelectItem value="cayon">Cayon Office</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="bema-t1">Opening Cash Balance (XCD)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={formData.openingCashXCD}
                onChange={(e) => setFormData({ ...formData, openingCashXCD: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="bema-t1">Opening Cash Balance (USD)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={formData.openingCashUSD}
                onChange={(e) => setFormData({ ...formData, openingCashUSD: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <Button 
            onClick={handleOpenBatch} 
            disabled={opening} 
            className="w-full bema-btn-primary"
          >
            <Play className="h-4 w-4 mr-2" />
            {opening ? "Opening Batch..." : "Open Batch"}
          </Button>
        </CardContent>
      </Card>

      {/* Instructions Card */}
      <Card className="bema-card border" style={{ borderColor: "hsl(var(--bema-primary))" }}>
        <CardHeader>
          <CardTitle className="bema-h2 flex items-center gap-2">
            <Info className="h-5 w-5" style={{ color: "hsl(var(--bema-primary))" }} />
            Instructions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 bema-t1" style={{ color: "hsl(var(--bema-text-primary))" }}>
            <li>• Only one active batch is allowed per cashier at a time</li>
            <li>• Ensure physical cash count matches the opening balance entered</li>
            <li>• Select the correct office location for accurate tracking</li>
            <li>• Opening balances can include carry-forward amounts from previous day</li>
            <li>• Contact supervisor if you need to reopen a previously closed batch</li>
          </ul>
        </CardContent>
      </Card>

      {/* Recent Batch History */}
      <Card className="bema-card">
        <CardHeader>
          <CardTitle className="bema-h2">Recent Batch History</CardTitle>
          <CardDescription>Last 5 batches opened by you</CardDescription>
        </CardHeader>
        <CardContent>
          <Table className="bema-table">
            <TableHeader>
              <TableRow>
                <TableHead>Batch Number</TableHead>
                <TableHead>Office</TableHead>
                <TableHead>Opened At</TableHead>
                <TableHead>Opening Balance (XCD)</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { number: "BCH-2025-001-0422", office: "Basseterre Main", opened: "2025-04-22 08:30 AM", balance: 500, status: "Closed" },
                { number: "BCH-2025-001-0421", office: "Basseterre Main", opened: "2025-04-21 08:45 AM", balance: 450, status: "Closed" },
                { number: "BCH-2025-001-0420", office: "Basseterre Main", opened: "2025-04-20 09:00 AM", balance: 500, status: "Closed" },
              ].map((batch) => (
                <TableRow key={batch.number}>
                  <TableCell className="font-medium">{batch.number}</TableCell>
                  <TableCell>{batch.office}</TableCell>
                  <TableCell>{batch.opened}</TableCell>
                  <TableCell>${batch.balance.toFixed(2)}</TableCell>
                  <TableCell>
                    <span className="bema-badge-success">{batch.status}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
