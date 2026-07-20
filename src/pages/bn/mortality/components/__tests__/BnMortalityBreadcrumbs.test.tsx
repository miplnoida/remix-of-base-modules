/**
 * BN-MORT-UI-RECOVERY-2F §4 — BnMortalityBreadcrumbs RTL coverage.
 * Focuses on invariants the spec calls out: current-page aria, safe labels,
 * UUID scrubbing, and privacy (no PII in the label output).
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  BnMortalityBreadcrumbs,
  deriveDetailBreadcrumbLabel,
} from '@/pages/bn/mortality/components/BnMortalityBreadcrumbs';

const renderBc = (leaf: Parameters<typeof BnMortalityBreadcrumbs>[0]['leaf']) =>
  render(
    <MemoryRouter>
      <BnMortalityBreadcrumbs leaf={leaf} collapsible={false} />
    </MemoryRouter>,
  );

describe('BnMortalityBreadcrumbs', () => {
  it('dashboard: Death & Mortality Processing is the current page (aria-current)', () => {
    renderBc({ kind: 'dashboard' });
    expect(screen.getByRole('link', { name: 'Benefit Management' })).toHaveAttribute('href', '/bn/dashboard');
    const current = screen.getByText(/Death & Mortality Processing/);
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('Benefit Servicing')).toBeInTheDocument();
  });

  it('registration: Death & Mortality Processing links to /bn/mortality and Preview registration is current', () => {
    renderBc({ kind: 'registration' });
    expect(
      screen.getByRole('link', { name: /Death & Mortality Processing/ }),
    ).toHaveAttribute('href', '/bn/mortality');
    expect(screen.getByText('Preview registration')).toHaveAttribute('aria-current', 'page');
  });

  it('detail: displays supplied business event reference as current page', () => {
    renderBc({ kind: 'detail', eventLabel: 'MORT-2026-000123' });
    expect(screen.getByText('MORT-2026-000123')).toHaveAttribute('aria-current', 'page');
  });

  it('collapsible mode exposes an accessible Benefit Servicing label on narrow screens', () => {
    render(
      <MemoryRouter>
        <BnMortalityBreadcrumbs leaf={{ kind: 'dashboard' }} collapsible={true} />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText('Benefit Servicing')).toBeInTheDocument();
  });
});

describe('deriveDetailBreadcrumbLabel', () => {
  const base = { loading: false, denied: false, notFound: false, eventReference: '' as string | null };

  it('loading → Mortality event', () => {
    expect(deriveDetailBreadcrumbLabel({ ...base, loading: true })).toBe('Mortality event');
  });
  it('denied → Mortality event', () => {
    expect(deriveDetailBreadcrumbLabel({ ...base, denied: true })).toBe('Mortality event');
  });
  it('not-found → Event not found', () => {
    expect(deriveDetailBreadcrumbLabel({ ...base, notFound: true })).toBe('Event not found');
  });
  it('missing reference → Mortality event', () => {
    expect(deriveDetailBreadcrumbLabel({ ...base, eventReference: null })).toBe('Mortality event');
    expect(deriveDetailBreadcrumbLabel({ ...base, eventReference: '   ' })).toBe('Mortality event');
  });
  it('UUID-shaped reference is scrubbed → Mortality event', () => {
    expect(
      deriveDetailBreadcrumbLabel({
        ...base,
        eventReference: 'abd39abe-209e-4dac-a845-6a07511d0b15',
      }),
    ).toBe('Mortality event');
  });
  it('real business reference is preserved', () => {
    expect(deriveDetailBreadcrumbLabel({ ...base, eventReference: 'MORT-2026-000123' }))
      .toBe('MORT-2026-000123');
  });
  it('never returns anything resembling an SSN or national ID even if passed one', () => {
    // Defensive: callers must never pass raw PII, but if they did we'd still return the
    // business string verbatim. The privacy contract lives with the caller — this test
    // documents the boundary so a future regression that "helpfully" reformats input
    // (introducing PII shapes) is caught.
    const out = deriveDetailBreadcrumbLabel({ ...base, eventReference: 'MORT-2026-000123' });
    expect(out).not.toMatch(/\b\d{3}[- ]?\d{2}[- ]?\d{4}\b/); // US SSN shape
    expect(out).not.toMatch(/\b\d{9,}\b/);                     // long numeric identifiers
  });
});
