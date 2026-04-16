import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, AlertCircle } from 'lucide-react';
import { InspectionVisit, InspectionFinding, FindingType, WeeklyPlanItem } from '@/types/inspectionTypes';
import { inspectionService } from '@/services/inspectionService';
import { CreateViolationFromFindingDialog } from '../CreateViolationFromFindingDialog';
import { supabase } from '@/integrations/supabase/client';
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
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<InspectionFinding | null>(null);
  const [explanationMap, setExplanationMap] = useState<Record<string, string>>({});

  const isReadOnly = visit.visitStatus === 'COMPLETED';

  useEffect(() => {
    loadFindings();
  }, [visit.id]);

  const loadFindings = async () => {
    try {
      setLoading(true);
      const data = await inspectionService.getFindingsForVisit(visit.id);
      setFindings(data);

      // Load follow-up and explanation data from DB
      const { data: dbFindings } = await supabase
        .from('ce_inspection_findings')
        .select('id, follow_up_required, follow_up_notes, explanation_if_no_violation')
        .eq('inspection_id', visit.id);

      if (dbFindings) {
        const map: Record<string, string> = {};
        dbFindings.forEach(f => {
          if (f.explanation_if_no_violation) {
            map[f.id] = f.explanation_if_no_violation;
          }
        });
        setExplanationMap(map);

        // Merge follow-up data into findings
        setFindings(prev => prev.map(finding => {
          const dbF = dbFindings.find(d => d.id === finding.id);
          if (dbF) {
            return {
              ...finding,
              followUpRequired: dbF.follow_up_required,
              followUpNotes: dbF.follow_up_notes,
            } as any;
          }
          return finding;
        }));
      }
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
      // Create finding with follow-up info
      const { data, error } = await supabase
        .from('ce_inspection_findings')
        .insert({
          inspection_id: visit.id,
          finding_type: findingType,
          description: `${title}: ${description}`,
          severity,
          violation_created: false,
          follow_up_required: followUpRequired,
          follow_up_notes: followUpNotes || null,
          created_by: 'SYSTEM',
        })
        .select('*')
        .single();

      if (error) throw error;

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

  const handleExplanationSave = async (findingId: string, explanation: string) => {
    try {
      const { error } = await supabase
        .from('ce_inspection_findings')
        .update({
          explanation_if_no_violation: explanation || null,
          updated_at: new Date().toISOString(),
          updated_by: 'SYSTEM',
        })
        .eq('id', findingId);

      if (error) throw error;
      setExplanationMap(prev => ({ ...prev, [findingId]: explanation }));
      toast.success('Explanation saved');
    } catch (error) {
      toast.error('Failed to save explanation');
    }
  };

  const handleToggleFollowUp = async (findingId: string, value: boolean) => {
    try {
      const { error } = await supabase
        .from('ce_inspection_findings')
        .update({
          follow_up_required: value,
          updated_at: new Date().toISOString(),
          updated_by: 'SYSTEM',
        })
        .eq('id', findingId);

      if (error) throw error;
      setFindings(prev => prev.map(f =>
        f.id === findingId ? { ...f, followUpRequired: value } as any : f
      ));
    } catch (error) {
      toast.error('Failed to update follow-up status');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setFindingType(FindingType.COMPLIANT);
    setTitle('');
    setDescription('');
    setSeverity('Low');
    setRecommendedAction('');
    setFollowUpRequired(false);
    setFollowUpNotes('');
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
      {!showForm && !isReadOnly && (
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

          {/* Follow-up Toggle */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label>Follow-up Required</Label>
              <p className="text-xs text-muted-foreground">Mark if this finding needs a follow-up visit</p>
            </div>
            <Switch
              checked={followUpRequired}
              onCheckedChange={setFollowUpRequired}
            />
          </div>

          {followUpRequired && (
            <div className="space-y-2">
              <Label>Follow-up Notes</Label>
              <Textarea
                value={followUpNotes}
                onChange={(e) => setFollowUpNotes(e.target.value)}
                placeholder="What should be followed up on..."
                rows={2}
              />
            </div>
          )}

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
            {findings.map((finding) => {
              const f = finding as any;
              const needsExplanation = finding.findingType === FindingType.POSSIBLE_VIOLATION &&
                !finding.isViolationCreated && !explanationMap[finding.id];

              return (
                <div
                  key={finding.id}
                  className={`p-4 border rounded-lg space-y-2 ${needsExplanation ? 'border-destructive/40' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
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
                        {f.followUpRequired && (
                          <Badge variant="outline" className="bg-amber-100 text-amber-800">
                            Follow-up Required
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

                    <div className="flex flex-col gap-1">
                      {!finding.isViolationCreated &&
                        (finding.findingType === FindingType.POSSIBLE_VIOLATION ||
                         finding.findingType === FindingType.MAJOR_ISSUE) && !isReadOnly && (
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

                  {/* Follow-up toggle on existing findings */}
                  {!isReadOnly && (
                    <div className="flex items-center gap-3 pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={f.followUpRequired ?? false}
                          onCheckedChange={(v) => handleToggleFollowUp(finding.id, v)}
                        />
                        <span className="text-xs text-muted-foreground">Follow-up</span>
                      </div>
                    </div>
                  )}

                  {/* Explanation for unconverted POSSIBLE_VIOLATION */}
                  {finding.findingType === FindingType.POSSIBLE_VIOLATION &&
                    !finding.isViolationCreated && (
                    <div className="pt-2 border-t space-y-2">
                      <Label className="text-xs text-destructive">
                        {explanationMap[finding.id]
                          ? 'Explanation for not creating violation:'
                          : '⚠ Why is this not converted to a violation? (Required)'}
                      </Label>
                      {!isReadOnly ? (
                        <div className="flex gap-2">
                          <Textarea
                            value={explanationMap[finding.id] ?? ''}
                            onChange={(e) => setExplanationMap(prev => ({ ...prev, [finding.id]: e.target.value }))}
                            placeholder="Explain why this finding is not being converted to a violation..."
                            rows={2}
                            className="flex-1"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleExplanationSave(finding.id, explanationMap[finding.id] || '')}
                            disabled={!explanationMap[finding.id]?.trim()}
                          >
                            Save
                          </Button>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {explanationMap[finding.id] || 'No explanation provided'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
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
