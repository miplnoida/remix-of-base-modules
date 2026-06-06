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
  listProducts: () => request<{ products: any[] }>('/benefits/products'),
  getFormDefinition: (productCode: string, portalRole: PortalRole, opts?: ApiOptions) =>
    request<any>(`/benefits/products/${encodeURIComponent(productCode)}/form-definition?portalRole=${portalRole}`, { method: 'GET' }, opts),
  submitApplication: (body: { productCode: string; values: Record<string, any>; claimDate?: string; declarationAccepted?: boolean }) =>
    request<{ claimId: string; claimNumber: string }>('/benefits/applications', { method: 'POST', body: JSON.stringify(body) }),
  getClaimStatus: (claimNumber: string) =>
    request<any>(`/claims/${encodeURIComponent(claimNumber)}/status`),
  listTasks: (opts?: ApiOptions) => request<{ tasks: any[] }>('/tasks', { method: 'GET' }, opts),
  getTask: (taskId: string, opts?: ApiOptions) => request<{ task: any; formDefinition: any; documents: any[] }>(`/tasks/${encodeURIComponent(taskId)}`, { method: 'GET' }, opts),
  submitTask: (taskId: string, body: { values: Record<string, any>; notes?: string }, opts?: ApiOptions) =>
    request<{ ok: boolean }>(`/tasks/${encodeURIComponent(taskId)}/submit`, { method: 'POST', body: JSON.stringify(body) }, opts),
  uploadDocument: (body: { taskId: string; fileName: string; mimeType: string; base64: string; documentTypeCode?: string }, opts?: ApiOptions) =>
    request<{ document: any }>('/documents/upload', { method: 'POST', body: JSON.stringify(body) }, opts),
  listMessages: () => request<{ messages: any[] }>('/messages'),
};
