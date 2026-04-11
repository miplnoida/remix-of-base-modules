import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Printer, ArrowLeft, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { fetchEmployerStatementTransactions } from "@/services/complianceDataService";

export default function EmployerStatementDetail() {
  const navigate = useNavigate();
  const { employerId } = useParams();
  const [fromDate, setFromDate] = useState<Date>();
  const [toDate, setToDate] = useState<Date>();
  const [reportType, setReportType] = useState<"detailed" | "summary">("detailed");

  const { data: statement, isLoading } = useQuery({
    queryKey: ['ce_employer_statement_detail', employerId],
    queryFn: () => fetchEmployerStatementTransactions(employerId!),
    enabled: !!employerId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!statement || (!statement.ssc.length && !statement.lvc.length && !statement.pec.length)) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">No Statement Data Found</h2>
          <p className="text-muted-foreground mb-4">No financial ledger entries found for this employer.</p>
          <Button onClick={() => navigate('/compliance/employer-statements')}>Back to Statements</Button>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'XCD', minimumFractionDigits: 2 }).format(amount);
  };

  const formatDateStr = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
  };

  const filterTransactionsByDate = (transactions: any[]) => {
    if (!fromDate && !toDate) return transactions;
    return transactions.filter(txn => {
      const txnDate = new Date(txn.date);
      if (fromDate && txnDate < fromDate) return false;
      if (toDate && txnDate > toDate) return false;
      return true;
    });
  };

  const getSummaryTransactions = (transactions: any[]) => {
    const yearlyData: { [key: string]: { debits: number; credits: number } } = {};
    transactions.forEach(txn => {
      const year = new Date(txn.date).getFullYear().toString();
      if (!yearlyData[year]) yearlyData[year] = { debits: 0, credits: 0 };
      if (txn.transactionType === 'DEBIT') yearlyData[year].debits += txn.amount;
      else yearlyData[year].credits += txn.amount;
    });
    const summaryEntries: any[] = [];
    let openingBalance = 0;
    Object.keys(yearlyData).sort().forEach(year => {
      const yd = yearlyData[year];
      summaryEntries.push({ date: `${year}-01-01`, period: year, description: `Opening Balance - ${year}`, transactionType: 'OPENING', amount: 0, openingBalance });
      if (yd.debits > 0) summaryEntries.push({ date: `${year}-12-31`, period: year, description: `Total Amount Due for ${year}`, transactionType: 'DEBIT', amount: yd.debits });
      if (yd.credits > 0) summaryEntries.push({ date: `${year}-12-31`, period: year, description: `Total Payments Received for ${year}`, transactionType: 'CREDIT', amount: yd.credits });
      openingBalance += yd.debits - yd.credits;
    });
    return summaryEntries;
  };

  const renderComponentSection = (componentName: string, componentCode: string, transactions: any[]) => {
    const filteredTransactions = filterTransactionsByDate(transactions);
    let openingBalance = 0;
    if (fromDate) {
      transactions.forEach(txn => {
        const txnDate = new Date(txn.date);
        if (txnDate < fromDate) openingBalance += txn.transactionType === 'DEBIT' ? txn.amount : -txn.amount;
      });
    }
    const displayTransactions = reportType === "summary" ? getSummaryTransactions(filteredTransactions) : filteredTransactions;
    let runningBalance = openingBalance;

    return (
      <div className="mb-8 border rounded-lg overflow-hidden" key={componentCode}>
        <div className="bg-primary text-primary-foreground px-4 py-3">
          <h3 className="text-lg font-semibold">{componentName} ({componentCode})</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[100px]">Date</TableHead>
              <TableHead className="w-[120px]">Period</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right w-[130px]">Debit (XCD)</TableHead>
              <TableHead className="text-right w-[130px]">Credit (XCD)</TableHead>
              <TableHead className="text-right w-[150px]">Balance (XCD)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(openingBalance !== 0 || fromDate) && (
              <TableRow className="bg-muted/20 font-semibold border-b-2">
                <TableCell className="text-sm">{fromDate ? formatDateStr(fromDate.toISOString()) : 'Start'}</TableCell>
                <TableCell className="text-sm font-mono">-</TableCell>
                <TableCell className="text-sm">Opening Balance</TableCell>
                <TableCell className="text-right font-mono text-sm">-</TableCell>
                <TableCell className="text-right font-mono text-sm">-</TableCell>
                <TableCell className="text-right font-mono text-sm font-semibold text-info">{formatCurrency(openingBalance)}</TableCell>
              </TableRow>
            )}
            {displayTransactions.map((txn: any, index: number) => {
              if (txn.transactionType === 'OPENING') {
                runningBalance = txn.openingBalance;
                return (
                  <TableRow key={index} className="bg-muted/20 font-semibold">
                    <TableCell className="text-sm">{formatDateStr(txn.date)}</TableCell>
                    <TableCell className="text-sm font-mono">{txn.period}</TableCell>
                    <TableCell className="text-sm">{txn.description}</TableCell>
                    <TableCell className="text-right font-mono text-sm">-</TableCell>
                    <TableCell className="text-right font-mono text-sm">-</TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold">{formatCurrency(runningBalance)}</TableCell>
                  </TableRow>
                );
              }
              runningBalance = txn.transactionType === 'DEBIT' ? runningBalance + txn.amount : runningBalance - txn.amount;
              return (
                <TableRow key={index} className="hover:bg-muted/30">
                  <TableCell className="text-sm">{formatDateStr(txn.date)}</TableCell>
                  <TableCell className="text-sm font-mono">{txn.period}</TableCell>
                  <TableCell className="text-sm">{txn.description}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{txn.transactionType === 'DEBIT' ? formatCurrency(txn.amount) : '-'}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{txn.transactionType === 'CREDIT' ? formatCurrency(txn.amount) : '-'}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold">{formatCurrency(runningBalance)}</TableCell>
                </TableRow>
              );
            })}
            <TableRow className="bg-muted font-semibold">
              <TableCell colSpan={3} className="text-right">Component Total:</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(displayTransactions.filter((t: any) => t.transactionType === 'DEBIT').reduce((sum: number, t: any) => sum + t.amount, 0))}</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(displayTransactions.filter((t: any) => t.transactionType === 'CREDIT').reduce((sum: number, t: any) => sum + t.amount, 0))}</TableCell>
              <TableCell className="text-right font-mono text-primary">{formatCurrency(runningBalance)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  };

  const allComponents = [
    { name: 'SSC', data: statement.ssc }, { name: 'SSF', data: statement.ssf },
    { name: 'LVC', data: statement.lvc }, { name: 'LVF', data: statement.lvf },
    { name: 'PEC', data: statement.pec }, { name: 'PEF', data: statement.pef },
  ];
  let totalDebits = 0, totalCredits = 0;
  allComponents.forEach(comp => {
    const ft = filterTransactionsByDate(comp.data);
    const dt = reportType === "summary" ? getSummaryTransactions(ft) : ft;
    totalDebits += dt.filter((t: any) => t.transactionType === 'DEBIT').reduce((s: number, t: any) => s + t.amount, 0);
    totalCredits += dt.filter((t: any) => t.transactionType === 'CREDIT').reduce((s: number, t: any) => s + t.amount, 0);
  });
  const balance = totalDebits - totalCredits;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/compliance/employer-statements')}><ArrowLeft className="h-5 w-5" /></Button>
          <div><h1 className="text-3xl font-bold text-foreground">Employer Statement</h1><p className="text-muted-foreground">Banking-style transaction ledger</p></div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2"><Printer className="h-4 w-4" />Print</Button>
          <Button className="gap-2"><Download className="h-4 w-4" />Download PDF</Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">From Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !fromDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />{fromDate ? format(fromDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={fromDate} onSelect={setFromDate} initialFocus className={cn("p-3 pointer-events-auto")} /></PopoverContent>
              </Popover>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">To Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !toDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />{toDate ? format(toDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={toDate} onSelect={setToDate} initialFocus className={cn("p-3 pointer-events-auto")} /></PopoverContent>
              </Popover>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Report Type</label>
              <Select value={reportType} onValueChange={(v: "detailed" | "summary") => setReportType(v)}>
                <SelectTrigger><SelectValue placeholder="Select report type" /></SelectTrigger>
                <SelectContent><SelectItem value="detailed">Detailed Report</SelectItem><SelectItem value="summary">Summary Report</SelectItem></SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={() => { setFromDate(undefined); setToDate(undefined); setReportType("detailed"); }}>Clear Filters</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b bg-muted/30">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl mb-2">{statement.employerName}</CardTitle>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p><span className="font-semibold">Employer ID:</span> {statement.employerId}</p>
                <p><span className="font-semibold">Statement Period:</span> {statement.statementPeriodFrom} to {statement.statementPeriodTo}</p>
                <p><span className="font-semibold">Generated On:</span> {formatDateStr(statement.generatedDate)}</p>
              </div>
            </div>
            <div className="text-right">
              <Badge variant={balance > 0 ? "destructive" : "default"} className="text-sm px-3 py-1">{balance > 0 ? "OUTSTANDING" : "COMPLIANT"}</Badge>
              <div className="mt-3 text-sm"><p className="text-muted-foreground">Outstanding Balance</p><p className="text-2xl font-bold text-foreground">{formatCurrency(balance)}</p></div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-6">
            <div><p className="text-xs text-muted-foreground mb-1">Total Contributions Due</p><p className="text-lg font-semibold text-foreground">{formatCurrency(totalDebits)}</p></div>
            <div><p className="text-xs text-muted-foreground mb-1">Total Payments Received</p><p className="text-lg font-semibold text-primary">{formatCurrency(totalCredits)}</p></div>
            <div><p className="text-xs text-muted-foreground mb-1">Net Outstanding</p><p className="text-lg font-semibold text-destructive">{formatCurrency(balance)}</p></div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {statement.ssc.length > 0 && renderComponentSection("Social Security Contributions", "SSC", statement.ssc)}
        {statement.ssf.length > 0 && renderComponentSection("Social Security Penalties", "SSF", statement.ssf)}
        {statement.lvc.length > 0 && renderComponentSection("Housing & Social Development Levy Contributions", "LVC", statement.lvc)}
        {statement.lvf.length > 0 && renderComponentSection("Levy Penalties", "LVF", statement.lvf)}
        {statement.pec.length > 0 && renderComponentSection("Severance Contributions", "PEC", statement.pec)}
        {statement.pef.length > 0 && renderComponentSection("Severance Penalties", "PEF", statement.pef)}
      </div>

      <Card className="border-2 border-primary">
        <CardHeader className="bg-primary/10"><CardTitle>Statement Summary - All Components</CardTitle></CardHeader>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Component</TableHead>
                <TableHead className="text-right">Total Debits</TableHead>
                <TableHead className="text-right">Total Credits</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allComponents.filter(c => c.data.length > 0).map(comp => {
                const ft = filterTransactionsByDate(comp.data);
                const dt = reportType === "summary" ? getSummaryTransactions(ft) : ft;
                const d = dt.filter((t: any) => t.transactionType === 'DEBIT').reduce((s: number, t: any) => s + t.amount, 0);
                const c = dt.filter((t: any) => t.transactionType === 'CREDIT').reduce((s: number, t: any) => s + t.amount, 0);
                return (
                  <TableRow key={comp.name}>
                    <TableCell className="font-medium">{comp.name}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(d)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(c)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(d - c)}</TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="font-bold bg-muted">
                <TableCell>Grand Total</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(totalDebits)}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(totalCredits)}</TableCell>
                <TableCell className="text-right font-mono text-primary">{formatCurrency(balance)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
