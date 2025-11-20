import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Printer, ArrowLeft, Calendar as CalendarIcon } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { mockEmployerStatementTransactions } from "@/services/mockData/complianceData";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function EmployerStatementDetail() {
  const navigate = useNavigate();
  const { employerId } = useParams();
  const [fromDate, setFromDate] = useState<Date>();
  const [toDate, setToDate] = useState<Date>();
  const [reportType, setReportType] = useState<"detailed" | "summary">("detailed");
  
  const statement = mockEmployerStatementTransactions.find(s => s.employerId === employerId);
  
  if (!statement) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Statement Not Found</h2>
          <Button onClick={() => navigate('/compliance/employer-statements')}>
            Back to Statements
          </Button>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'XCD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    });
  };

  // Filter transactions by date range
  const filterTransactionsByDate = (transactions: any[]) => {
    if (!fromDate && !toDate) return transactions;
    
    return transactions.filter(txn => {
      const txnDate = new Date(txn.date);
      if (fromDate && txnDate < fromDate) return false;
      if (toDate && txnDate > toDate) return false;
      return true;
    });
  };

  // Group transactions by year for summary view
  const getSummaryTransactions = (transactions: any[]) => {
    const yearlyData: { [key: string]: { debits: number; credits: number; transactions: any[] } } = {};
    
    transactions.forEach(txn => {
      const year = new Date(txn.date).getFullYear().toString();
      if (!yearlyData[year]) {
        yearlyData[year] = { debits: 0, credits: 0, transactions: [] };
      }
      
      if (txn.transactionType === 'DEBIT') {
        yearlyData[year].debits += txn.amount;
      } else {
        yearlyData[year].credits += txn.amount;
      }
      yearlyData[year].transactions.push(txn);
    });

    // Create summary entries
    const summaryEntries: any[] = [];
    let openingBalance = 0;

    Object.keys(yearlyData).sort().forEach(year => {
      const yearData = yearlyData[year];
      const firstTxn = yearData.transactions[0];
      
      // Opening balance entry
      summaryEntries.push({
        date: `${year}-01-01`,
        period: year,
        description: `Opening Balance - ${year}`,
        transactionType: 'OPENING',
        amount: 0,
        openingBalance: openingBalance
      });

      // Net transaction entry
      const netAmount = yearData.debits - yearData.credits;
      summaryEntries.push({
        date: `${year}-12-31`,
        period: year,
        description: `Net Transactions for ${year}`,
        transactionType: netAmount >= 0 ? 'DEBIT' : 'CREDIT',
        amount: Math.abs(netAmount),
      });

      openingBalance += netAmount;
    });

    return summaryEntries;
  };

  const renderComponentSection = (componentName: string, componentCode: string, transactions: any[]) => {
    const filteredTransactions = filterTransactionsByDate(transactions);
    const displayTransactions = reportType === "summary" 
      ? getSummaryTransactions(filteredTransactions) 
      : filteredTransactions;
    
    let runningBalance = 0;
    
    return (
      <div className="mb-8 border rounded-lg overflow-hidden">
        <div className="bg-[hsl(var(--bema-primary))] text-white px-4 py-3">
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
            {displayTransactions.map((txn, index) => {
              // Handle opening balance
              if (txn.transactionType === 'OPENING') {
                runningBalance = txn.openingBalance;
                return (
                  <TableRow key={index} className="bg-muted/20 font-semibold">
                    <TableCell className="text-sm">{formatDate(txn.date)}</TableCell>
                    <TableCell className="text-sm font-mono">{txn.period}</TableCell>
                    <TableCell className="text-sm">{txn.description}</TableCell>
                    <TableCell className="text-right font-mono text-sm">-</TableCell>
                    <TableCell className="text-right font-mono text-sm">-</TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold">
                      {formatCurrency(runningBalance)}
                    </TableCell>
                  </TableRow>
                );
              }

              runningBalance = txn.transactionType === 'DEBIT' 
                ? runningBalance + txn.amount 
                : runningBalance - txn.amount;
              
              return (
                <TableRow key={index} className="hover:bg-muted/30">
                  <TableCell className="text-sm">{formatDate(txn.date)}</TableCell>
                  <TableCell className="text-sm font-mono">{txn.period}</TableCell>
                  <TableCell className="text-sm">{txn.description}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {txn.transactionType === 'DEBIT' ? formatCurrency(txn.amount) : '-'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {txn.transactionType === 'CREDIT' ? formatCurrency(txn.amount) : '-'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold">
                    {formatCurrency(runningBalance)}
                  </TableCell>
                </TableRow>
              );
            })}
            <TableRow className="bg-muted font-semibold">
              <TableCell colSpan={3} className="text-right">Component Total:</TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrency(displayTransactions.filter(t => t.transactionType === 'DEBIT').reduce((sum, t) => sum + t.amount, 0))}
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrency(displayTransactions.filter(t => t.transactionType === 'CREDIT').reduce((sum, t) => sum + t.amount, 0))}
              </TableCell>
              <TableCell className="text-right font-mono text-primary">
                {formatCurrency(runningBalance)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  };

  const calculateGrandTotals = () => {
    const allComponents = [
      { name: 'SSC', data: statement.ssc },
      { name: 'SSF', data: statement.ssf },
      { name: 'LVC', data: statement.lvc },
      { name: 'LVF', data: statement.lvf },
      { name: 'PEC', data: statement.pec },
      { name: 'PEF', data: statement.pef }
    ];

    let totalDebits = 0;
    let totalCredits = 0;

    allComponents.forEach(comp => {
      const filteredTransactions = filterTransactionsByDate(comp.data);
      const displayTransactions = reportType === "summary" 
        ? getSummaryTransactions(filteredTransactions) 
        : filteredTransactions;
      
      totalDebits += displayTransactions
        .filter(t => t.transactionType === 'DEBIT')
        .reduce((sum, t) => sum + t.amount, 0);
      
      totalCredits += displayTransactions
        .filter(t => t.transactionType === 'CREDIT')
        .reduce((sum, t) => sum + t.amount, 0);
    });
    
    const balance = totalDebits - totalCredits;
    
    return { totalDebits, totalCredits, balance };
  };

  const grandTotals = calculateGrandTotals();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/compliance/employer-statements')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Employer Statement</h1>
            <p className="text-muted-foreground">Banking-style transaction ledger</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button className="gap-2">
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">From Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !fromDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fromDate ? format(fromDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fromDate}
                    onSelect={setFromDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">To Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !toDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {toDate ? format(toDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={toDate}
                    onSelect={setToDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Report Type</label>
              <Select value={reportType} onValueChange={(value: "detailed" | "summary") => setReportType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="detailed">Detailed Report</SelectItem>
                  <SelectItem value="summary">Summary Report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              variant="outline"
              onClick={() => {
                setFromDate(undefined);
                setToDate(undefined);
                setReportType("detailed");
              }}
            >
              Clear Filters
            </Button>
          </div>

          {reportType === "summary" && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <span className="font-semibold">Summary Report:</span> Shows one entry per year with opening balance and net transactions for the period.
              </p>
            </div>
          )}
          {reportType === "detailed" && (
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-700 dark:text-green-300">
                <span className="font-semibold">Detailed Report:</span> Shows every single transaction with running balance.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statement Header */}
      <Card>
        <CardHeader className="border-b bg-muted/30">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl mb-2">{statement.employerName}</CardTitle>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p><span className="font-semibold">Employer ID:</span> {statement.employerId}</p>
                <p><span className="font-semibold">Statement Period:</span> {statement.statementPeriodFrom} to {statement.statementPeriodTo}</p>
                <p><span className="font-semibold">Generated On:</span> {formatDate(statement.generatedDate)}</p>
              </div>
            </div>
            <div className="text-right">
              <Badge variant={grandTotals.balance > 0 ? "destructive" : "default"} className="text-sm px-3 py-1">
                {grandTotals.balance > 0 ? "OUTSTANDING" : "COMPLIANT"}
              </Badge>
              <div className="mt-3 text-sm">
                <p className="text-muted-foreground">Outstanding Balance</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(grandTotals.balance)}</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total Contributions Due</p>
              <p className="text-lg font-semibold text-foreground">{formatCurrency(grandTotals.totalDebits)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total Payments Received</p>
              <p className="text-lg font-semibold text-green-600">{formatCurrency(grandTotals.totalCredits)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Net Outstanding</p>
              <p className="text-lg font-semibold text-destructive">{formatCurrency(grandTotals.balance)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Component Sections */}
      <div className="space-y-6">
        {statement.ssc.length > 0 && renderComponentSection("Social Security Contributions", "SSC", statement.ssc)}
        {statement.ssf.length > 0 && renderComponentSection("Social Security Penalties", "SSF", statement.ssf)}
        {statement.lvc.length > 0 && renderComponentSection("Housing & Social Development Levy Contributions", "LVC", statement.lvc)}
        {statement.lvf.length > 0 && renderComponentSection("Levy Penalties", "LVF", statement.lvf)}
        {statement.pec.length > 0 && renderComponentSection("Severance Contributions", "PEC", statement.pec)}
        {statement.pef.length > 0 && renderComponentSection("Severance Penalties", "PEF", statement.pef)}
      </div>

      {/* Grand Totals */}
      <Card className="border-2 border-primary">
        <CardHeader className="bg-primary/10">
          <CardTitle>Statement Summary - All Components</CardTitle>
        </CardHeader>
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
              {[
                { name: 'SSC', code: 'SSC', data: statement.ssc },
                { name: 'SSF', code: 'SSF', data: statement.ssf },
                { name: 'LVC', code: 'LVC', data: statement.lvc },
                { name: 'LVF', code: 'LVF', data: statement.lvf },
                { name: 'PEC', code: 'PEC', data: statement.pec },
                { name: 'PEF', code: 'PEF', data: statement.pef }
              ].map(comp => {
                const filteredTransactions = filterTransactionsByDate(comp.data);
                const displayTransactions = reportType === "summary" 
                  ? getSummaryTransactions(filteredTransactions) 
                  : filteredTransactions;
                
                const debits = displayTransactions.filter(t => t.transactionType === 'DEBIT').reduce((sum, t) => sum + t.amount, 0);
                const credits = displayTransactions.filter(t => t.transactionType === 'CREDIT').reduce((sum, t) => sum + t.amount, 0);
                const balance = debits - credits;
                
                return (
                  <TableRow key={comp.code}>
                    <TableCell className="font-semibold">{comp.name} ({comp.code})</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(debits)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(credits)}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">{formatCurrency(balance)}</TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="bg-primary/10 font-bold text-lg">
                <TableCell>GRAND TOTAL</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(grandTotals.totalDebits)}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(grandTotals.totalCredits)}</TableCell>
                <TableCell className="text-right font-mono text-primary">{formatCurrency(grandTotals.balance)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
