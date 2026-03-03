import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNewBenefitAuth } from '@/contexts/NewBenefitAuthContext';
import { newBenefitService } from '@/services/newBenefitService';
import { Claim } from '@/types/newBenefit';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Filter,
  Eye,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  FileText,
  Calendar
} from 'lucide-react';

export const MyClaims: React.FC = () => {
  const { currentUser } = useNewBenefitAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [filteredClaims, setFilteredClaims] = useState<Claim[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser?.ssn) {
      loadClaims();
    }
  }, [currentUser]);

  useEffect(() => {
    filterClaims();
  }, [claims, searchTerm, statusFilter]);

  const loadClaims = async () => {
    if (!currentUser?.ssn) return;
    
    try {
      const claimsData = await newBenefitService.getClaimsBySSN(currentUser.ssn);
      setClaims(claimsData);
    } catch (error) {
      console.error('Error loading claims:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterClaims = () => {
    let filtered = claims;

    if (searchTerm) {
      filtered = filtered.filter(claim => 
        claim.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        claim.benefitType.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(claim => claim.status === statusFilter);
    }

    setFilteredClaims(filtered);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'PAID':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'SUBMITTED':
      case 'INTAKE_REVIEW':
      case 'ELIGIBILITY_CHECK':
      case 'EVIDENCE_REVIEW':
        return <Clock className="h-4 w-4 text-warning" />;
      case 'DENIED':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'PENDING_INFO':
        return <AlertCircle className="h-4 w-4 text-warning" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'PAID':
        return 'default';
      case 'SUBMITTED':
      case 'INTAKE_REVIEW':
      case 'ELIGIBILITY_CHECK':
      case 'EVIDENCE_REVIEW':
        return 'secondary';
      case 'DENIED':
        return 'destructive';
      case 'PENDING_INFO':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const formatBenefitType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const statusCounts = {
    ALL: claims.length,
    SUBMITTED: claims.filter(c => c.status === 'SUBMITTED').length,
    UNDER_REVIEW: claims.filter(c => ['INTAKE_REVIEW', 'ELIGIBILITY_CHECK', 'EVIDENCE_REVIEW'].includes(c.status)).length,
    APPROVED: claims.filter(c => c.status === 'APPROVED').length,
    DENIED: claims.filter(c => c.status === 'DENIED').length,
    PENDING_INFO: claims.filter(c => c.status === 'PENDING_INFO').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading claims...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Claims</h1>
          <p className="text-muted-foreground">Track your benefit applications and claims</p>
        </div>
        <Button asChild>
          <Link to="/newbenefit/apply">
            <FileText className="h-4 w-4 mr-2" />
            New Application
          </Link>
        </Button>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by claim ID or benefit type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-md bg-background"
              >
                <option value="ALL">All Status ({statusCounts.ALL})</option>
                <option value="SUBMITTED">Submitted ({statusCounts.SUBMITTED})</option>
                <option value="UNDER_REVIEW">Under Review ({statusCounts.UNDER_REVIEW})</option>
                <option value="APPROVED">Approved ({statusCounts.APPROVED})</option>
                <option value="DENIED">Denied ({statusCounts.DENIED})</option>
                <option value="PENDING_INFO">Pending Info ({statusCounts.PENDING_INFO})</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Claims Tabs */}
      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="timeline">Timeline View</TabsTrigger>
        </TabsList>
        
        <TabsContent value="list" className="space-y-4">
          {filteredClaims.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== 'ALL' ? 'No claims match your filters' : 'No claims submitted yet'}
                </p>
                <Button asChild className="mt-4">
                  <Link to="/newbenefit/apply">Submit Your First Claim</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredClaims.map((claim) => (
                <Card key={claim.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          {getStatusIcon(claim.status)}
                          <h3 className="font-semibold text-lg">{claim.id}</h3>
                          <Badge variant={getStatusBadgeVariant(claim.status)}>
                            {claim.status.replace(/_/g, ' ')}
                          </Badge>
                          {claim.priority !== 'NORMAL' && (
                            <Badge variant="outline" className="text-xs">
                              {claim.priority}
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="font-medium text-muted-foreground">Benefit Type</p>
                            <p>{formatBenefitType(claim.benefitType)}</p>
                          </div>
                          <div>
                            <p className="font-medium text-muted-foreground">Submitted</p>
                            <p className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {new Date(claim.submissionDate).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <p className="font-medium text-muted-foreground">Last Updated</p>
                            <p>{new Date(claim.lastUpdated).toLocaleDateString()}</p>
                          </div>
                        </div>
                        {claim.assignedTo && (
                          <div className="mt-2">
                            <p className="text-sm text-muted-foreground">
                              Assigned to: <span className="font-medium">{claim.assignedTo}</span>
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/newbenefit/claim/${claim.id}`}>
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Claims Timeline</CardTitle>
              <CardDescription>Chronological view of your claims</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {filteredClaims.map((claim, index) => (
                  <div key={claim.id} className="flex items-start space-x-4">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 bg-primary rounded-full"></div>
                      {index < filteredClaims.length - 1 && (
                        <div className="w-0.5 h-16 bg-border mt-2"></div>
                      )}
                    </div>
                    <div className="flex-1 pb-8">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium">{claim.id}</h4>
                        <Badge variant={getStatusBadgeVariant(claim.status)} className="text-xs">
                          {claim.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {formatBenefitType(claim.benefitType)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Submitted: {new Date(claim.submissionDate).toLocaleDateString()}
                      </p>
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