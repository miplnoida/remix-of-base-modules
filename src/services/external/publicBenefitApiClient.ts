/**
 * Re-export of the shared external portal API client.
 *
 * Canonical implementation lives at `@/portals/_shared/publicBenefitApiClient`.
 * This module exists so non-portal callers (and the requested architecture
 * path) can import from `@/services/external/publicBenefitApiClient`.
 */
export {
  publicBenefitApi,
  type PortalRole,
  type ApiOptions,
} from '@/portals/_shared/publicBenefitApiClient';

import { publicBenefitApi } from '@/portals/_shared/publicBenefitApiClient';
import type { PortalRole, ApiOptions } from '@/portals/_shared/publicBenefitApiClient';

// Functional aliases matching the documented architecture contract.
export const getAvailableBenefitProducts = (_role?: PortalRole) =>
  publicBenefitApi.listProducts();
export const getApplicationFormDefinition = (productCode: string, portalRole: PortalRole, opts?: ApiOptions) =>
  publicBenefitApi.getFormDefinition(productCode, portalRole, opts);
export const submitApplication = (body: Parameters<typeof publicBenefitApi.submitApplication>[0]) =>
  publicBenefitApi.submitApplication(body);
export const getClaimStatus = (claimNumber: string) =>
  publicBenefitApi.getClaimStatus(claimNumber);
export const getExternalTasks = (_role?: PortalRole, opts?: ApiOptions) =>
  publicBenefitApi.listTasks(opts);
export const getExternalTask = (taskId: string, opts?: ApiOptions) =>
  publicBenefitApi.getTask(taskId, opts);
export const submitExternalTask = (
  taskId: string,
  payload: Parameters<typeof publicBenefitApi.submitTask>[1],
  opts?: ApiOptions,
) => publicBenefitApi.submitTask(taskId, payload, opts);
export const uploadExternalDocument = (
  payload: Parameters<typeof publicBenefitApi.uploadDocument>[0],
  opts?: ApiOptions,
) => publicBenefitApi.uploadDocument(payload, opts);
export const getExternalMessages = () => publicBenefitApi.listMessages();
