import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, CheckCircle, Camera, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export const InspectorActivities = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeVisit, setActiveVisit] = useState<string | null>(null);

  const todayVisits = [
    { 
      id: '1',
      employer: 'ABC Construction Ltd', 
      type: 'Audit', 
      scheduledTime: '09:00 AM',
      address: '123 Main Street, Basseterre',
      status: 'ready'
    },
    { 
      id: '2',
      employer: 'XYZ Retail Store', 
      type: 'Follow-up', 
      scheduledTime: '11:30 AM',
      address: '456 Bay Road, Charlestown',
      status: 'scheduled'
    }
  ];

  const handleCheckIn = (visitId: string) => {
    setActiveVisit(visitId);
    toast({
      title: "Checked In",
      description: "GPS location captured. Visit started.",
    });
  };

  const handleCheckOut = () => {
    toast({
      title: "Checked Out",
      description: "Visit completed successfully",
    });
    setActiveVisit(null);
  };

  const handleEvidence = () => {
    toast({
      title: "Capture Evidence",
      description: "Camera feature coming soon",
    });
  };

  const handleNotes = () => {
    toast({
      title: "Add Notes",
      description: "Notes feature coming soon",
    });
  };

  const handleDetails = (visitId: string) => {
    toast({
      title: "Visit Details",
      description: "Viewing details for visit",
    });
  };

  return (
    <div className="space-y-4 pb-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Field Activities</h1>
        <p className="text-muted-foreground text-sm">Check in and execute today's visits</p>
      </div>

      {activeVisit && (
        <Card className="border-primary shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Active Visit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 bg-primary/5 rounded-lg">
              <p className="font-medium text-sm mb-0.5">
                {todayVisits.find(v => v.id === activeVisit)?.employer}
              </p>
              <p className="text-xs text-muted-foreground">
                {todayVisits.find(v => v.id === activeVisit)?.address}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-16 flex-col gap-1.5" onClick={handleEvidence}>
                <Camera className="h-5 w-5" />
                <span className="text-xs">Evidence</span>
              </Button>
              <Button variant="outline" className="h-16 flex-col gap-1.5" onClick={handleNotes}>
                <FileText className="h-5 w-5" />
                <span className="text-xs">Notes</span>
              </Button>
            </div>

            <Button 
              className="w-full" 
              variant="destructive"
              onClick={handleCheckOut}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Check Out
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <h2 className="font-semibold text-base">Today's Visits</h2>
        {todayVisits.map((visit) => (
          <Card key={visit.id} className={visit.id === activeVisit ? 'opacity-50' : ''}>
            <CardContent className="p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">{visit.employer}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 flex-shrink-0" />
                    {visit.scheduledTime}
                  </div>
                </div>
                <Badge variant={visit.status === 'ready' ? 'default' : 'secondary'} className="text-xs ml-2 flex-shrink-0">
                  {visit.status}
                </Badge>
              </div>

              <div className="flex items-start gap-1.5 text-xs text-muted-foreground mb-3">
                <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-2">{visit.address}</span>
              </div>

              <div className="flex gap-2">
                <Button 
                  className="flex-1 text-xs h-9"
                  disabled={!!activeVisit || visit.status !== 'ready'}
                  onClick={() => handleCheckIn(visit.id)}
                >
                  <MapPin className="h-3 w-3 mr-1" />
                  Check In
                </Button>
                <Button variant="outline" className="text-xs h-9 px-3" onClick={() => handleDetails(visit.id)}>
                  Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
