import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ListChecks, ArrowRight, Clock, Building2, AlertTriangle, DollarSign } from 'lucide-react';

const queueItems = [
  { id: 'CASE-2026-00006', employer: 'KN Shipping Services', regNo: 'R-11023', arrears: '$210,000', priority: 'Critical', reason: 'Court hearing in 3 days', action: 'Prepare summons documentation', daysOpen: 124 },
  { id: 'CASE-2026-00002', employer: 'Island Construction Ltd', regNo: 'R-10567', arrears: '$128,500', priority: 'Critical', reason: 'No response to final demand', action: 'Escalate to Legal Action Requisition', daysOpen: 46 },
  { id: 'CASE-2026-00004', employer: 'Palm View Resort', regNo: 'R-10456', arrears: '$78,300', priority: 'Critical', reason: 'Arrangement defaulted twice', action: 'Review for enforcement', daysOpen: 27 },
  { id: 'CASE-2026-00001', employer: 'Caribbean Hotel Group', regNo: 'R-10234', arrears: '$45,200', priority: 'High', reason: 'Under review – overdue 14 days', action: 'Issue demand notice', daysOpen: 53 },
  { id: 'CASE-2026-00007', employer: 'Tropical Traders Inc', regNo: 'R-11245', arrears: '$18,400', priority: 'Medium', reason: 'Awaiting response – 7 days left', action: 'Follow up via phone', daysOpen: 12 },
];

const CaseQueue = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <ListChecks className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-semibold text-foreground">Case Queue</h1>
        </div>
        <p className="text-muted-foreground">Prioritized queue of compliance cases requiring immediate action — sorted by urgency</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Critical</p><p className="text-2xl font-bold text-destructive">{queueItems.filter(q => q.priority === 'Critical').length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">High</p><p className="text-2xl font-bold text-warning">{queueItems.filter(q => q.priority === 'High').length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Medium</p><p className="text-2xl font-bold text-primary">{queueItems.filter(q => q.priority === 'Medium').length}</p></CardContent></Card>
      </div>

      <div className="space-y-3">
        {queueItems.map((item, idx) => (
          <Card key={item.id} className="hover:shadow-md transition-shadow">
            <CardContent className="py-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground font-medium">#{idx + 1}</span>
                    <span className="font-mono text-sm font-medium text-foreground">{item.id}</span>
                    <Badge variant={item.priority === 'Critical' ? 'destructive' : item.priority === 'High' ? 'default' : 'secondary'} className="text-[10px]">
                      {item.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-foreground font-medium flex items-center gap-1"><Building2 className="h-3.5 w-3.5 text-muted-foreground" />{item.employer}</span>
                    <Badge variant="outline" className="font-mono text-[10px]">{item.regNo}</Badge>
                    <span className="text-sm text-foreground flex items-center gap-1"><DollarSign className="h-3.5 w-3.5 text-muted-foreground" />{item.arrears}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{item.daysOpen} days open</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="h-3.5 w-3.5 text-warning mt-0.5 shrink-0" />
                    <span className="text-muted-foreground"><span className="font-medium text-foreground">Reason:</span> {item.reason}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="text-muted-foreground"><span className="font-medium text-foreground">Recommended:</span> {item.action}</span>
                  </div>
                </div>
                <Button size="sm" className="ml-4">Take Action</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CaseQueue;
