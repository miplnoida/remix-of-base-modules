import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "./StatusBadge";
import { TypeBadge } from "./TypeBadge";
import { MockCase } from "@/data/mockLegalCases";
import { Calendar, User, Clock } from "lucide-react";

interface CaseCardProps {
  case: MockCase;
  onClick: () => void;
}

export function CaseCard({ case: caseData, onClick }: CaseCardProps) {
  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow rounded-2xl"
      onClick={onClick}
      role="article"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`Case ${caseData.number}: ${caseData.title}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-mono text-muted-foreground">{caseData.number}</p>
            <h3 className="font-semibold text-base leading-tight mt-1 line-clamp-2">
              {caseData.title}
            </h3>
          </div>
          <StatusBadge status={caseData.status} />
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {caseData.parties.map((party, idx) => (
            <Badge key={idx} variant="outline" className="text-xs">
              {party}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TypeBadge type={caseData.type} />
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground justify-end">
            <User className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="text-xs truncate">{caseData.assignee}</span>
          </div>
          {caseData.next_event_at && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="text-xs">{new Date(caseData.next_event_at).toLocaleDateString()}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-muted-foreground justify-end">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="text-xs">{caseData.age_days} days</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
