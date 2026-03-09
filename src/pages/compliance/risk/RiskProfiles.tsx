import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Target, Search, Filter, Eye, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

const mockProfiles = [
  { regNo: 'R-11023', employer: 'KN Shipping Services', score: 92, band: 'Critical', trend: 'up', arrears: '$210,000', violations: 8, missedFilings: 12, legalHistory: 'Active', paymentBehavior: 'Poor' },
  { regNo: 'R-10567', employer: 'Island Construction Ltd', score: 85, band: 'Critical', trend: 'up', arrears: '$128,500', violations: 5, missedFilings: 8, legalHistory: 'Previous', paymentBehavior: 'Poor' },
  { regNo: 'R-10456', employer: 'Palm View Resort', score: 68, band: 'High', trend: 'stable', arrears: '$78,300', violations: 4, missedFilings: 5, legalHistory: 'None', paymentBehavior: 'Irregular' },
  { regNo: 'R-10234', employer: 'Caribbean Hotel Group', score: 55, band: 'High', trend: 'down', arrears: '$45,200', violations: 3, missedFilings: 3, legalHistory: 'None', paymentBehavior: 'Irregular' },
  { regNo: 'R-11245', employer: 'Tropical Traders Inc', score: 42, band: 'Medium', trend: 'up', arrears: '$18,400', violations: 2, missedFilings: 2, legalHistory: 'None', paymentBehavior: 'Fair' },
  { regNo: 'R-10789', employer: 'Sandy Point Bakery', score: 35, band: 'Medium', trend: 'down', arrears: '$12,800', violations: 2, missedFilings: 1, legalHistory: 'None', paymentBehavior: 'Fair' },
  { regNo: 'R-10892', employer: 'Nevis Traders Ltd', score: 18, band: 'Low', trend: 'stable', arrears: '$3,200', violations: 1, missedFilings: 0, legalHistory: 'None', paymentBehavior: 'Good' },
  { regNo: 'R-11456', employer: 'Basseterre Pharmacy', score: 8, band: 'Low', trend: 'stable', arrears: '$0', violations: 0, missedFilings: 0, legalHistory: 'None', paymentBehavior: 'Excellent' },
];

const bandConfig: Record<string, { color: string; bg: string }> = {
  Low: { color: 'text-success', bg: 'bg-success/10 border-success/20' },
  Medium: { color: 'text-warning', bg: 'bg-warning/10 border-warning/20' },
  High: { color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/20' },
  Critical: { color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20' },
};

const TrendIcon = ({ trend }: { trend: string }) => {
  if (trend === 'up') return <TrendingUp className="h-3.5 w-3.5 text-destructive" />;
  if (trend === 'down') return <TrendingDown className="h-3.5 w-3.5 text-success" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
};

const RiskProfiles = () => {
  const [bandFilter, setBandFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = mockProfiles.filter(p =>
    (bandFilter === 'All' || p.band === bandFilter) &&
    (searchTerm === '' || p.employer.toLowerCase().includes(searchTerm.toLowerCase()) || p.regNo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const bands = [
    { label: 'Low', count: mockProfiles.filter(p => p.band === 'Low').length },
    { label: 'Medium', count: mockProfiles.filter(p => p.band === 'Medium').length },
    { label: 'High', count: mockProfiles.filter(p => p.band === 'High').length },
    { label: 'Critical', count: mockProfiles.filter(p => p.band === 'Critical').length },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Target className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-semibold text-foreground">Employer Risk Profiles</h1>
        </div>
        <p className="text-muted-foreground">Risk scoring and band classification for all registered employers</p>
      </div>

      {/* Band Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {bands.map((band) => (
          <Card key={band.label} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setBandFilter(band.label === bandFilter ? 'All' : band.label)}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className={`${bandConfig[band.label].bg} ${bandConfig[band.label].color}`}>{band.label}</Badge>
                <span className="text-2xl font-bold text-foreground">{band.count}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">employers</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search and Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by employer name or reg no..." className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <Select value={bandFilter} onValueChange={setBandFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Risk Band" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Bands</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Employer</th>
                  <th className="text-center py-2 px-3 text-muted-foreground font-medium">Score</th>
                  <th className="text-center py-2 px-3 text-muted-foreground font-medium">Band</th>
                  <th className="text-center py-2 px-3 text-muted-foreground font-medium">Trend</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Arrears</th>
                  <th className="text-center py-2 px-3 text-muted-foreground font-medium">Violations</th>
                  <th className="text-center py-2 px-3 text-muted-foreground font-medium">Missed Filings</th>
                  <th className="text-center py-2 px-3 text-muted-foreground font-medium">Payment</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.regNo} className="border-b last:border-0 border-border hover:bg-muted/50">
                    <td className="py-2 px-3">
                      <p className="font-medium text-foreground">{p.employer}</p>
                      <p className="text-xs text-muted-foreground font-mono">{p.regNo}</p>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-bold text-foreground">{p.score}</span>
                        <Progress value={p.score} className="h-1.5 w-16" />
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <Badge variant="outline" className={`${bandConfig[p.band].bg} ${bandConfig[p.band].color} text-[10px]`}>{p.band}</Badge>
                    </td>
                    <td className="py-2 px-3 text-center"><TrendIcon trend={p.trend} /></td>
                    <td className="py-2 px-3 text-right font-medium text-foreground">{p.arrears}</td>
                    <td className="py-2 px-3 text-center">{p.violations}</td>
                    <td className="py-2 px-3 text-center">{p.missedFilings}</td>
                    <td className="py-2 px-3 text-center">
                      <Badge variant={p.paymentBehavior === 'Excellent' || p.paymentBehavior === 'Good' ? 'default' : p.paymentBehavior === 'Fair' ? 'secondary' : 'destructive'} className="text-[10px]">
                        {p.paymentBehavior}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-right"><Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RiskProfiles;
