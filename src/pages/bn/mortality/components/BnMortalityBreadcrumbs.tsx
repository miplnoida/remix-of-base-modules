/**
 * BN-MORT-UI-RECOVERY-2D.1 §7 — Shared Mortality breadcrumbs.
 *
 * Reuses the canonical shadcn breadcrumb primitives. Never renders raw
 * UUIDs, national IDs, or deceased personal details. Callers pass a
 * pre-sanitised event reference (business ref) or a status string.
 */
import { Link } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export type BnMortalityBreadcrumbLeaf =
  | { kind: 'dashboard' }
  | { kind: 'registration' }
  | { kind: 'detail'; eventLabel: string };

interface Props {
  leaf: BnMortalityBreadcrumbLeaf;
  /** Collapse middle items on narrow screens. Defaults to true. */
  collapsible?: boolean;
}

export function BnMortalityBreadcrumbs({ leaf, collapsible = true }: Props) {
  const isDashboard = leaf.kind === 'dashboard';

  return (
    <Breadcrumb className="mb-3">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/bn/dashboard">Benefit Management</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />

        {collapsible ? (
          <>
            {/* Collapsed middle on narrow screens */}
            <BreadcrumbItem className="sm:hidden">
              <BreadcrumbEllipsis aria-label="Benefit Servicing" />
            </BreadcrumbItem>
            <BreadcrumbSeparator className="sm:hidden" />
            <BreadcrumbItem className="hidden sm:inline-flex">
              <span className="text-muted-foreground">Benefit Servicing</span>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden sm:inline-flex" />
          </>
        ) : (
          <>
            <BreadcrumbItem>
              <span className="text-muted-foreground">Benefit Servicing</span>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </>
        )}

        <BreadcrumbItem>
          {isDashboard ? (
            <BreadcrumbPage aria-current="page">Death &amp; Mortality Processing</BreadcrumbPage>
          ) : (
            <BreadcrumbLink asChild>
              <Link to="/bn/mortality">Death &amp; Mortality Processing</Link>
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>

        {leaf.kind === 'registration' && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage aria-current="page">Preview registration</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}

        {leaf.kind === 'detail' && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage aria-current="page">{leaf.eventLabel}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

/**
 * Derive a safe breadcrumb label for the detail route. Never returns a raw
 * UUID or personal identifier — always the business event_reference, a
 * loading placeholder, an access-denied placeholder or a not-found label.
 */
export function deriveDetailBreadcrumbLabel(opts: {
  loading: boolean;
  denied: boolean;
  notFound: boolean;
  eventReference: string | null | undefined;
}): string {
  if (opts.loading) return 'Mortality event';
  if (opts.denied) return 'Mortality event';
  if (opts.notFound) return 'Event not found';
  const ref = (opts.eventReference ?? '').trim();
  // Reject UUID-shaped strings — never expose them in breadcrumbs.
  const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!ref || uuidLike.test(ref)) return 'Mortality event';
  return ref;
}
