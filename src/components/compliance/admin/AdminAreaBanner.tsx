/**
 * Architecture banner shown at the top of each Templates & Output admin page.
 *
 * Reinforces the separation-of-responsibilities principle:
 *   - Communication Templates own how/when/whom — channels, schedules, approvals, recipients.
 *   - Report Templates own what document is produced — sections enabled, ordering, output structure.
 *   - Shared Sections & Foundation own reusable wording — section blocks, clauses, branding, merge fields.
 *
 * Each page renders this banner with `area` set to itself; the other two areas
 * are surfaced as quick-jump links so officers always understand where a given
 * concern belongs.
 */
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, FileText, Layers, ArrowRight, Info } from 'lucide-react';

type AdminArea = 'communication' | 'report' | 'foundation';

const AREAS = {
  communication: {
    label: 'Communication Templates',
    icon: MessageSquare,
    route: '/compliance/admin/communication-templates',
    owns: 'Channel, schedule, approvals, recipients, online-response permissions.',
  },
  report: {
    label: 'Report Templates',
    icon: FileText,
    route: '/compliance/admin/report-templates',
    owns: 'Document structure: which sections, ordering, internal vs employer-facing output.',
  },
  foundation: {
    label: 'Shared Sections & Foundation',
    icon: Layers,
    route: '/compliance/admin/document-foundation',
    owns: 'Reusable section blocks, clauses, branding, merge fields, common sign-off wording.',
  },
} as const;

interface AdminAreaBannerProps {
  area: AdminArea;
}

export function AdminAreaBanner({ area }: AdminAreaBannerProps) {
  const me = AREAS[area];
  const Icon = me.icon;
  const others = (Object.entries(AREAS) as Array<[AdminArea, typeof AREAS[AdminArea]]>).filter(
    ([k]) => k !== area
  );

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="py-3">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <Icon className="h-4 w-4 text-primary shrink-0" />
            <Badge variant="secondary" className="font-medium">{me.label}</Badge>
            <span className="text-xs text-muted-foreground hidden md:inline">owns: {me.owns}</span>
          </div>
          <div className="flex items-center gap-1.5 ml-auto flex-wrap">
            <Info className="h-3 w-3 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground mr-1">For other concerns →</span>
            {others.map(([k, a]) => {
              const A = a.icon;
              return (
                <Link
                  key={k}
                  to={a.route}
                  className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border bg-background hover:bg-muted transition-colors"
                  title={a.owns}
                >
                  <A className="h-3 w-3" />
                  <span>{a.label}</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              );
            })}
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2 md:hidden">{me.owns}</p>
      </CardContent>
    </Card>
  );
}
