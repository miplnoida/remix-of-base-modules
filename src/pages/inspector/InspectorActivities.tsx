import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, CheckCircle, Camera, FileText } from 'lucide-react';

export const InspectorActivities = () => {
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
    // TODO: Capture GPS location and timestamp
  };

  const handleCheckOut = () => {
    setActiveVisit(null);
    // TODO: Save visit data
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Field Activities</h1>
        <p className="text-muted-foreground">Check in and execute today's visits</p>
      </div>

      {activeVisit && (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Active Visit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-4 bg-primary/5 rounded-lg">
              <p className="font-medium mb-1">
                {todayVisits.find(v => v.id === activeVisit)?.employer}
              </p>
              <p className="text-sm text-muted-foreground">
                {todayVisits.find(v => v.id === activeVisit)?.address}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-20 flex-col gap-2">
                <Camera className="h-6 w-6" />
                <span className="text-xs">Capture Evidence</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2">
                <FileText className="h-6 w-6" />
                <span className="text-xs">Add Notes</span>
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

      <div className="space-y-3">
        <h2 className="font-semibold">Today's Visits</h2>
        {todayVisits.map((visit) => (
          <Card key={visit.id} className={visit.id === activeVisit ? 'opacity-50' : ''}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-medium">{visit.employer}</h3>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {visit.scheduledTime}
                  </div>
                </div>
                <Badge variant={visit.status === 'ready' ? 'default' : 'secondary'}>
                  {visit.status}
                </Badge>
              </div>

              <div className="flex items-start gap-2 text-sm text-muted-foreground mb-3">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{visit.address}</span>
              </div>

              <div className="flex gap-2">
                <Button 
                  className="flex-1"
                  disabled={!!activeVisit || visit.status !== 'ready'}
                  onClick={() => handleCheckIn(visit.id)}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Check In
                </Button>
                <Button variant="outline">
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
