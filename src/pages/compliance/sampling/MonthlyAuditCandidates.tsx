import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, XCircle, UserPlus, Download, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function MonthlyAuditCandidates() {
  const { toast } = useToast();
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const candidates = [
    {
      id: 'EMP-1234',
      name: 'Paradise Beach Hotel Ltd',
      zone: 'Zone 1 - Basseterre',
      riskScore: 85,
      riskBand: 'High',
      selectionType: 'Mandatory',
      reason: 'Arrears > EC$ 75,000',
      lastAudit: '2022-03-15',
      arrears: 78500,
      c3Behavior: 'Late 5 of 6 months',
      included: true
    },
    {
      id: 'EMP-2341',
      name: 'Island Construction Co',
      zone: 'Zone 2 - St. Peters',
      riskScore: 78,
      riskBand: 'High',
      selectionType: 'Mandatory',
      reason: 'Not audited in 24 months',
      lastAudit: '2022-06-20',
      arrears: 45000,
      c3Behavior: 'Late 3 of 6 months',
      included: true
    },
    {
      id: 'EMP-3456',
      name: 'Caribbean Retail Group',
      zone: 'Zone 1 - Basseterre',
      riskScore: 72,
      riskBand: 'Medium',
      selectionType: 'Risk',
      reason: 'Risk-weighted selection',
      lastAudit: '2023-01-10',
      arrears: 32000,
      c3Behavior: 'Late 2 of 6 months',
      included: true
    },
    {
      id: 'EMP-4567',
      name: 'Tropical Foods Ltd',
      zone: 'Zone 3 - Nevis',
      riskScore: 35,
      riskBand: 'Low',
      selectionType: 'Random',
      reason: 'Pure random sample',
      lastAudit: '2023-09-05',
      arrears: 0,
      c3Behavior: 'On-time all months',
      included: true
    },
    {
      id: 'EMP-5678',
      name: 'Sunset Restaurant & Bar',
      zone: 'Zone 3 - Nevis',
      riskScore: 82,
      riskBand: 'High',
      selectionType: 'Mandatory',
      reason: 'Arrangement defaulted',
      lastAudit: '2023-02-18',
      arrears: 56000,
      c3Behavior: 'Late 4 of 6 months',
      included: true
    },
  ];

  const handleToggleCandidate = (id: string) => {
    setSelectedCandidates(prev =>
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  const handleConfirmList = () => {
    toast({
      title: "Monthly Audit List Confirmed",
      description: `${candidates.filter(c => c.included).length} employers confirmed for next month's audits.`,
    });
  };

  const getRiskBadgeColor = (band: string) => {
    switch (band) {
      case 'High': return 'bg-red-100 text-red-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSelectionTypeBadge = (type: string) => {
    switch (type) {
      case 'Mandatory': return 'bg-orange-100 text-orange-800';
      case 'Risk': return 'bg-blue-100 text-blue-800';
      case 'Random': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'XCD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const filteredCandidates = candidates.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Monthly Audit Candidates"
        subtitle="Supervisor planning screen for next month's audit selections"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance' },
          { label: 'Audit Planning', href: '/compliance/audit-planning' },
          { label: 'Monthly Candidates' }
        ]}
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Selected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{candidates.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Mandatory</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {candidates.filter(c => c.selectionType === 'Mandatory').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Risk-Based</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {candidates.filter(c => c.selectionType === 'Risk').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Random</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {candidates.filter(c => c.selectionType === 'Random').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Included</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {candidates.filter(c => c.included).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by employer name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Zone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Zones</SelectItem>
                <SelectItem value="zone1">Zone 1 - Basseterre</SelectItem>
                <SelectItem value="zone2">Zone 2 - St. Peters</SelectItem>
                <SelectItem value="zone3">Zone 3 - Nevis</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Risk Band" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk Bands</SelectItem>
                <SelectItem value="high">High Risk</SelectItem>
                <SelectItem value="medium">Medium Risk</SelectItem>
                <SelectItem value="low">Low Risk</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Selection Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="mandatory">Mandatory</SelectItem>
                <SelectItem value="risk">Risk-Based</SelectItem>
                <SelectItem value="random">Random</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Candidates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Candidates for July 2024</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Include</TableHead>
                <TableHead>Employer</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Last Audit</TableHead>
                <TableHead>Arrears</TableHead>
                <TableHead>C3 Behavior</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCandidates.map((candidate) => (
                <TableRow key={candidate.id}>
                  <TableCell>
                    <Checkbox
                      checked={candidate.included}
                      onCheckedChange={() => handleToggleCandidate(candidate.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{candidate.name}</div>
                    <div className="text-xs text-muted-foreground">{candidate.id}</div>
                  </TableCell>
                  <TableCell>{candidate.zone}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge className={getRiskBadgeColor(candidate.riskBand)}>
                        {candidate.riskBand}
                      </Badge>
                      <span className="text-xs text-muted-foreground">Score: {candidate.riskScore}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getSelectionTypeBadge(candidate.selectionType)}>
                      {candidate.selectionType}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <span className="text-sm">{candidate.reason}</span>
                  </TableCell>
                  <TableCell>{candidate.lastAudit}</TableCell>
                  <TableCell>
                    {candidate.arrears > 0 ? (
                      <span className="font-medium text-destructive">{formatCurrency(candidate.arrears)}</span>
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{candidate.c3Behavior}</span>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost">View</Button>
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
