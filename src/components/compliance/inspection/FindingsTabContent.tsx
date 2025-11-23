import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, AlertCircle } from 'lucide-react';
import { InspectionVisit, InspectionFinding, FindingType, WeeklyPlanItem } from '@/types/inspectionTypes';
import { inspectionService } from '@/services/inspectionService';
import { CreateViolationFromFindingDialog } from '../CreateViolationFromFindingDialog';
import { toast } from 'sonner';

interface FindingsTabContentProps {
  visit: InspectionVisit;
  employerId: string;
  planItem?: WeeklyPlanItem;
}

export function FindingsTabContent({ visit, employerId, planItem }: FindingsTabContentProps) {
  const [findings, setFindings] = useState<InspectionFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [findingType, setFindingType] = useState<FindingType>(FindingType.COMPLIANT);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Low');
  const [recommendedAction, setRecommendedAction] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<InspectionFinding | null>(null);

  useEffect(() => {
    loadFindings();
  }, [visit.id]);

  const loadFindings = async () => {
    try {
      setLoading(true);
      const data = await inspectionService.getFindingsForVisit(visit.id);
      setFindings(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!title || !description) {
      toast.error('Please fill in title and description');
      return;
    }

    try {
      setCreating(true);
      await inspectionService.createFinding(visit.id, {
        findingType,
        title,
        description,
        severity,
        recommendedAction
      });

      toast.success('Finding created successfully');
      resetForm();
      loadFindings();
    } catch (error) {
      toast.error('Failed to create finding');
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setFindingType(FindingType.COMPLIANT);
    setTitle('');
    setDescription('');
    setSeverity('Low');
    setRecommendedAction('');
  };

  const getFindingTypeColor = (type: FindingType) => {
    switch (type) {
      case FindingType.COMPLIANT:
        return 'bg-success/10 text-success';
      case FindingType.MINOR_ISSUE:
        return 'bg-warning/10 text-warning';
      case FindingType.MAJOR_ISSUE:
      case FindingType.POSSIBLE_VIOLATION:
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getSeverityColor = (sev: string) => {
    switch (sev) {
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
      {/* Add Finding Button */}
      {!showForm && (
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Finding
        </Button>
      )}

      {/* Add Finding Form */}
      {showForm && (
        <div className="space-y-4 p-4 border rounded-lg bg-accent/50">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Add Finding</h3>
            <Button variant="ghost" size="sm" onClick={resetForm}>
              Cancel
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Finding Type</Label>
            <Select value={findingType} onValueChange={(value) => setFindingType(value as FindingType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={FindingType.COMPLIANT}>Compliant</SelectItem>
                <SelectItem value={FindingType.MINOR_ISSUE}>Minor Issue</SelectItem>
                <SelectItem value={FindingType.MAJOR_ISSUE}>Major Issue</SelectItem>
                <SelectItem value={FindingType.POSSIBLE_VIOLATION}>Possible Violation</SelectItem>
                <SelectItem value={FindingType.INFORMATION_ONLY}>Information Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief summary of the finding"
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of the finding..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Severity</Label>
            <Select value={severity} onValueChange={(value: any) => setSeverity(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Recommended Action (Optional)</Label>
            <Textarea
              value={recommendedAction}
              onChange={(e) => setRecommendedAction(e.target.value)}
              placeholder="Suggested actions to address this finding..."
              rows={2}
            />
          </div>

          <Button onClick={handleCreate} disabled={creating}>
            {creating ? 'Creating...' : 'Create Finding'}
          </Button>
        </div>
      )}

      {/* Findings List */}
      <div className="space-y-3">
        <h3 className="font-medium">Recorded Findings ({findings.length})</h3>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : findings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No findings recorded yet
          </div>
        ) : (
          <div className="space-y-3">
            {findings.map((finding) => (
              <div
                key={finding.id}
                className="p-4 border rounded-lg space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getFindingTypeColor(finding.findingType)}>
                        {finding.findingType.replace('_', ' ')}
                      </Badge>
                      <Badge className={getSeverityColor(finding.severity)}>
                        {finding.severity}
                      </Badge>
                      {finding.isViolationCreated && (
                        <Badge variant="outline" className="bg-primary/10 text-primary">
                          Violation Created
                        </Badge>
                      )}
                    </div>
                    <div className="font-medium">{finding.title}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {finding.description}
                    </div>
                    {finding.recommendedAction && (
                      <div className="text-sm text-muted-foreground mt-2">
                        <span className="font-medium">Recommended: </span>
                        {finding.recommendedAction}
                      </div>
                    )}
                  </div>

                  {!finding.isViolationCreated && 
                    (finding.findingType === FindingType.POSSIBLE_VIOLATION || 
                     finding.findingType === FindingType.MAJOR_ISSUE) && (
                    <Button
                      size="sm"
                      onClick={() => setSelectedFinding(finding)}
                    >
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Create Violation
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedFinding && (
        <CreateViolationFromFindingDialog
          finding={selectedFinding}
          visit={visit}
          planItem={planItem}
          employerId={employerId}
          employerName={visit.employerName}
          open={!!selectedFinding}
          onOpenChange={(open) => !open && setSelectedFinding(null)}
          onViolationCreated={() => {
            setSelectedFinding(null);
            loadFindings();
          }}
        />
      )}
    </div>
  );
}
