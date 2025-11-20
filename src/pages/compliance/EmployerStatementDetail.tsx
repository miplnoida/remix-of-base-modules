import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Printer, ArrowLeft } from "lucide-react";
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

export default function EmployerStatementDetail() {
  const navigate = useNavigate();
  const { employerId } = useParams();
  
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

  const renderComponentSection = (componentName: string, componentCode: string, transactions: any[]) => {
    let runningBalance = 0;
    
    return (
      <div className="mb-8 border rounded-lg overflow-hidden">
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
            {transactions.map((txn, index) => {
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
                {formatCurrency(transactions.filter(t => t.transactionType === 'DEBIT').reduce((sum, t) => sum + t.amount, 0))}
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrency(transactions.filter(t => t.transactionType === 'CREDIT').reduce((sum, t) => sum + t.amount, 0))}
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
    const allTransactions = [
      ...statement.ssc,
      ...statement.ssf,
      ...statement.lvc,
      ...statement.lvf,
      ...statement.pec,
      ...statement.pef
    ];
    
    const totalDebits = allTransactions
      .filter(t => t.transactionType === 'DEBIT')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalCredits = allTransactions
      .filter(t => t.transactionType === 'CREDIT')
      .reduce((sum, t) => sum + t.amount, 0);
    
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
                const debits = comp.data.filter(t => t.transactionType === 'DEBIT').reduce((sum, t) => sum + t.amount, 0);
                const credits = comp.data.filter(t => t.transactionType === 'CREDIT').reduce((sum, t) => sum + t.amount, 0);
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
