/** @deprecated Legal V1 prototype — routes redirect to canonical Legal V1 screens. Pending deletion one release cycle after 2026-07. See docs/legal/LEGAL_LEGACY_RETIREMENT_AUDIT.md. */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Search, Filter, Eye, Edit, Plus, Calendar, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LegalFinalService } from '@/services/legalFinalService';
import { CourtCase } from '@/types/legalFinal';
import { CaseDetailView } from '@/components/legalFinal/CaseDetailView';

export const CaseManagement = () => {
  const [cases, setCases] = useState<CourtCase[]>([]);
  const [filteredCases, setFilteredCases] = useState<CourtCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<CourtCase | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const navigate = useNavigate();

  useEffect(() => {
    const loadCases = async () => {
      try {
        const casesData = await LegalFinalService.getCourtCases();
        setCases(casesData);
        setFilteredCases(casesData);
      } catch (error) {
        console.error('Failed to load cases:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCases();
  }, []);

  useEffect(() => {
    let filtered = cases;

    if (searchTerm) {
      filtered = filtered.filter(c => 
        c.caseID.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.employerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.contributorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.officerAssigned.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.caseStatus === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(c => c.caseType === typeFilter);
    }

    setFilteredCases(filtered);
  }, [cases, searchTerm, statusFilter, typeFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'secondary';
      case 'Filed': return 'default';
      case 'Pending Hearing': return 'warning';
      case 'In Court': return 'info';
      case 'Judgment Delivered': return 'success';
      case 'Enforcement Ongoing': return 'destructive';
      case 'Closed': return 'outline';
      case 'Settled': return 'success';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading cases...</p>
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
            <h1 className="text-3xl font-bold">Case Management</h1>
            <p className="text-muted-foreground">View and manage all legal cases</p>
          </div>
        </div>
        <Button onClick={() => navigate('/legal-final/new-case')}>
          <Plus className="h-4 w-4 mr-2" />
          New Case
        </Button>
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
                  placeholder="Search cases..."
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
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Filed">Filed</SelectItem>
                  <SelectItem value="Pending Hearing">Pending Hearing</SelectItem>
                  <SelectItem value="In Court">In Court</SelectItem>
                  <SelectItem value="Judgment Delivered">Judgment Delivered</SelectItem>
                  <SelectItem value="Enforcement Ongoing">Enforcement Ongoing</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                  <SelectItem value="Settled">Settled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Case Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Employer Arrears">Employer Arrears</SelectItem>
                  <SelectItem value="Contributor Dispute">Contributor Dispute</SelectItem>
                  <SelectItem value="Fraud">Fraud</SelectItem>
                  <SelectItem value="Overpayment">Overpayment</SelectItem>
                  <SelectItem value="Appeal">Appeal</SelectItem>
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

      {/* Cases Table */}
      <Card>
        <CardHeader>
          <CardTitle>Legal Cases ({filteredCases.length})</CardTitle>
          <CardDescription>
            {filteredCases.length === cases.length 
              ? `Showing all ${cases.length} cases`
              : `Showing ${filteredCases.length} of ${cases.length} cases`}
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
                  <TableHead>Officer</TableHead>
                  <TableHead>Date Opened</TableHead>
                  <TableHead>Next Hearing</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCases.map((courtCase) => (
                  <TableRow key={courtCase.caseID}>
                    <TableCell className="font-medium">{courtCase.caseID}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{courtCase.caseType}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(courtCase.caseStatus) as any}>
                        {courtCase.caseStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {courtCase.employerName || courtCase.contributorName || 'N/A'}
                    </TableCell>
                    <TableCell>{courtCase.officerAssigned}</TableCell>
                    <TableCell>{courtCase.dateOpened}</TableCell>
                    <TableCell>
                      {courtCase.nextHearingDate ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {courtCase.nextHearingDate}
                        </div>
                      ) : (
                        'Not scheduled'
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setSelectedCase(courtCase)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Case Details - {courtCase.caseID}</DialogTitle>
                              <DialogDescription>
                                Complete case information and management
                              </DialogDescription>
                            </DialogHeader>
                            {selectedCase && (
                              <CaseDetailView 
                                case={selectedCase}
                                onClose={() => setSelectedCase(null)}
                              />
                            )}
                          </DialogContent>
                        </Dialog>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => navigate(`/legal-final/cases/${courtCase.caseID}/edit`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
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