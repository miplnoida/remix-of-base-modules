import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, DollarSign, Receipt, Users, Download, Calendar } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PaymentAnalytics: React.FC = () => {
  const [dateRange, setDateRange] = useState({
    from: '2024-12-01',
    to: '2024-12-31'
  });
  
  const [selectedCashier, setSelectedCashier] = useState('all');
  const [selectedPaymentType, setSelectedPaymentType] = useState('all');

  // Mock analytics data
  const dailyCollections = [
    { date: '2024-12-20', c3: 45000, misc: 8500, total: 53500 },
    { date: '2024-12-21', c3: 52000, misc: 12000, total: 64000 },
    { date: '2024-12-22', c3: 38000, misc: 9500, total: 47500 },
    { date: '2024-12-23', c3: 61000, misc: 15000, total: 76000 },
    { date: '2024-12-24', c3: 29000, misc: 6500, total: 35500 }
  ];

  const paymentModeData = [
    { name: 'Cash', value: 180000, color: '#10b981' },
    { name: 'Check', value: 95000, color: '#3b82f6' },
    { name: 'Card', value: 45000, color: '#f59e0b' },
    { name: 'Online', value: 25000, color: '#8b5cf6' }
  ];

  const cashierPerformance = [
    { cashier: 'Sarah Johnson', transactions: 145, amount: 87500, batches: 5 },
    { cashier: 'Michael Brown', transactions: 132, amount: 79200, batches: 5 },
    { cashier: 'Lisa Williams', transactions: 98, amount: 52300, batches: 4 },
    { cashier: 'David Davis', transactions: 87, amount: 41800, batches: 3 }
  ];

  const contributionTrends = [
    { month: 'Aug', employer: 420000, employee: 380000 },
    { month: 'Sep', employer: 445000, employee: 395000 },
    { month: 'Oct', employer: 438000, employee: 388000 },
    { month: 'Nov', employer: 452000, employee: 402000 },
    { month: 'Dec', employer: 465000, employee: 415000 }
  ];

  const topContributors = [
    { name: 'Government of SKN', amount: 125000, transactions: 1 },
    { name: 'Marriott Resort', amount: 85000, transactions: 1 },
    { name: 'Royal Bank of Canada', amount: 72000, transactions: 1 },
    { name: 'Four Seasons Resort', amount: 68000, transactions: 1 },
    { name: 'St. Kitts Biomedical', amount: 54000, transactions: 1 }
  ];

  const summaryStats = {
    totalCollections: 276500,
    totalTransactions: 462,
    avgTransactionAmount: 598.92,
    totalBatches: 17,
    c3Collections: 225000,
    miscCollections: 51500
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Payment Analytics</h1>
          <p className="text-muted-foreground">Comprehensive payment collection insights and trends</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Report
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Date From</Label>
              <Input 
                type="date" 
                value={dateRange.from}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              />
            </div>
            <div>
              <Label>Date To</Label>
              <Input 
                type="date" 
                value={dateRange.to}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              />
            </div>
            <div>
              <Label>Cashier</Label>
              <Select value={selectedCashier} onValueChange={setSelectedCashier}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cashiers</SelectItem>
                  <SelectItem value="sarah">Sarah Johnson</SelectItem>
                  <SelectItem value="michael">Michael Brown</SelectItem>
                  <SelectItem value="lisa">Lisa Williams</SelectItem>
                  <SelectItem value="david">David Davis</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment Type</Label>
              <Select value={selectedPaymentType} onValueChange={setSelectedPaymentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="c3">C3 Contributions</SelectItem>
                  <SelectItem value="misc">Miscellaneous</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold">EC$ {summaryStats.totalCollections.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Collections</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Receipt className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold">{summaryStats.totalTransactions}</div>
                <div className="text-sm text-muted-foreground">Total Transactions</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold">EC$ {summaryStats.avgTransactionAmount.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Avg Transaction</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold">{summaryStats.totalBatches}</div>
                <div className="text-sm text-muted-foreground">Total Batches</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="cashiers">Cashier Performance</TabsTrigger>
          <TabsTrigger value="contributors">Top Contributors</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Daily Collections</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyCollections}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="c3" fill="#3b82f6" name="C3 Contributions" />
                    <Bar dataKey="misc" fill="#10b981" name="Miscellaneous" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Mode Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={paymentModeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {paymentModeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Collection Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="font-medium">C3 Contributions</span>
                    <span className="text-lg font-bold">EC$ {summaryStats.c3Collections.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="font-medium">Miscellaneous Payments</span>
                    <span className="text-lg font-bold">EC$ {summaryStats.miscCollections.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border-2">
                    <span className="font-medium">Total Collections</span>
                    <span className="text-xl font-bold">EC$ {summaryStats.totalCollections.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Mode Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {paymentModeData.map((mode) => (
                    <div key={mode.name} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: mode.color }}
                        ></div>
                        <span>{mode.name}</span>
                      </div>
                      <span className="font-semibold">EC$ {mode.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Contribution Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={contributionTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="employer" stroke="#3b82f6" name="Employer Contributions" />
                  <Line type="monotone" dataKey="employee" stroke="#10b981" name="Employee Contributions" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cashiers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cashier Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cashierPerformance.map((cashier, index) => (
                  <div key={cashier.cashier} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{cashier.cashier}</div>
                        <div className="text-sm text-muted-foreground">
                          {cashier.transactions} transactions • {cashier.batches} batches
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">EC$ {cashier.amount.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">
                        Avg: EC$ {(cashier.amount / cashier.transactions).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contributors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Contributors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topContributors.map((contributor, index) => (
                  <div key={contributor.name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{contributor.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {contributor.transactions} transaction{contributor.transactions > 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">EC$ {contributor.amount.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PaymentAnalytics;