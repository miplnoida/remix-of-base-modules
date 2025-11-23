import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { InspectionVisit } from '@/types/inspectionTypes';
import { Violation } from '@/types/violation';
import { violationService } from '@/services/violationService';
import { useNavigate } from 'react-router-dom';

interface ViolationsTabContentProps {
  visit: InspectionVisit;
}

export function ViolationsTabContent({ visit }: ViolationsTabContentProps) {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadViolations();
  }, [visit.id]);

  const loadViolations = async () => {
    try {
      setLoading(true);
      const data = await violationService.getByVisitId(visit.id);
      setViolations(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-primary/10 text-primary';
      case 'IN_PROGRESS':
        return 'bg-warning/10 text-warning';
      case 'RESOLVED':
      case 'CLOSED':
        return 'bg-success/10 text-success';
      case 'ESCALATED':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical':
      case 'High':
        return 'bg-destructive/10 text-destructive';
      case 'Medium':
        return 'bg-warning/10 text-warning';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6 py-4">
      <div className="space-y-3">
        <h3 className="font-medium">Violations from This Visit ({violations.length})</h3>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : violations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No violations created from this visit yet
          </div>
        ) : (
          <div className="space-y-3">
            {violations.map((violation) => (
              <div
                key={violation.id}
                className="p-4 border rounded-lg space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-sm">{violation.violationNumber}</span>
                      <Badge className={getStatusColor(violation.status)}>
                        {violation.status.replace('_', ' ')}
                      </Badge>
                      <Badge className={getPriorityColor(violation.priority)}>
                        {violation.priority}
                      </Badge>
                    </div>

                    <div className="font-medium">{violation.summary}</div>
                    
                    {violation.description && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {violation.description}
                      </div>
                    )}

                    <div className="text-sm text-muted-foreground mt-2">
                      Type: {violation.violationType.replace('_', ' ')}
                    </div>

                    {violation.assignedToName && (
                      <div className="text-sm text-muted-foreground">
                        Assigned to: {violation.assignedToName}
                      </div>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/compliance/violations/${violation.id}`)}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
