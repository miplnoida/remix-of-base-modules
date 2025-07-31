import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  ArrowLeft, 
  Search, 
  ChevronDown, 
  ChevronRight,
  FileDown,
  Printer,
  Download
} from 'lucide-react';

const EmployerStatement = () => {
  const navigate = useNavigate();
  const { currentTheme } = useTheme();
  
  const [searchData, setSearchData] = useState({
    employerNameId: '',
    fromDate: '',
    toDate: ''
  });
  const [expandedMonths, setExpandedMonths] = useState<string[]>(['March 2025']);
  const [hasSearched, setHasSearched] = useState(false);

  // Sample data based on the screenshot
  const employerData = {
    name: "Island Tech Solutions Ltd.",
    registrationNumber: "SKN-EMP-004219",
    address: "17 Bay Road, Basseterre",
    statementPeriod: "March 1, 2025 — May 31, 2025"
  };

  const monthlyData = [
    {
      month: "March 2025",
      transactions: [
        { type: "Contribution Due", date: "2025-03-15", amount: 3600.00, notes: "" },
        { type: "Payment Made", date: "2025-03-16", amount: 3400.00, notes: "Paid late" },
        { type: "Over/Short Adjustment", date: "2025-03-18", amount: -50.00, notes: "Shortfall - Lisa Jones" },
        { type: "Penalty - Late Payment", date: "2025-03-18", amount: 30.00, notes: "1 day delay" },
        { type: "Penalty - Short Payment", date: "2025-03-30", amount: 50.00, notes: "Balance not resolved" }
      ],
      subtotal: 230.00
    },
    {
      month: "April 2025",
      transactions: [
        { type: "Contribution Due", date: "2025-04-15", amount: 3650.00, notes: "" },
        { type: "Payment Made", date: "2025-04-14", amount: 3650.00, notes: "" }
      ],
      subtotal: 0.00
    }
  ];

  const totals = {
    totalContributionsDue: 10800.00,
    totalPaymentsMade: 9600.00,
    totalPenalties: 270.00,
    netOverShort: -150.00,
    totalDue: 1320.00
  };

  const handleSearch = () => {
    setHasSearched(true);
    console.log('Searching for employer statement:', searchData);
  };

  const toggleMonth = (month: string) => {
    setExpandedMonths(prev => 
      prev.includes(month) 
        ? prev.filter(m => m !== month)
        : [...prev, month]
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    console.log('Downloading PDF...');
  };

  const handleExportToExcel = () => {
    console.log('Exporting to Excel...');
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: currentTheme.colors.background }}>
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/reports")}
                className="flex items-center gap-2 hover:bg-government-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Reports
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <nav className="flex items-center space-x-2 text-sm text-gray-500">
                <span>Reports & Analytics</span>
                <span>/</span>
                <span className="font-medium" style={{ color: currentTheme.colors.text }}>
                  Employer Statement
                </span>
              </nav>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ color: currentTheme.colors.text }}>
            Employer Account Statement
          </h1>
          <p className="text-gray-600">Generate detailed account statements for employers</p>
        </div>

        {/* Search Form */}
        <Card className="mb-8 border-government-200">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="employer">Employer Name / ID</Label>
                <Input
                  id="employer"
                  placeholder="Enter employer name or ID"
                  value={searchData.employerNameId}
                  onChange={(e) => setSearchData(prev => ({ ...prev, employerNameId: e.target.value }))}
                  className="border-government-300 focus:border-government-500 focus:ring-government-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fromDate">From</Label>
                <Select value={searchData.fromDate} onValueChange={(value) => setSearchData(prev => ({ ...prev, fromDate: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="From" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2025-01">January 2025</SelectItem>
                    <SelectItem value="2025-02">February 2025</SelectItem>
                    <SelectItem value="2025-03">March 2025</SelectItem>
                    <SelectItem value="2025-04">April 2025</SelectItem>
                    <SelectItem value="2025-05">May 2025</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="toDate">To</Label>
                <Select value={searchData.toDate} onValueChange={(value) => setSearchData(prev => ({ ...prev, toDate: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="To" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2025-03">March 2025</SelectItem>
                    <SelectItem value="2025-04">April 2025</SelectItem>
                    <SelectItem value="2025-05">May 2025</SelectItem>
                    <SelectItem value="2025-06">June 2025</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleSearch} 
                className="h-10 bg-government-600 hover:bg-government-700"
              >
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Statement Results */}
        {hasSearched && (
          <div className="space-y-6">
            {/* Employer Information */}
            <Card className="border-government-200">
              <CardContent className="p-6">
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium" style={{ color: currentTheme.colors.primary }}>
                      Employer Name:
                    </span> {employerData.name}
                  </div>
                  <div>
                    <span className="font-medium">Registration #</span> {employerData.registrationNumber}
                  </div>
                  <div>
                    <span className="font-medium">Address:</span> {employerData.address}
                  </div>
                  <div>
                    <span className="font-medium">Statement Period:</span> {employerData.statementPeriod}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Breakdown */}
            <Card className="border-government-200">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {monthlyData.map((monthData) => (
                    <Collapsible 
                      key={monthData.month}
                      open={expandedMonths.includes(monthData.month)}
                      onOpenChange={() => toggleMonth(monthData.month)}
                    >
                      <CollapsibleTrigger asChild>
                        <Button 
                          variant="ghost" 
                          className="w-full justify-between p-0 h-auto hover:bg-government-50"
                        >
                          <div className="flex items-center space-x-2">
                            {expandedMonths.includes(monthData.month) ? (
                              <ChevronDown className="h-4 w-4" style={{ color: currentTheme.colors.primary }} />
                            ) : (
                              <ChevronRight className="h-4 w-4" style={{ color: currentTheme.colors.primary }} />
                            )}
                            <span className="font-medium" style={{ color: currentTheme.colors.primary }}>
                              {monthData.month}
                            </span>
                          </div>
                        </Button>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent className="mt-4">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-government-50">
                              <TableHead className="w-[200px] text-government-700">Transaction Type</TableHead>
                              <TableHead className="text-government-700">Date</TableHead>
                              <TableHead className="text-right text-government-700">Amount (ECS)</TableHead>
                              <TableHead className="text-government-700">Notes</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {monthData.transactions.map((transaction, index) => (
                              <TableRow key={index} className="hover:bg-government-50">
                                <TableCell className="font-medium">{transaction.type}</TableCell>
                                <TableCell>{transaction.date}</TableCell>
                                <TableCell className="text-right font-mono">
                                  {transaction.amount >= 0 ? '' : '-'}${Math.abs(transaction.amount).toFixed(2)}
                                </TableCell>
                                <TableCell className="text-sm text-gray-600">{transaction.notes}</TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="border-t-2 bg-government-100">
                              <TableCell className="font-bold text-government-800">Subtotal Balance</TableCell>
                              <TableCell></TableCell>
                              <TableCell className="text-right font-bold font-mono text-government-800">
                                $ {monthData.subtotal.toFixed(2)}
                              </TableCell>
                              <TableCell></TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Summary Totals */}
            <Card className="border-government-200">
              <CardContent className="p-6">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-government-50">
                      <TableHead className="text-government-700">Total Contributions Due</TableHead>
                      <TableHead className="text-government-700">Total Payments Made</TableHead>
                      <TableHead className="text-government-700">Total Penalties</TableHead>
                      <TableHead className="text-government-700">Net Over/Short</TableHead>
                      <TableHead className="text-government-700">Total Due</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="hover:bg-government-50">
                      <TableCell className="font-mono">${totals.totalContributionsDue.toFixed(2)}</TableCell>
                      <TableCell className="font-mono">{totals.totalPaymentsMade.toFixed(2)}</TableCell>
                      <TableCell className="font-mono">${totals.totalPenalties.toFixed(2)}</TableCell>
                      <TableCell className="font-mono">-${Math.abs(totals.netOverShort).toFixed(2)}</TableCell>
                      <TableCell className="font-mono font-bold">${totals.totalDue.toFixed(2)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4">
              <Button variant="outline" onClick={handlePrint} className="border-government-300 hover:bg-government-50">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" onClick={handleDownloadPDF} className="border-government-300 hover:bg-government-50">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button variant="outline" onClick={handleExportToExcel} className="border-government-300 hover:bg-government-50">
                <FileDown className="h-4 w-4 mr-2" />
                Export to Excel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployerStatement;
