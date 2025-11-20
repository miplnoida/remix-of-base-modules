import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Plus, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export default function MyUpcomingAudits() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAudits, setSelectedAudits] = useState<string[]>([]);

  const upcomingAudits = [
    {
      id: 'AUD-001',
      employer: 'Paradise Beach Hotel Ltd',
      employerId: 'EMP-1234',
      zone: 'Zone 1 - Basseterre',
      reason: 'Arrears > EC$ 75,000',
      riskBand: 'High',
      riskScore: 85,
      linkedCase: 'CASE-2024-0123',
      status: 'Not Planned',
      eligibleWeeks: ['Week of Jul 1', 'Week of Jul 8'],
      lastAudit: '2022-03-15',
      arrears: 78500
    },
    {
      id: 'AUD-002',
      employer: 'Island Construction Co',
      employerId: 'EMP-2341',
      zone: 'Zone 2 - St. Peters',
      reason: 'Not audited in 24 months',
      riskBand: 'High',
      riskScore: 78,
      linkedCase: 'CASE-2024-0156',
      status: 'Not Planned',
      eligibleWeeks: ['Week of Jul 1', 'Week of Jul 8', 'Week of Jul 15'],
      lastAudit: '2022-06-20',
      arrears: 45000
    },
    {
      id: 'AUD-003',
      employer: 'Caribbean Retail Group',
      employerId: 'EMP-3456',
      zone: 'Zone 1 - Basseterre',
      reason: 'Risk-weighted selection',
      riskBand: 'Medium',
      riskScore: 72,
      linkedCase: null,
      status: 'Planned in Weekly Plan',
      eligibleWeeks: ['Week of Jul 8'],
      lastAudit: '2023-01-10',
      arrears: 32000
    },
    {
      id: 'AUD-004',
      employer: 'Tropical Foods Ltd',
      employerId: 'EMP-4567',
      zone: 'Zone 3 - Nevis',
      reason: 'Pure random sample',
      riskBand: 'Low',
      riskScore: 35,
      linkedCase: null,
      status: 'Not Planned',
      eligibleWeeks: ['Week of Jul 15', 'Week of Jul 22'],
      lastAudit: '2023-09-05',
      arrears: 0
    },
    {
      id: 'AUD-005',
      employer: 'Sunset Restaurant & Bar',
      employerId: 'EMP-5678',
      zone: 'Zone 3 - Nevis',
      reason: 'Arrangement defaulted',
      riskBand: 'High',
      riskScore: 82,
      linkedCase: 'CASE-2024-0178',
      status: 'Not Planned',
      eligibleWeeks: ['Week of Jul 1'],
      lastAudit: '2023-02-18',
      arrears: 56000
    }
  ];

  const getRiskBadgeColor = (band: string) => {
    switch (band) {
      case 'High': return 'bg-red-100 text-red-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Not Planned': return 'bg-orange-100 text-orange-800';
      case 'Planned in Weekly Plan': return 'bg-blue-100 text-blue-800';
      case 'Completed': return 'bg-green-100 text-green-800';
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

  const handleToggleAudit = (id: string) => {
    setSelectedAudits(prev =>
      prev.includes(id) ? prev.filter(aid => aid !== id) : [...prev, id]
    );
  };

  const handleAddToWeeklyPlan = () => {
    if (selectedAudits.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one audit to add to weekly plan.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Added to Weekly Plan",
      description: `${selectedAudits.length} audit(s) added to your draft weekly plan.`,
    });
    setSelectedAudits([]);
  };

  const filteredAudits = upcomingAudits.filter(audit =>
    audit.employer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    audit.employerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    audit.reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="My Upcoming Audits"
        subtitle="Your potential audit universe for the coming month"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance' },
          { label: 'My Audits', href: '/compliance/my-audits' },
          { label: 'Upcoming Month' }
        ]}
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Assigned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{upcomingAudits.length}</div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Not Planned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {upcomingAudits.filter(a => a.status === 'Not Planned').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Need scheduling</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Planned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {upcomingAudits.filter(a => a.status === 'Planned in Weekly Plan').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">In weekly plans</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">High Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {upcomingAudits.filter(a => a.riskBand === 'High').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Priority audits</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by employer, ID, or reason..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="not-planned">Not Planned</SelectItem>
                <SelectItem value="planned">Planned in Weekly Plan</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
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
            <Button onClick={handleAddToWeeklyPlan} disabled={selectedAudits.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              Add to Weekly Plan ({selectedAudits.length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audits Table */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Audits for July 2024</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Select</TableHead>
                <TableHead>Employer</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Linked Case</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Eligible Weeks</TableHead>
                <TableHead>Arrears</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAudits.map((audit) => (
                <TableRow key={audit.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedAudits.includes(audit.id)}
                      onCheckedChange={() => handleToggleAudit(audit.id)}
                      disabled={audit.status === 'Completed'}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{audit.employer}</div>
                    <div className="text-xs text-muted-foreground">{audit.employerId}</div>
                  </TableCell>
                  <TableCell>{audit.zone}</TableCell>
                  <TableCell className="max-w-xs">
                    <span className="text-sm">{audit.reason}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge className={getRiskBadgeColor(audit.riskBand)}>
                        {audit.riskBand}
                      </Badge>
                      <span className="text-xs text-muted-foreground">Score: {audit.riskScore}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {audit.linkedCase ? (
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto"
                        onClick={() => navigate(`/compliance/cases/${audit.linkedCase}`)}
                      >
                        {audit.linkedCase}
                      </Button>
                    ) : (
                      <span className="text-muted-foreground text-sm">None</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusBadgeColor(audit.status)}>
                      {audit.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {audit.eligibleWeeks.map((week, idx) => (
                        <span key={idx} className="text-xs text-muted-foreground">{week}</span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {audit.arrears > 0 ? (
                      <span className="font-medium text-destructive">{formatCurrency(audit.arrears)}</span>
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    )}
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
