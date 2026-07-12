/**
 * CH-PERM-VERIFY-1 — Permission matrix regression tests for the
 * Communication Hub admin route gate.
 *
 * These tests exercise the CommHubAdminRoute wrapper directly with mocked
 * auth hooks. They do NOT hit Supabase, do NOT render real CH pages, and
 * cannot cause an email to send or a live gate to change.
 *
 * Matrix:
 *
 *   role                             | expected outcome
 *   ---------------------------------|-----------------------------------
 *   admin                            | children render
 *   system_administration.view only  | children render
 *   communication_hub.view only      | children render
 *   plain authenticated              | Not authorized screen
 *   unauthenticated                  | redirected to /login
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

// ---- Mocks ---------------------------------------------------------------

const authState = {
  isAuthenticated: true,
  isAuthReady: true,
  isLoading: false,
};

const adminState = { isAdmin: false };
const sysAdminState = {
  isLoading: false,
  hasPermission: (_a: string) => false,
};
const commHubState = {
  isLoading: false,
  hasPermission: (_a: string) => false,
};

vi.mock("@/contexts/SupabaseAuthContext", () => ({
  useSupabaseAuth: () => authState,
}));

vi.mock("@/hooks/useNavigationMenu", () => ({
  useIsAdmin: () => adminState.isAdmin,
  useModulePermissions: (moduleName: string) => {
    if (moduleName === "system_administration") return sysAdminState;
    if (moduleName === "communication_hub") return commHubState;
    return { isLoading: false, hasPermission: () => false };
  },
}));

// Import AFTER mocks are registered.
import { CommHubAdminRoute } from "@/components/auth/CommHubAdminRoute";

function renderGuard(path = "/admin/communication-hub/traces") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<div data-testid="login-page">login</div>} />
        <Route
          path="/admin/communication-hub/*"
          element={
            <CommHubAdminRoute>
              <div data-testid="ch-page">CH admin page</div>
            </CommHubAdminRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

function resetState() {
  authState.isAuthenticated = true;
  authState.isAuthReady = true;
  authState.isLoading = false;
  adminState.isAdmin = false;
  sysAdminState.isLoading = false;
  sysAdminState.hasPermission = () => false;
  commHubState.isLoading = false;
  commHubState.hasPermission = () => false;
}

beforeEach(resetState);

describe("CommHubAdminRoute — permission matrix", () => {
  it("admin: renders children", () => {
    adminState.isAdmin = true;
    renderGuard();
    expect(screen.getByTestId("ch-page")).toBeInTheDocument();
    expect(screen.queryByTestId("comm-hub-not-authorized")).not.toBeInTheDocument();
  });

  it("system_administration.view: renders children", () => {
    sysAdminState.hasPermission = (a) => a === "view";
    renderGuard();
    expect(screen.getByTestId("ch-page")).toBeInTheDocument();
  });

  it("communication_hub.view: renders children", () => {
    commHubState.hasPermission = (a) => a === "view";
    renderGuard();
    expect(screen.getByTestId("ch-page")).toBeInTheDocument();
  });

  it("plain authenticated user: shows Not authorized screen", () => {
    renderGuard();
    expect(screen.getByTestId("comm-hub-not-authorized")).toBeInTheDocument();
    expect(screen.queryByTestId("ch-page")).not.toBeInTheDocument();
    expect(screen.queryByTestId("login-page")).not.toBeInTheDocument();
  });

  it("unauthenticated user: redirects to /login", () => {
    authState.isAuthenticated = false;
    renderGuard();
    expect(screen.getByTestId("login-page")).toBeInTheDocument();
    expect(screen.queryByTestId("ch-page")).not.toBeInTheDocument();
  });

  it("auth still loading: shows spinner, not children, not denial", () => {
    authState.isAuthReady = false;
    authState.isLoading = true;
    renderGuard();
    expect(screen.getByTestId("comm-hub-gate-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("ch-page")).not.toBeInTheDocument();
    expect(screen.queryByTestId("comm-hub-not-authorized")).not.toBeInTheDocument();
  });

  it("permissions still loading (non-admin): shows spinner, not denial", () => {
    sysAdminState.isLoading = true;
    renderGuard();
    expect(screen.getByTestId("comm-hub-gate-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("comm-hub-not-authorized")).not.toBeInTheDocument();
  });

  it("admin never sees the denial screen even while permissions load", () => {
    adminState.isAdmin = true;
    sysAdminState.isLoading = true;
    commHubState.isLoading = true;
    renderGuard();
    expect(screen.getByTestId("ch-page")).toBeInTheDocument();
  });

  // Coverage of the intended-protection path list.
  const PROTECTED_PATHS = [
    "/admin/communication-hub",
    "/admin/communication-hub/control-center",
    "/admin/communication-hub/recipient-control",
    "/admin/communication-hub/traces",
    "/admin/communication-hub/traces/some-trace-id",
    "/admin/communication-hub/governance",
    "/admin/communication-hub/safety",
    "/admin/communication-hub/governance/send-policies",
    "/admin/communication-hub/governance/automation-settings",
    "/admin/communication-hub/pilots",
    "/admin/communication-hub/delivery-monitor",
    "/admin/communication-hub/dispatch-register",
    "/admin/communication-hub/retry-queue",
    "/admin/communication-hub/design/sender-profiles",
    "/admin/communication-hub/design/sender-verification",
  ];

  it.each(PROTECTED_PATHS)("plain user is denied on %s", (path) => {
    renderGuard(path);
    expect(screen.getByTestId("comm-hub-not-authorized")).toBeInTheDocument();
  });

  it.each(PROTECTED_PATHS)("admin is allowed on %s", (path) => {
    adminState.isAdmin = true;
    renderGuard(path);
    expect(screen.getByTestId("ch-page")).toBeInTheDocument();
  });
});
