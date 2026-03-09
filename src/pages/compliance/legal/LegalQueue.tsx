import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Scale, ArrowRight, Building2, DollarSign, AlertTriangle, Clock, CheckCircle } from 'lucide-react';

const legalStages = [
  'Warning Notice', 'Demand Notice', 'Final Demand', 'Legal Action Requisition',
  'Summons', 'Judgment Summons', 'Writ of Execution', 'Commitment/JDS', 'Recovery Monitoring'
];

const queueItems = [
  { id: 'LGL-Q-001', employer: 'KN Shipping Services', regNo: 'R-11023', arrears: '$210,000', currentStage: 'Summons', nextAction: 'Serve summons to magistrate court', dueDate: '2026-03-12', priority: 'Critical', funds: ['SS', 'LV', 'PE'] },
  { id: 'LGL-Q-002', employer: 'Island Construction Ltd', regNo: 'R-10567', arrears: '$128,500', currentStage: 'Final Demand', nextAction: 'Prepare Legal Action Requisition', dueDate: '2026-03-15', priority: 'Critical', funds: ['SS', 'PE'] },
  { id: 'LGL-Q-003', employer: 'Palm View Resort', regNo: 'R-10456', arrears: '$78,300', currentStage: 'Demand Notice', nextAction: 'Issue final demand (14 days overdue)', dueDate: '2026-03-18', priority: 'High', funds: ['SS', 'LV'] },
  { id: 'LGL-Q-004', employer: 'Caribbean Hotel Group', regNo: 'R-10234', arrears: '$45,200', currentStage: 'Warning Notice', nextAction: 'Issue demand notice if no response', dueDate: '2026-03-22', priority: 'High', funds: ['SS'] },
  { id: 'LGL-Q-005', employer: 'Tropical Traders Inc', regNo: 'R-11245', arrears: '$18,400', currentStage: 'Warning Notice', nextAction: 'Follow up on warning response', dueDate: '2026-03-25', priority: 'Medium', funds: ['SS', 'LV', 'PE'] },
];

const stageColor = (stage: string) => {
  if (['Summons', 'Judgment Summons', 'Writ of Execution', 'Commitment/JDS'].includes(stage)) return 'destructive';
  if (['Legal Action Requisition', 'Final Demand'].includes(stage)) return 'default';
  if (['Demand Notice'].includes(stage)) return 'secondary';
  return 'outline';
};

const LegalQueue = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Scale className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-semibold text-foreground">Legal Queue</h1>
        </div>
        <p className="text-muted-foreground">Cases ready for legal escalation — review and approve legal actions</p>
      </div>

      {/* Stage Summary */}
      <div className="flex flex-wrap gap-2">
        {legalStages.map(stage => {
          const count = queueItems.filter(q => q.currentStage === stage).length;
          return (
            <Badge key={stage} variant={count > 0 ? 'default' : 'outline'} className="text-xs py-1 px-3">
              {stage} ({count})
            </Badge>
          );
        })}
      </div>

      {/* Queue Items */}
      <div className="space-y-3">
        {queueItems.map((item) => (
          <Card key={item.id} className="hover:shadow-md transition-shadow">
            <CardContent className="py-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-medium text-foreground">{item.id}</span>
                    <Badge variant={stageColor(item.currentStage)} className="text-[10px]">{item.currentStage}</Badge>
                    <Badge variant={item.priority === 'Critical' ? 'destructive' : item.priority === 'High' ? 'default' : 'secondary'} className="text-[10px]">
                      {item.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-medium text-foreground flex items-center gap-1"><Building2 className="h-3.5 w-3.5 text-muted-foreground" />{item.employer}</span>
                    <Badge variant="outline" className="font-mono text-[10px]">{item.regNo}</Badge>
                    <span className="font-medium text-foreground flex items-center gap-1"><DollarSign className="h-3.5 w-3.5 text-muted-foreground" />{item.arrears}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground flex items-center gap-1"><ArrowRight className="h-3.5 w-3.5 text-primary" /><span className="font-medium text-foreground">Next:</span> {item.nextAction}</span>
                    <span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />Due: {item.dueDate}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground mr-1">Funds:</span>
                    {item.funds.map(f => <Badge key={f} variant="outline" className="text-[10px] h-5">{f}</Badge>)}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button variant="outline" size="sm">Review</Button>
                  <Button size="sm">Escalate</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default LegalQueue;
