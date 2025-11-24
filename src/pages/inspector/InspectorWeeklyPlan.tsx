import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, MapPin, Clock } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns';

export const InspectorWeeklyPlan = () => {
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 });

  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));

  const mockPlan = {
    'Monday': [
      { time: '09:00 AM', employer: 'ABC Construction Ltd', type: 'Audit', status: 'planned' }
    ],
    'Tuesday': [
      { time: '10:00 AM', employer: 'XYZ Retail Store', type: 'Follow-up', status: 'planned' }
    ],
    'Wednesday': [],
    'Thursday': [
      { time: '02:00 PM', employer: 'DEF Manufacturing', type: 'Inspection', status: 'planned' }
    ],
    'Friday': []
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Weekly Plan</h1>
          <p className="text-muted-foreground">
            {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Visit
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            This Week's Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {weekDays.map((day, index) => {
            const dayName = format(day, 'EEEE');
            const visits = mockPlan[dayName as keyof typeof mockPlan] || [];
            
            return (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{dayName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {format(day, 'MMM d')}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {visits.length} {visits.length === 1 ? 'visit' : 'visits'}
                  </Badge>
                </div>

                {visits.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    No visits scheduled
                  </div>
                ) : (
                  <div className="space-y-2">
                    {visits.map((visit, vIndex) => (
                      <div key={vIndex} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{visit.employer}</p>
                          <p className="text-xs text-muted-foreground">{visit.type} • {visit.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Button variant="outline" className="w-full">
            Submit Plan for Approval
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
