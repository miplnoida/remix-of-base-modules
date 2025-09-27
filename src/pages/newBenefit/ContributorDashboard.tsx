import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNewBenefitAuth } from '@/contexts/NewBenefitAuthContext';
import { newBenefitService } from '@/services/newBenefitService';
import { Person, Claim } from '@/types/newBenefit';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  CreditCard, 
  BarChart3, 
  Mail, 
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';

export const ContributorDashboard: React.FC = () => {
  const { currentUser } = useNewBenefitAuth();
  const [profile, setProfile] = useState<Person | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [contributionSummary, setContributionSummary] = useState({
    totalWeeks: 0,
    paidWeeks: 0,
    creditedWeeks: 0,
    totalContributions: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser?.ssn) {
      loadDashboardData();
    }
  }, [currentUser]);

  const loadDashboardData = async () => {
    if (!currentUser?.ssn) return;
    
    try {
      const [profileData, claimsData, contributionsData] = await Promise.all([
        newBenefitService.getContributorProfile(currentUser.ssn),
        newBenefitService.getClaimsBySSN(currentUser.ssn),
        newBenefitService.getContributionSummary(currentUser.ssn)
      ]);

      setProfile(profileData);
      setClaims(claimsData);
      setContributionSummary(contributionsData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'PAID':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'SUBMITTED':
      case 'UNDER_REVIEW':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'DENIED':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'PAID':
        return 'default';
      case 'SUBMITTED':
      case 'UNDER_REVIEW':
        return 'secondary';
      case 'DENIED':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {profile?.firstName} {profile?.lastName}</h1>
          <p className="text-muted-foreground">SSN: {currentUser?.ssn}</p>
        </div>
        <Badge variant="outline" className="text-sm">
          Contributor Portal
        </Badge>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <Link to="/newbenefit/apply" className="flex items-center space-x-3 text-blue-600 hover:text-blue-800">
              <FileText className="h-8 w-8" />
              <div>
                <p className="font-medium">Apply for Benefits</p>
                <p className="text-sm text-muted-foreground">Submit new claim</p>
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <Link to="/newbenefit/my-claims" className="flex items-center space-x-3 text-green-600 hover:text-green-800">
              <CreditCard className="h-8 w-8" />
              <div>
                <p className="font-medium">My Claims</p>
                <p className="text-sm text-muted-foreground">{claims.length} total claims</p>
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <Link to="/newbenefit/reports" className="flex items-center space-x-3 text-purple-600 hover:text-purple-800">
              <BarChart3 className="h-8 w-8" />
              <div>
                <p className="font-medium">Reports</p>
                <p className="text-sm text-muted-foreground">View statements</p>
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <Link to="/newbenefit/inbox" className="flex items-center space-x-3 text-orange-600 hover:text-orange-800">
              <Mail className="h-8 w-8" />
              <div>
                <p className="font-medium">Inbox</p>
                <p className="text-sm text-muted-foreground">Secure messages</p>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Contributions Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <span>Contributions Summary</span>
          </CardTitle>
          <CardDescription>Your contribution history and statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{contributionSummary.totalWeeks}</p>
              <p className="text-sm text-blue-600">Total Weeks</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{contributionSummary.paidWeeks}</p>
              <p className="text-sm text-green-600">Paid Weeks</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">{contributionSummary.creditedWeeks}</p>
              <p className="text-sm text-yellow-600">Credited Weeks</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">
                ${contributionSummary.totalContributions.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-purple-600">Total Contributions</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Claims */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>Recent Claims</span>
          </CardTitle>
          <CardDescription>Your most recent benefit claims</CardDescription>
        </CardHeader>
        <CardContent>
          {claims.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No claims submitted yet</p>
              <Button asChild className="mt-4">
                <Link to="/newbenefit/apply">Apply for Benefits</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {claims.slice(0, 5).map((claim) => (
                <div key={claim.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(claim.status)}
                    <div>
                      <p className="font-medium">{claim.id}</p>
                      <p className="text-sm text-muted-foreground">
                        {claim.benefitType.replace(/_/g, ' ')} - {claim.submissionDate}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getStatusBadgeVariant(claim.status)}>
                      {claim.status.replace(/_/g, ' ')}
                    </Badge>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/newbenefit/claim/${claim.id}`}>View</Link>
                    </Button>
                  </div>
                </div>
              ))}
              {claims.length > 5 && (
                <div className="text-center pt-4">
                  <Button variant="outline" asChild>
                    <Link to="/newbenefit/my-claims">View All Claims</Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
          <CardDescription>Keep your contact details up to date</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p>{profile?.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Phone</p>
              <p>{profile?.phone}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-muted-foreground">Address</p>
              <p>{profile?.address}</p>
            </div>
          </div>
          <Button variant="outline" className="mt-4">
            Update Contact Information
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};