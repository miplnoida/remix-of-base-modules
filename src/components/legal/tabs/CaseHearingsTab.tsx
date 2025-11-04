import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MockCase } from "@/data/mockLegalCases";
import { Plus, Calendar, MapPin, Users, Clock } from "lucide-react";
import { ScheduleHearingDialog } from "@/components/legal/ScheduleHearingDialog";
import { toast } from "sonner";
import { format } from "date-fns";

interface CaseHearingsTabProps {
  caseData: MockCase;
}

const mockHearings = [
  {
    id: '1',
    type: 'Preliminary Hearing',
    date: '2025-11-10T09:00:00',
    venue: 'SSB Hearing Room A',
    panel: ['Judge Sarah Johnson', 'Member David Lee'],
    description: 'Initial hearing to address procedural matters'
  },
  {
    id: '2',
    type: 'Full Hearing',
    date: '2025-11-15T14:00:00',
    venue: 'SSB Hearing Room B',
    panel: ['Judge Michael Chen', 'Member Lisa Wang', 'Member John Smith'],
    description: 'Main hearing to review evidence and testimonies'
  }
];

export function CaseHearingsTab({ caseData }: CaseHearingsTabProps) {
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedHearing, setSelectedHearing] = useState<typeof mockHearings[0] | null>(null);

  const handleSchedule = (caseId: string, hearing: any) => {
    toast.success("Hearing scheduled successfully");
    setScheduleOpen(false);
  };

  const handleShowDetails = (hearing: typeof mockHearings[0]) => {
    setSelectedHearing(hearing);
    setIsDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Scheduled Hearings</h2>
        <Button onClick={() => setScheduleOpen(true)} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Schedule Hearing
        </Button>
      </div>

      {mockHearings.length > 0 ? (
        <div className="grid gap-4">
          {mockHearings.map((hearing) => (
            <Card key={hearing.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-sm font-medium">
                        {hearing.type}
                      </Badge>
                      <Badge variant="success">Scheduled</Badge>
                    </div>
                    
                    <div className="grid gap-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-foreground" />
                        <span className="text-sm font-medium text-foreground">
                          {new Date(hearing.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-foreground" />
                        <span className="text-sm font-medium text-foreground">{hearing.venue}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-foreground" />
                        <span className="text-sm font-medium text-foreground">
                          {hearing.panel.join(', ')}
                        </span>
                      </div>
                    </div>

                    {hearing.description && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {hearing.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleShowDetails(hearing)}>Details</Button>
                    <Button variant="ghost" size="sm">Reschedule</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4">No hearings scheduled yet</p>
            <Button onClick={() => setScheduleOpen(true)} variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Schedule First Hearing
            </Button>
          </CardContent>
        </Card>
      )}

      <ScheduleHearingDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        caseId={caseData.id}
        onSchedule={handleSchedule}
      />

      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
          {selectedHearing && (
            <>
              <SheetHeader>
                <SheetTitle>Hearing Details</SheetTitle>
                <SheetDescription>
                  {caseData.number} - {caseData.title}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-6 mt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Type</h4>
                    <Badge variant="outline">{selectedHearing.type}</Badge>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Status</h4>
                    <Badge variant="default">Scheduled</Badge>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-1">Venue</h4>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">{selectedHearing.venue}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-1">Hearing Time</h4>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">{format(new Date(selectedHearing.date), 'PPp')}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-2">Panel Members</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedHearing.panel.map((member: string, idx: number) => (
                      <Badge key={idx} variant="outline">
                        {member}
                      </Badge>
                    ))}
                  </div>
                </div>

                {selectedHearing.description && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Hearing Description</h4>
                    <p className="text-sm text-muted-foreground">{selectedHearing.description}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setIsDetailOpen(false)}
                    className="flex-1"
                  >
                    Close
                  </Button>
                  <Button variant="ghost" className="flex-1">
                    Reschedule
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
