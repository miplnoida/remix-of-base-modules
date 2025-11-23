import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Building2, MapPin, PlayCircle, StopCircle } from 'lucide-react';
import { CheckInOutTabContent } from '@/components/compliance/inspection/CheckInOutTabContent';
import { EvidenceTabContent } from '@/components/compliance/inspection/EvidenceTabContent';
import { FindingsTabContent } from '@/components/compliance/inspection/FindingsTabContent';
import { ObservationsTabContent } from '@/components/compliance/inspection/ObservationsTabContent';
import { ViolationsTabContent } from '@/components/compliance/inspection/ViolationsTabContent';
import { inspectionService } from '@/services/inspectionService';
import { InspectionVisit, WeeklyPlanItem } from '@/types/inspectionTypes';
import { toast } from 'sonner';

export default function EmployerVisitWorkspace() {
  const { employerId } = useParams<{ employerId: string }>();
  const navigate = useNavigate();
  
  // Mock employer data - in real app, fetch from employer service
  const [employer] = useState({
    id: employerId || 'EMP-2024-001',
    name: 'ABC Construction Ltd',
    code: 'EMP-2024-001',
    territory: 'St Kitts' as const
  });

  const [currentVisit, setCurrentVisit] = useState<InspectionVisit | null>(null);
  const [planItem, setPlanItem] = useState<WeeklyPlanItem | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCurrentVisit();
  }, [employer.id]);

  const loadCurrentVisit = async () => {
    setLoading(true);
    try {
      // In real app, fetch active visit for this employer
      // For now, create a mock plan item
      const mockPlanItem: WeeklyPlanItem = {
        id: 'wpi-current',
        inspectorUserId: 'inspector-001',
        inspectorName: 'John Inspector',
        itemType: 'EMPLOYER_VISIT' as any,
        employerId: employer.id,
        employerName: employer.name,
        territory: employer.territory,
        plannedDate: new Date().toISOString().split('T')[0],
        status: 'NOT_STARTED' as any,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setPlanItem(mockPlanItem);
    } catch (error) {
      console.error('Error loading visit:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartVisit = async () => {
    if (!planItem) return;
    
    setLoading(true);
    try {
      const visit = await inspectionService.checkIn(planItem.id, {
        location: 'Employer premises'
      });
      setCurrentVisit(visit);
      toast.success('Visit started');
    } catch (error) {
      toast.error('Failed to start visit');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!employer) {
    return <div className="p-6">Loading employer...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/compliance/employers')}
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
      {currentVisit && planItem ? (
        <Tabs defaultValue="checkin" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="checkin">Visit Info</TabsTrigger>
            <TabsTrigger value="evidence">Evidence</TabsTrigger>
            <TabsTrigger value="findings">Findings</TabsTrigger>
            <TabsTrigger value="observations">Observations</TabsTrigger>
            <TabsTrigger value="violations">Violations</TabsTrigger>
          </TabsList>

          <TabsContent value="checkin">
            <Card>
              <CardHeader>
                <CardTitle>Visit Information</CardTitle>
              </CardHeader>
              <CardContent>
                <CheckInOutTabContent
                  planItem={planItem}
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
                <FindingsTabContent visit={currentVisit} employerId={employer.id} planItem={planItem} />
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
