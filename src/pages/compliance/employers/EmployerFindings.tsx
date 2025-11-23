import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, FileText, AlertTriangle, Building2, MapPin, Eye, Plus } from 'lucide-react';
import { InspectionFinding } from '@/types/inspectionTypes';
import { Violation } from '@/types/violation';
import { inspectionService } from '@/services/inspectionService';
import { violationService } from '@/services/violationService';
import { CreateViolationFromFindingDialog } from '@/components/compliance/CreateViolationFromFindingDialog';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function EmployerFindings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const employerIdParam = searchParams.get('employerId');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployer, setSelectedEmployer] = useState<any>(null);
  const [findings, setFindings] = useState<InspectionFinding[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<InspectionFinding | null>(null);
  const [showCreateViolation, setShowCreateViolation] = useState(false);

  useEffect(() => {
    if (employerIdParam) {
      loadEmployerData(employerIdParam);
    }
  }, [employerIdParam]);

  const loadEmployerData = async (employerId: string) => {
    setLoading(true);
    try {
      // Mock employer data
      const employer = {
        id: employerId,
        name: 'ABC Construction Ltd',
        code: 'EMP-2024-001',
        territory: 'St Kitts'
      };
      setSelectedEmployer(employer);

      // Load findings and violations for this employer
      // In real app, filter by employerId
      const findingsData = await inspectionService.getFindingsForVisit('all'); // Mock - should filter by employer
      setFindings(findingsData);

      const violationsData = await violationService.getAll();
      setViolations(violationsData.filter(v => v.employerId === employerId));
    } catch (error) {
      console.error('Error loading employer data:', error);
      toast.error('Failed to load employer data');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!searchTerm.trim()) {
      toast.error('Please enter an employer name or code');
      return;
    }
    // Mock search - in real app, search employers
    loadEmployerData('EMP-2024-001');
  };

  const handleCreateViolation = (finding: InspectionFinding) => {
    setSelectedFinding(finding);
    setShowCreateViolation(true);
  };

  const handleViewViolation = (violationId: string) => {
    navigate(`/compliance/violations/${violationId}`);
  };

  const getFindingTypeBadge = (type: string) => {
    const variants: Record<string, any> = {
      COMPLIANT: 'default',
      MINOR_ISSUE: 'secondary',
      MAJOR_ISSUE: 'destructive',
      POSSIBLE_VIOLATION: 'destructive'
    };
    return variants[type] || 'secondary';
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, any> = {
      Low: 'secondary',
      Medium: 'default',
      High: 'destructive',
      Critical: 'destructive'
    };
    return variants[severity] || 'secondary';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Employer Findings</h1>
        <p className="text-muted-foreground">
          View all inspection findings and create violations for a specific employer
        </p>
      </div>

      {/* Employer Search */}
      {!selectedEmployer && (
        <Card>
          <CardHeader>
            <CardTitle>Search Employer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Enter employer name or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employer Context */}
      {selectedEmployer && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Building2 className="h-8 w-8 text-primary" />
                  <div>
                    <CardTitle className="text-xl">{selectedEmployer.name}</CardTitle>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span>{selectedEmployer.code}</span>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {selectedEmployer.territory}
                      </div>
                    </div>
                  </div>
                </div>
                <Button variant="outline" onClick={() => setSelectedEmployer(null)}>
                  Change Employer
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="findings" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="findings">
                <FileText className="h-4 w-4 mr-2" />
                Findings ({findings.length})
              </TabsTrigger>
              <TabsTrigger value="violations">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Violations ({violations.length})
              </TabsTrigger>
              <TabsTrigger value="visits">Visits History</TabsTrigger>
            </TabsList>

            {/* Findings Tab */}
            <TabsContent value="findings">
              <Card>
                <CardHeader>
                  <CardTitle>All Inspection Findings</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading findings...
                    </div>
                  ) : findings.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No findings recorded for this employer</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Visit Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Violation Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {findings.map((finding) => (
                          <TableRow key={finding.id}>
                            <TableCell>
                              {format(new Date(finding.createdAt), 'MMM dd, yyyy')}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getFindingTypeBadge(finding.findingType)}>
                                {finding.findingType.replace(/_/g, ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getSeverityBadge(finding.severity)}>
                                {finding.severity}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{finding.title}</TableCell>
                            <TableCell>
                              {finding.isViolationCreated ? (
                                <Badge variant="default">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Violation Created
                                </Badge>
                              ) : (
                                <Badge variant="outline">No Violation</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {!finding.isViolationCreated && (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleCreateViolation(finding)}
                                  >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Create Violation
                                  </Button>
                                )}
                                {finding.isViolationCreated && finding.violationId && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewViolation(finding.violationId!)}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    View Violation
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Violations Tab */}
            <TabsContent value="violations">
              <Card>
                <CardHeader>
                  <CardTitle>Violations for This Employer</CardTitle>
                </CardHeader>
                <CardContent>
                  {violations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No violations recorded for this employer</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Number</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Discovered</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {violations.map((violation) => (
                          <TableRow key={violation.id}>
                            <TableCell className="font-mono">
                              {violation.violationNumber}
                            </TableCell>
                            <TableCell>
                              {violation.violationType.replace(/_/g, ' ')}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{violation.status}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={violation.priority === 'High' || violation.priority === 'Critical' ? 'destructive' : 'default'}>
                                {violation.priority}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {format(new Date(violation.discoveredDate), 'MMM dd, yyyy')}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewViolation(violation.id)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Visits Tab */}
            <TabsContent value="visits">
              <Card>
                <CardHeader>
                  <CardTitle>Visit History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    Visit history will be displayed here
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Create Violation Dialog */}
      {selectedFinding && (
        <CreateViolationFromFindingDialog
          open={showCreateViolation}
          onOpenChange={setShowCreateViolation}
          finding={selectedFinding}
          employerId={selectedEmployer.id}
          employerName={selectedEmployer.name}
          onViolationCreated={() => {
            setShowCreateViolation(false);
            loadEmployerData(selectedEmployer.id);
          }}
        />
      )}
    </div>
  );
}
