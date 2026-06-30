/**
 * publicBenefitApiClient — thin fetch wrapper around the public-benefits
 * edge function. Used by all three external portals (Claimant, Employer,
 * Doctor). Never imports any Internal BN service.
 */
import { supabase } from '@/integrations/supabase/client';

const PROJECT_REF = 'xynceskeiiisiefqlgxo';
const BASE = `https://${PROJECT_REF}.supabase.co/functions/v1/public-benefits`;

export type PortalRole = 'CLAIMANT' | 'EMPLOYER' | 'DOCTOR';

export interface ApiOptions {
  /** Override the session bearer with a one-time secure task token. */
  taskToken?: string;
  /** AbortSignal for in-flight cancellation. */
  signal?: AbortSignal;
}

async function authHeaders(opts?: ApiOptions): Promise<HeadersInit> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts?.taskToken) {
    headers['X-Task-Token'] = opts.taskToken;
    return headers;
  }
  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token) headers['Authorization'] = `Bearer ${data.session.access_token}`;
  return headers;
}

async function request<T>(path: string, init: RequestInit = {}, opts?: ApiOptions): Promise<T> {
  const headers = { ...(await authHeaders(opts)), ...(init.headers as Record<string, string> | undefined) };
  // Skip the network call entirely if there's no bearer token and no task
  // token — the edge function would just return 401 and blank-screen the
  // portal. Returning an empty payload lets the caller render its empty state.
  if (!opts?.taskToken && !(headers as Record<string, string>)['Authorization']) {
    return {} as T;
  }
  const res = await fetch(`${BASE}${path}`, { ...init, headers, signal: opts?.signal });
  const text = await res.text();
  const body = text ? safeParse(text) : null;
  if (!res.ok) {
    const message = body?.error?.message ?? res.statusText ?? 'Request failed';
    const code = body?.error?.code ?? `http_${res.status}`;
    throw Object.assign(new Error(message), { code, status: res.status, body });
  }
  return body as T;
}

function safeParse(t: string) { try { return JSON.parse(t); } catch { return null; } }

// ─── Endpoints ──────────────────────────────────────────────────────
export const publicBenefitApi = {
  // Benefits (claimant intake)
  listProducts: () => request<{ products: any[] }>('/benefits/products'),
  getFormDefinition: (productCode: string, portalRole: PortalRole, opts?: ApiOptions) =>
    request<any>(`/benefits/products/${encodeURIComponent(productCode)}/form-definition?portalRole=${portalRole}`, { method: 'GET' }, opts),
  getParticipantConfig: (productCode: string) =>
    request<{ product: any; version: any; config: any; documents: any[] }>(`/benefits/products/${encodeURIComponent(productCode)}/participant-config`),
  submitApplication: (body: Record<string, any>) =>
    request<{ claimId: string; claimNumber: string }>('/benefits/applications', { method: 'POST', body: JSON.stringify(body) }),

  // Claims / awards / payments (claimant)
  listClaims: () => request<{ claims: any[] }>('/me/claims'),
  listClaimBuckets: () => request<{ own: any[]; submittedForOthers: any[]; asBeneficiary: any[]; asGuardianOrPayee: any[] }>('/me/claim-buckets'),
  getClaimStatus: (claimNumber: string) =>
    request<any>(`/claims/${encodeURIComponent(claimNumber)}/status`),
  listAwards: () => request<{ awards: any[] }>('/me/awards'),
  listPayments: () => request<{ payments: any[] }>('/me/payments'),
  getContributionHistory: () => request<{ contributions: any[] }>('/me/contributions'),
  getEmploymentHistory: () => request<{ employment: any[] }>('/me/employment'),
  getProfile: async (): Promise<{ profile: any }> => {
    try {
      return await request<{ profile: any }>('/me/profile');
    } catch (e: any) {
      // Logged-in user is not a claimant (e.g. staff previewing the portal).
      // Don't blank-screen the portal — just return an empty profile.
      if (e?.status === 403) return { profile: null };
      throw e;
    }
  },

  // Tasks (claimant / employer / doctor)
  listTasks: (opts?: ApiOptions) => request<{ tasks: any[] }>('/tasks', { method: 'GET' }, opts),
  getTask: (taskId: string, opts?: ApiOptions) => request<{ task: any; formDefinition: any; documents: any[] }>(`/tasks/${encodeURIComponent(taskId)}`, { method: 'GET' }, opts),
  submitTask: (taskId: string, body: { values: Record<string, any>; notes?: string }, opts?: ApiOptions) =>
    request<{ ok: boolean }>(`/tasks/${encodeURIComponent(taskId)}/submit`, { method: 'POST', body: JSON.stringify(body) }, opts),

  // Documents / Messages
  uploadDocument: (body: { taskId: string; fileName: string; mimeType: string; base64: string; documentTypeCode?: string }, opts?: ApiOptions) =>
    request<{ document: any }>('/documents/upload', { method: 'POST', body: JSON.stringify(body) }, opts),
  listMessages: () => request<{ messages: any[] }>('/messages'),

  // Employer
  employerProfile: () => request<{ employer: any }>('/employer/profile'),
  employerEmployees: () => request<{ employees: any[] }>('/employer/employees'),
  employerC3History: () => request<{ submissions: any[] }>('/employer/c3'),
  employerContributions: () => request<{ contributions: any[] }>('/employer/contributions'),
  employerPayments: () => request<{ payments: any[] }>('/employer/payments'),
  employerBalances: () => request<{ balances: any[] }>('/employer/balances'),
  employerNotices: () => request<{ notices: any[] }>('/employer/compliance'),

  // Doctor / Medical provider
  doctorProfile: () => request<{ provider: any }>('/doctor/profile'),
  doctorReports: () => request<{ reports: any[] }>('/doctor/reports'),
};
