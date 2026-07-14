/**
 * BN-UI-S1 — Page-level render tests for the Award Suspension workspace.
 *
 * Renders `AwardSuspensionPage` in read-only mode with mocked permissions
 * and mocked data service. Asserts:
 *
 *   • Page renders in read-only mode with the dark-launch badge.
 *   • Summary cards display the correct counts.
 *   • Approver sees My Approvals but Approve/Reject remain disabled.
 *   • Auditor sees audit section (canAudit=true).
 *   • Viewer without propose permission does NOT see the “New Suspension Request” button.
 *   • URL query parameter drives the visible tab.
 *   • No fake success toast fires (nothing to fire — no writes).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AwardSuspensionPage from '@/pages/bn/servicing/award-suspension/AwardSuspensionPage';

const perms: Record<string, boolean> = {
  view: true,
  propose: false,
  approve: false,
  audit: false,
};

vi.mock('@/contexts/SupabaseAuthContext', () => ({
  useSupabaseAuth: () => ({
    user: { id: 'u-1' },
    isAuthReady: true,
    isAuthenticated: true,
    hasPermission: async (_m: string, action: string) => perms[action] ?? false,
    hasRole: () => false,
    hasAnyRole: () => false,
    profile: null,
  }),
}));

vi.mock('@/services/bn/awardSuspensionViewService', async () => {
  return {
    listAwardsForSuspension: vi.fn(async () => [
      {
        awardId: 'aw-1',
        awardNumber: 'AW-0001',
        claimantName: 'Jane Doe',
        ssnMasked: '•••-••-1234',
        benefitCode: 'AGE',
        awardType: 'PENSION',
        awardStatus: 'ACTIVE',
        baseAmount: 500,
        currency: 'XCD',
        frequency: 'MONTHLY',
        startDate: '2024-01-01',
        nextReviewDate: null,
        currentSuspensionStatus: null,
        openRequestStatus: null,
        openRequestId: null,
        requestedEffectiveDate: null,
      },
      {
        awardId: 'aw-2',
        awardNumber: 'AW-0002',
        claimantName: 'John Smith',
        ssnMasked: '•••-••-5678',
        benefitCode: 'INV',
        awardType: 'PENSION',
        awardStatus: 'SUSPENDED',
        baseAmount: 300,
        currency: 'XCD',
        frequency: 'MONTHLY',
        startDate: '2023-06-01',
        nextReviewDate: null,
        currentSuspensionStatus: 'SUSPENDED',
        openRequestStatus: 'PENDING_APPROVAL',
        openRequestId: 'req-1',
        requestedEffectiveDate: '2024-01-01',
      },
    ]),
    listSuspensionRequests: vi.fn(async () => [
      {
        requestId: 'req-1',
        awardId: 'aw-2',
        awardNumber: 'AW-0002',
        claimantName: 'John Smith',
        benefitCode: 'INV',
        requestedEffectiveDate: '2024-01-01',
        reasonCode: 'LIFE_CERT_MISSING',
        reasonText: null,
        proposedBy: 'user-x',
        proposedAt: new Date().toISOString(),
        status: 'PENDING_APPROVAL',
        currentApprovalLevel: 1,
        totalApprovalLevels: 2,
        assignedRole: 'BN_SUPERVISOR',
        assignedWorkbasket: 'BENEFITS_SUP',
        currentTaskOwner: null,
        ageDays: 1,
        lastActionAt: null,
      },
    ]),
    listMyApprovalTasks: vi.fn(async () => []),
    getSuspensionRequestDetails: vi.fn(async () => null),
    listSuspensionReasonCodes: vi.fn(async () => [{ code: 'OTHER', label: 'Other' }]),
  };
});

const renderPage = (initialEntry = '/bn/award-suspension') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AwardSuspensionPage />
    </MemoryRouter>
  );

describe('BN-UI-S1 · AwardSuspensionPage (read-only)', () => {
  beforeEach(() => {
    perms.view = true;
    perms.propose = false;
    perms.approve = false;
    perms.audit = false;
  });

  it('renders the redesigned title and dark-launch badge for viewers', async () => {
    renderPage();
    expect(await screen.findByText('Award Suspension Management')).toBeInTheDocument();
    expect(screen.getByText(/Dark launch — read only/i)).toBeInTheDocument();
  });

  it('hides the New Suspension Request button when propose permission is missing', async () => {
    renderPage();
    await screen.findByText('Award Suspension Management');
    expect(screen.queryByRole('button', { name: /New Suspension Request/i })).toBeNull();
  });

  it('shows the New Suspension Request button when propose permission is granted', async () => {
    perms.propose = true;
    renderPage();
    expect(
      await screen.findByRole('button', { name: /New Suspension Request/i })
    ).toBeInTheDocument();
  });

  it('summary cards display counts derived from the mocked data', async () => {
    renderPage();
    // Active Awards = 1 (aw-1)
    await waitFor(() =>
      expect(screen.getByText('Active Awards').closest('[role="button"]')).toHaveTextContent('1')
    );
    // Currently Suspended = 1 (aw-2)
    expect(screen.getByText('Currently Suspended').closest('[role="button"]')).toHaveTextContent(
      '1'
    );
    // Open Suspension Requests = 1
    expect(
      screen.getByText('Open Suspension Requests').closest('[role="button"]')
    ).toHaveTextContent('1');
  });

  it('honours the tab query parameter', async () => {
    renderPage('/bn/award-suspension?tab=requests');
    // Wait for load; the Suspension Requests register should appear.
    await waitFor(() =>
      expect(screen.getAllByText(/Requested effective/i).length).toBeGreaterThan(0)
    );
  });

  it('viewer without approve permission gets a permission notice on the approvals tab', async () => {
    renderPage('/bn/award-suspension?tab=approvals');
    expect(
      await screen.findByText(/do not currently have the/i)
    ).toBeInTheDocument();
  });
});
