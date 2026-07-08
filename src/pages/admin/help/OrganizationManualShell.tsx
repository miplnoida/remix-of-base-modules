/**
 * Organisation Management — User Manual shell.
 * Left sub-nav (grouped) + Outlet + Print / Export PDF button.
 * When the slug in the URL matches a `_manualNav` entry, ManualPage renders
 * it via react-markdown. When the URL is `/print`, all pages render inline
 * for a single-shot Export PDF (window.print()).
 *
 * Documentation only — no changes to existing routes or features.
 */
import { Suspense, useMemo } from 'react';
import { NavLink, Outlet, useLocation, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer, BookOpen, Download, FileText, FileType } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MANUAL_ENTRIES, MANUAL_GROUPS, getManualEntry } from './manual/_manualNav';
import { getManualContent } from './manual/content';
import { getBusinessCase, renderBusinessCaseMarkdown } from './manual/businessCases';
import { exportManualAsPdf, exportManualAsDocx } from './manual/manualExport';
import './manual/manual-print.css';

const MANUAL_BASE = '/admin/help/organization-management';

export default function OrganizationManualShell() {
  const params = useParams<{ slug?: string }>();
  const location = useLocation();

  const isPrintAll = location.pathname.endsWith('/print');

  const activeSlug =
    params.slug ?? (isPrintAll ? '__print__' : MANUAL_ENTRIES[0].slug);
  const activeEntry = getManualEntry(activeSlug);

  const grouped = useMemo(
    () =>
      MANUAL_GROUPS.map((g) => ({
        group: g,
        items: MANUAL_ENTRIES.filter((e) => e.group === g),
      })),
    [],
  );

  return (
    <div className="container mx-auto p-6 manual-shell">
      <PageHeader
        title="Organisation Management — User Manual"
        subtitle="How to configure Organisation Management and how business modules consume its settings."
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Help', href: MANUAL_BASE },
          { label: activeEntry?.label ?? (isPrintAll ? 'Print' : 'Overview') },
        ]}
        actions={
          <div className="flex gap-2 no-print" data-print-hide="true">
            <Button asChild variant="outline" size="sm">
              <a href={`${MANUAL_BASE}/print`}>
                <BookOpen className="mr-1 h-4 w-4" />
                Full manual
              </a>
            </Button>
            <Button size="sm" onClick={() => window.print()}>
              <Printer className="mr-1 h-4 w-4" />
              Print / Export PDF
            </Button>
          </div>
        }
      />

      <div className="mt-4 grid grid-cols-12 gap-4">
        <aside
          className="col-span-12 md:col-span-3 manual-nav no-print"
          data-print-hide="true"
        >
          <Card>
            <CardContent className="p-3">
              <nav className="space-y-4">
                {grouped.map(({ group, items }) => (
                  <div key={group}>
                    <div className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {group}
                    </div>
                    <ul className="space-y-0.5">
                      {items.map((entry) => (
                        <li key={entry.slug}>
                          <NavLink
                            to={`${MANUAL_BASE}/${entry.slug}`}
                            className={({ isActive }) =>
                              `block rounded px-2 py-1 text-sm transition-colors ${
                                isActive
                                  ? 'bg-primary text-primary-foreground'
                                  : 'hover:bg-muted'
                              }`
                            }
                          >
                            {entry.label}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </nav>
            </CardContent>
          </Card>
        </aside>

        <main className="col-span-12 md:col-span-9 manual-content">
          <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
            {isPrintAll ? <PrintAll /> : <Outlet />}
          </Suspense>
        </main>
      </div>
    </div>
  );
}

/** Print-all view: renders every manual page inline for a single Export PDF. */
function PrintAll() {
  return (
    <div className="space-y-6">
      {MANUAL_ENTRIES.map((entry) => {
        const body = getManualContent(entry.slug) ?? '';
        return (
          <Card key={entry.slug} className="manual-page">
            <CardContent className="p-6">
              <div className="text-xs text-muted-foreground mb-2">{entry.group}</div>
              <article className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{body}</ReactMarkdown>
              </article>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
