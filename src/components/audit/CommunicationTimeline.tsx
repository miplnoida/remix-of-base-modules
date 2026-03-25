import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Clock, Send, MessageSquare, AlertTriangle, Loader2 } from 'lucide-react';
import { useCommunicationTimeline, STAGE_LABELS, type CommunicationStage } from '@/hooks/useAuditCommunicationStages';
import { CommunicationStageDialog } from './CommunicationStageDialog';

interface CommunicationTimelineProps {
  engagementId: string;
  engagementName?: string;
  readOnly?: boolean;
}

function StageStatusIcon({ stage }: { stage: CommunicationStage }) {
  if (stage.completed && stage.acknowledged) return <CheckCircle2 className="h-5 w-5 text-green-600" />;
  if (stage.completed) return <CheckCircle2 className="h-5 w-5 text-blue-500" />;
  if (stage.is_mandatory) return <AlertTriangle className="h-5 w-5 text-amber-500" />;
  return <Circle className="h-5 w-5 text-muted-foreground" />;
}

function StageStatusBadge({ stage }: { stage: CommunicationStage }) {
  if (stage.completed && stage.acknowledged) return <Badge className="bg-green-100 text-green-800 border-green-300 text-[10px]">Acknowledged</Badge>;
  if (stage.completed) return <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-[10px]">Sent</Badge>;
  if (stage.is_mandatory) return <Badge variant="destructive" className="text-[10px]">Required</Badge>;
  return <Badge variant="outline" className="text-[10px]">Optional</Badge>;
}

export function CommunicationTimeline({ engagementId, engagementName, readOnly }: CommunicationTimelineProps) {
  const { data: stages = [], isLoading } = useCommunicationTimeline(engagementId);
  const [sendStage, setSendStage] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
          <span className="text-sm text-muted-foreground">Loading timeline...</span>
        </CardContent>
      </Card>
    );
  }

  const completedCount = stages.filter(s => s.completed).length;
  const mandatoryCount = stages.filter(s => s.is_mandatory).length;
  const mandatoryCompleted = stages.filter(s => s.is_mandatory && s.completed).length;

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Auditee Communication Lifecycle
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">
                {completedCount}/{stages.length} stages
              </Badge>
              <Badge className={`text-[10px] ${mandatoryCompleted === mandatoryCount ? 'bg-green-100 text-green-800 border-green-300' : 'bg-amber-100 text-amber-800 border-amber-300'}`}>
                {mandatoryCompleted}/{mandatoryCount} mandatory
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[18px] top-3 bottom-3 w-px bg-border" />

            <div className="space-y-1">
              {stages.map((stage, idx) => (
                <div key={stage.stage_code + idx} className="relative flex items-start gap-3 pl-1 py-2">
                  <div className="relative z-10 bg-background p-0.5 shrink-0">
                    <StageStatusIcon stage={stage} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium truncate">
                          {STAGE_LABELS[stage.stage_code] || stage.stage_code}
                        </span>
                        <StageStatusBadge stage={stage} />
                      </div>
                      {!readOnly && !stage.completed && stage.stage_code !== 'QUERY_CYCLE' && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs shrink-0" onClick={() => setSendStage(stage.stage_code)}>
                          <Send className="h-3 w-3 mr-1" /> Send
                        </Button>
                      )}
                      {!readOnly && stage.stage_code === 'QUERY_CYCLE' && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs shrink-0" onClick={() => setSendStage(stage.stage_code)}>
                          <Send className="h-3 w-3 mr-1" /> New Query
                        </Button>
                      )}
                    </div>

                    {/* Show entries */}
                    {stage.entries.length > 0 && (
                      <div className="mt-1 space-y-1">
                        {stage.entries.map((entry) => (
                          <div key={entry.id} className="text-xs text-muted-foreground flex items-center gap-2 pl-1">
                            <Clock className="h-3 w-3 shrink-0" />
                            <span>{entry.sent_at ? new Date(entry.sent_at).toLocaleDateString() : '-'}</span>
                            <span>→</span>
                            <span className="truncate">{entry.recipient_name || entry.recipient_email || '-'}</span>
                            {entry.template_name && <Badge variant="outline" className="text-[9px] h-4">{entry.template_name}</Badge>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {sendStage && (
        <CommunicationStageDialog
          engagementId={engagementId}
          engagementName={engagementName}
          stageCode={sendStage}
          open={!!sendStage}
          onClose={() => setSendStage(null)}
        />
      )}
    </>
  );
}
