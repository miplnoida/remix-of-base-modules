import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, FileText, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { mockLegalRequisitions } from '@/data/mockLegalIntake';

export default function CaseIntake() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string>('all');

  const pendingCount = mockLegalRequisitions.filter(r => r.status === 'Pending Review').length;
  const infoRequestedCount = mockLegalRequisitions.filter(r => r.status === 'Info Requested').length;

  const filteredRequisitions = filter === 'all' 
    ? mockLegalRequisitions 
    : mockLegalRequisitions.filter(r => r.status === filter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending Review':
        return 'bg-warning/15 text-warning border-warning/20';
      case 'Info Requested':
        return 'bg-info/10 text-info border-info/20';
      case 'Accepted':
        return 'bg-success/10 text-success border-success/20';
      case 'Rejected':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className="flex-1 space-y-6 p-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Case Intake</h1>
          <p className="text-muted-foreground">Review and process legal action requisitions</p>
        </div>
        <div className="flex gap-4">
          <Card className="p-4 border-warning/20 bg-warning/5">
            <div className="flex items-center gap-2 text-warning">
              <FileText className="h-5 w-5" />
              <div>
                <div className="text-xs font-medium">Pending Review</div>
                <div className="text-2xl font-bold">{pendingCount}</div>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-info/20 bg-info/5">
            <div className="flex items-center gap-2 text-info">
              <MessageSquare className="h-5 w-5" />
              <div>
                <div className="text-xs font-medium">Info Requested</div>
                <div className="text-2xl font-bold">{infoRequestedCount}</div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Legal Action Requisitions</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full min-w-max">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground whitespace-nowrap">Intake ID</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground whitespace-nowrap">Case No.</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground whitespace-nowrap">Date</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground whitespace-nowrap">Employer</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground whitespace-nowrap">Reason</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground whitespace-nowrap">Period</th>
                  <th className="text-right p-3 text-sm font-medium text-muted-foreground whitespace-nowrap">Amount</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground whitespace-nowrap">Status</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground whitespace-nowrap">Submitted By</th>
                  <th className="text-right p-3 text-sm font-medium text-muted-foreground sticky right-0 bg-card z-10">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequisitions.map((req) => (
                  <tr key={req.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="p-3 whitespace-nowrap">
                      <div className="font-medium">{req.intakeId}</div>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {req.caseNumber ? (
                        <div className="font-medium text-primary">{req.caseNumber}</div>
                      ) : (
                        <div className="text-muted-foreground">-</div>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        {new Date(req.submissionDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-3 min-w-[180px]">
                      <div className="font-medium">{req.employer.name}</div>
                      <div className="text-xs text-muted-foreground">{req.employer.registrationNumber}</div>
                    </td>
                    <td className="p-3 max-w-[200px]">
                      <div className="text-sm truncate" title={req.reason}>{req.reason}</div>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <div className="text-sm">{req.period}</div>
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <div className="font-medium">${req.amount.toLocaleString()}</div>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <Badge variant="outline" className={getStatusColor(req.status)}>
                        {req.status}
                      </Badge>
                    </td>
                    <td className="p-3 whitespace-nowrap min-w-[140px]">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                          {req.submittedBy.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span>{req.submittedBy}</span>
                      </div>
                    </td>
                    <td className="p-3 text-right sticky right-0 bg-card z-10">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/legal/cases/intake/${req.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}
