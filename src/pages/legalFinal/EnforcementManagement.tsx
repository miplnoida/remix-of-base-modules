import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Search, Filter, Eye, DollarSign, TrendingUp, Users, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LegalFinalService } from '@/services/legalFinalService';
import { CourtCase, Enforcement } from '@/types/legalFinal';

interface EnforcementWithCase extends Enforcement {
  caseDetails?: CourtCase;
}

export const EnforcementManagement = () => {
  const [enforcements, setEnforcements] = useState<EnforcementWithCase[]>([]);
  const [filteredEnforcements, setFilteredEnforcements] = useState<EnforcementWithCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const navigate = useNavigate();

  useEffect(() => {
    const loadEnforcements = async () => {
      try {
        const cases = await LegalFinalService.getCourtCases();
        const allEnforcements: EnforcementWithCase[] = [];
        
        for (const courtCase of cases) {
          const caseEnforcements = await LegalFinalService.getCaseEnforcements(courtCase.caseID);
          allEnforcements.push(...caseEnforcements.map(e => ({ ...e, caseDetails: courtCase })));
        }
        
        setEnforcements(allEnforcements);
        setFilteredEnforcements(allEnforcements);
      } catch (error) {
        console.error('Failed to load enforcements:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEnforcements();
  }, []);

  useEffect(() => {
    let filtered = enforcements;

    if (searchTerm) {
      filtered = filtered.filter(e => 
        e.caseID.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.officerResponsible.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.caseDetails?.employerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.caseDetails?.contributorName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(e => e.enforcementStatus === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(e => e.enforcementType === typeFilter);
    }

    setFilteredEnforcements(filtered);
  }, [enforcements, searchTerm, statusFilter, typeFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'success';
      case 'Failed': return 'destructive';
      case 'Ongoing': return 'warning';
      default: return 'default';
    }
  };

  const getTotalStats = () => {
    const totalOrdered = enforcements.reduce((sum, e) => sum + e.amountOrdered, 0);
    const totalCollected = enforcements.reduce((sum, e) => sum + e.amountCollected, 0);
    const collectionRate = totalOrdered > 0 ? (totalCollected / totalOrdered) * 100 : 0;
    const activeEnforcements = enforcements.filter(e => e.enforcementStatus === 'Ongoing').length;

    return { totalOrdered, totalCollected, collectionRate, activeEnforcements };
  };

  const stats = getTotalStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading enforcement actions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/legal-final')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Enforcement Management</h1>
            <p className="text-muted-foreground">Monitor and manage all enforcement actions</p>
          </div>
        </div>
        <Button onClick={() => navigate('/legal-final/cases')}>
          <Eye className="h-4 w-4 mr-2" />
          View Cases
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ordered</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalOrdered.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Court ordered amounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalCollected.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Successfully collected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.collectionRate.toFixed(1)}%</div>
            <Progress value={stats.collectionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Actions</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeEnforcements}</div>
            <p className="text-xs text-muted-foreground">Ongoing enforcement</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search enforcements..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Ongoing">Ongoing</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Garnishment">Garnishment</SelectItem>
                  <SelectItem value="Seizure of Assets">Seizure of Assets</SelectItem>
                  <SelectItem value="Payment Plan">Payment Plan</SelectItem>
                  <SelectItem value="Voluntary Settlement">Voluntary Settlement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Actions</label>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setTypeFilter('all');
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enforcement Types Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        {['Garnishment', 'Seizure of Assets', 'Payment Plan', 'Voluntary Settlement'].map((type) => {
          const typeEnforcements = enforcements.filter(e => e.enforcementType === type);
          const typeCollected = typeEnforcements.reduce((sum, e) => sum + e.amountCollected, 0);
          const typeOrdered = typeEnforcements.reduce((sum, e) => sum + e.amountOrdered, 0);
          const typeRate = typeOrdered > 0 ? (typeCollected / typeOrdered) * 100 : 0;

          return (
            <Card key={type}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{type}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-lg font-bold">{typeEnforcements.length} actions</div>
                  <div className="text-sm text-muted-foreground">
                    ${typeCollected.toLocaleString()} / ${typeOrdered.toLocaleString()}
                  </div>
                  <Progress value={typeRate} className="h-2" />
                  <div className="text-xs text-muted-foreground">{typeRate.toFixed(1)}% collected</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Enforcements Table */}
      <Card>
        <CardHeader>
          <CardTitle>Enforcement Actions ({filteredEnforcements.length})</CardTitle>
          <CardDescription>
            {filteredEnforcements.length === enforcements.length 
              ? `Showing all ${enforcements.length} enforcement actions`
              : `Showing ${filteredEnforcements.length} of ${enforcements.length} enforcement actions`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Party</TableHead>
                  <TableHead>Amount Ordered</TableHead>
                  <TableHead>Amount Collected</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Officer</TableHead>
                  <TableHead>Date Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEnforcements.map((enforcement) => (
                  <TableRow key={enforcement.enforcementID}>
                    <TableCell className="font-medium">{enforcement.caseID}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{enforcement.enforcementType}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(enforcement.enforcementStatus) as any}>
                        {enforcement.enforcementStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {enforcement.caseDetails?.employerName || enforcement.caseDetails?.contributorName || 'N/A'}
                    </TableCell>
                    <TableCell>${enforcement.amountOrdered.toLocaleString()}</TableCell>
                    <TableCell>${enforcement.amountCollected.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16">
                          <Progress 
                            value={(enforcement.amountCollected / enforcement.amountOrdered) * 100}
                            className="h-2"
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {((enforcement.amountCollected / enforcement.amountOrdered) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{enforcement.officerResponsible}</TableCell>
                    <TableCell>{enforcement.dateCreated}</TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigate(`/legal-final/cases/${enforcement.caseID}/enforcement`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};