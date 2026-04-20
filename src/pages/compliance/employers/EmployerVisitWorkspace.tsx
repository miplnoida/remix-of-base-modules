import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Building2, MapPin, PlayCircle, StopCircle, Loader2, Eye, Briefcase, AlertTriangle, History, LogOut } from 'lucide-react';
import { CheckInOutTabContent } from '@/components/compliance/inspection/CheckInOutTabContent';
import { CheckOutCloseTabContent } from '@/components/compliance/inspection/CheckOutCloseTabContent';
import { EvidenceTabContent } from '@/components/compliance/inspection/EvidenceTabContent';
import { FindingsTabContent } from '@/components/compliance/inspection/FindingsTabContent';
import { ObservationsTabContent } from '@/components/compliance/inspection/ObservationsTabContent';
import { ViolationsTabContent } from '@/components/compliance/inspection/ViolationsTabContent';
import { VisitHistoryPanel } from '@/components/compliance/inspection/VisitHistoryPanel';
import { inspectionService } from '@/services/inspectionService';
import { InspectionVisit, InspectionVisitStatus } from '@/types/inspectionTypes';
import { toast } from 'sonner';
import { useUserCode } from '@/hooks/useUserCode';

export default function EmployerVisitWorkspace() {
  const { employerId } = useParams<{ employerId: string }>();
  const navigate = useNavigate();
  const { userCode } = useUserCode();
  const currentUserCode = userCode || 'SYSTEM';
  
  const [employer, setEmployer] = useState({
    id: employerId || '',
    name: '',
    code: '',
    territory: '' as string
  });
  const [loadingEmployer, setLoadingEmployer] = useState(true);

  useEffect(() => {
    if (employerId) {
      setLoadingEmployer(true);
      supabase.from('er_master').select('regno, name, office_code').eq('regno', employerId).maybeSingle().then(({ data }) => {
        setEmployer({
          id: employerId,
          name: (data as any)?.name || employerId,
          code: employerId,
          territory: 'St Kitts'
        });
        setLoadingEmployer(false);
      });
    }
  }, [employerId]);

  const [currentVisit, setCurrentVisit] = useState<InspectionVisit | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (employer.id) loadCurrentVisit();
  }, [employer.id]);

  const loadCurrentVisit = async () => {
    setLoading(true);
    try {
      // Check for an active inspection for this employer
      const { data } = await supabase
        .from('ce_inspections')
        .select('*')
        .eq('employer_id', employer.id)
        .in('status', ['IN_PROGRESS', 'SCHEDULED'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (data) {
        setCurrentVisit({
          id: data.id,
          weeklyPlanItemId: data.id,
          employerId: data.employer_id ?? undefined,
          employerName: data.employer_name ?? undefined,
          inspectorUserId: data.inspector_id ?? '',
          inspectorName: data.inspector_name ?? '',
          territory: (data.territory ?? 'St Kitts') as any,
          checkInTime: data.check_in_time ?? data.actual_start ?? undefined,
          checkInLocation: data.location_address ?? undefined,
          checkOutTime: data.check_out_time ?? data.actual_end ?? undefined,
          checkOutLocation: data.location_address ?? undefined,
          notes: data.findings_summary ?? undefined,
          visitStatus: (data.status ?? 'IN_PROGRESS') as InspectionVisitStatus,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        });
      }
    } catch (error) {
      console.error('Error loading visit:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartVisit = async () => {
    if (!employer.id) return;
    
    setLoading(true);
    try {
      // Create a new inspection record directly
      const inspNumber = `INS-${Date.now().toString(36).toUpperCase()}`;
      const { data, error } = await supabase
        .from('ce_inspections')
        .insert({
          inspection_number: inspNumber,
          employer_id: employer.id,
          employer_name: employer.name,
          territory: employer.territory || 'St Kitts',
          inspection_type: 'FIELD_VISIT',
          status: 'IN_PROGRESS',
          inspector_id: currentUserCode,
          inspector_name: currentUserCode,
          scheduled_date: new Date().toISOString().slice(0, 10),
          actual_start: new Date().toISOString(),
          check_in_time: new Date().toISOString(),
          location_address: 'Employer premises',
          created_by: currentUserCode,
        } as any)
        .select('*')
        .single();

      if (error) throw error;

      setCurrentVisit({
        id: data.id,
        weeklyPlanItemId: data.id,
        employerId: data.employer_id ?? undefined,
        employerName: data.employer_name ?? undefined,
        inspectorUserId: data.inspector_id ?? '',
        inspectorName: data.inspector_name ?? '',
        territory: (data.territory ?? 'St Kitts') as any,
        checkInTime: data.check_in_time ?? undefined,
        checkInLocation: data.location_address ?? undefined,
        visitStatus: 'IN_PROGRESS' as InspectionVisitStatus,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      });
      toast.success('Visit started');
    } catch (error) {
      toast.error('Failed to start visit');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loadingEmployer) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{employer.name}</h1>
            <div className="flex items-center gap-4 mt-2 text-muted-foreground">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span>{employer.code}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{employer.territory}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button size="sm" variant="outline" onClick={() => navigate(`/compliance/field/employer-360/${employerId}`)}>
            <Eye className="h-4 w-4 mr-1" />Employer 360
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/compliance/violations/manual-entry', {
            state: { prefill: { employer_id: employerId, employer_name: employer.name } }
          })}>
            <AlertTriangle className="h-4 w-4 mr-1" />New Violation
          </Button>
          {currentVisit ? (
            <Badge variant="default" className="flex items-center gap-2">
              <StopCircle className="h-4 w-4" />
              Visit in Progress
            </Badge>
          ) : (
            <Button onClick={handleStartVisit} disabled={loading}>
              <PlayCircle className="h-4 w-4 mr-2" />
              Start New Visit
            </Button>
          )}
        </div>
      </div>

      {/* Visit Workspace */}
      {currentVisit ? (
        <Tabs defaultValue="checkin" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="checkin">Visit Info</TabsTrigger>
            <TabsTrigger value="evidence">Evidence</TabsTrigger>
            <TabsTrigger value="findings">Findings</TabsTrigger>
            <TabsTrigger value="observations">Observations</TabsTrigger>
            <TabsTrigger value="violations">Violations</TabsTrigger>
            <TabsTrigger value="checkout"><LogOut className="h-3.5 w-3.5 mr-1" />Check-out</TabsTrigger>
            <TabsTrigger value="history"><History className="h-3.5 w-3.5 mr-1" />History</TabsTrigger>
          </TabsList>

          <TabsContent value="checkin">
            <Card>
              <CardHeader>
                <CardTitle>Visit Information</CardTitle>
              </CardHeader>
              <CardContent>
                <CheckInOutTabContent
                  planItem={{
                    id: currentVisit.id,
                    inspectorUserId: currentVisit.inspectorUserId,
                    inspectorName: currentVisit.inspectorName,
                    itemType: 'EMPLOYER_VISIT' as any,
                    employerId: employer.id,
                    employerName: employer.name,
                    territory: (employer.territory || 'St Kitts') as any,
                    plannedDate: new Date().toISOString().slice(0, 10),
                    status: currentVisit.visitStatus,
                    createdAt: currentVisit.createdAt,
                    updatedAt: currentVisit.updatedAt,
                  }}
                  visit={currentVisit}
                  onVisitUpdate={setCurrentVisit}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="evidence">
            <Card>
              <CardHeader>
                <CardTitle>Evidence Collection</CardTitle>
              </CardHeader>
              <CardContent>
                <EvidenceTabContent visit={currentVisit} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="findings">
            <Card>
              <CardHeader>
                <CardTitle>Inspection Findings</CardTitle>
              </CardHeader>
              <CardContent>
                <FindingsTabContent visit={currentVisit} employerId={employer.id} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="observations">
            <Card>
              <CardHeader>
                <CardTitle>Observations & Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <ObservationsTabContent 
                  employerId={employer.id}
                  visitId={currentVisit.id}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="violations">
            <Card>
              <CardHeader>
                <CardTitle>Violations Created</CardTitle>
              </CardHeader>
              <CardContent>
                <ViolationsTabContent visit={currentVisit} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="checkout">
            <Card>
              <CardHeader>
                <CardTitle>Check-out & Close Visit</CardTitle>
              </CardHeader>
              <CardContent>
                <CheckOutCloseTabContent
                  visit={currentVisit}
                  planItemId={currentVisit.id}
                  employerId={employer.id}
                  onVisitUpdate={setCurrentVisit}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>All Visits for {employer.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <VisitHistoryPanel
                  employerId={employer.id}
                  currentVisitId={currentVisit.id}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <PlayCircle className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Active Visit</h3>
            <p className="text-muted-foreground mb-6">
              Start a new visit to begin inspection activities
            </p>
            <Button onClick={handleStartVisit} disabled={loading}>
              <PlayCircle className="h-4 w-4 mr-2" />
              Start Visit
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
