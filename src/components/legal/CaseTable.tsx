import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "./StatusBadge";
import { MockCase } from "@/data/mockLegalCases";

interface CaseTableProps {
  cases: MockCase[];
  onCaseClick: (id: string) => void;
}

export function CaseTable({ cases, onCaseClick }: CaseTableProps) {
  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-semibold">Case #</TableHead>
            <TableHead className="font-semibold">Title</TableHead>
            <TableHead className="font-semibold">Type</TableHead>
            <TableHead className="font-semibold">Parties</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Stage</TableHead>
            <TableHead className="font-semibold">Next Event</TableHead>
            <TableHead className="font-semibold">Assignee</TableHead>
            <TableHead className="font-semibold text-right">Age</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cases.map((caseData) => (
            <TableRow 
              key={caseData.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onCaseClick(caseData.id)}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onCaseClick(caseData.id);
                }
              }}
              role="button"
              aria-label={`View case ${caseData.number}`}
            >
              <TableCell className="font-mono text-sm font-medium">
                {caseData.number}
              </TableCell>
              <TableCell className="max-w-md">
                <div className="line-clamp-2 text-sm">{caseData.title}</div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="text-xs">
                  {caseData.type}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {caseData.parties.slice(0, 2).map((party, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {party}
                    </Badge>
                  ))}
                  {caseData.parties.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{caseData.parties.length - 2}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <StatusBadge status={caseData.status} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {caseData.stage}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {caseData.next_event_at 
                  ? new Date(caseData.next_event_at).toLocaleDateString()
                  : '—'}
              </TableCell>
              <TableCell className="text-sm">
                {caseData.assignee}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground text-right">
                {caseData.age_days}d
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
