/**
 * Organisation Management — User Manual page renderer.
 * Renders a single manual page (by :slug) using react-markdown, inside the
 * OrganizationManualShell layout. Documentation only.
 */
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getManualContent } from './content';
import { getManualEntry, getPrevNext, MANUAL_ENTRIES } from './_manualNav';
import { getBusinessCase, renderBusinessCaseMarkdown } from './businessCases';

const MANUAL_BASE = '/admin/help/organization-management';

export default function ManualPage() {
  const params = useParams<{ slug?: string }>();
  const slug = params.slug ?? MANUAL_ENTRIES[0].slug;

  const entry = getManualEntry(slug);
  const body = getManualContent(slug);
  const businessCaseMd = useMemo(
    () => renderBusinessCaseMarkdown(getBusinessCase(slug)),
    [slug],
  );
  const combinedBody = useMemo(
    () => `${businessCaseMd}\n${body ?? ''}`,
    [businessCaseMd, body],
  );
  const { prev, next } = useMemo(() => getPrevNext(slug), [slug]);

  if (!entry || !body) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">
            Manual page not found: <code>{slug}</code>.
          </p>
          <Link className="text-primary underline" to={`${MANUAL_BASE}/overview`}>
            Back to Overview
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="manual-page space-y-4">
      <Card>
        <CardContent className="p-6">
          <div className="text-xs text-muted-foreground mb-2">{entry.group}</div>
          <article className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              components={{
                a: ({ href = '#', children, ...rest }) => (
                  <a
                    href={href}
                    {...rest}
                    className="text-primary underline"
                    target={href.startsWith('http') ? '_blank' : undefined}
                    rel={href.startsWith('http') ? 'noreferrer' : undefined}
                  >
                    {children}
                  </a>
                ),
                code: ({ className, children, ...rest }) => (
                  <code
                    className={`${className ?? ''} rounded bg-muted px-1 py-0.5 text-[0.85em]`}
                    {...rest}
                  >
                    {children}
                  </code>
                ),
              }}
            >
              {combinedBody}
            </ReactMarkdown>
          </article>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-2 no-print" data-print-hide="true">
        <div>
          {prev && (
            <Button asChild variant="outline" size="sm">
              <Link to={`${MANUAL_BASE}/${prev.slug}`}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                {prev.label}
              </Link>
            </Button>
          )}
        </div>
        <div>
          {next && (
            <Button asChild variant="outline" size="sm">
              <Link to={`${MANUAL_BASE}/${next.slug}`}>
                {next.label}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
