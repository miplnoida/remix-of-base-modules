import { useQuery } from '@tanstack/react-query';
import {
  getAward360Header,
  getAwardPensioner,
  getAwardClaim,
  getAwardProduct,
  listAwardBeneficiaries,
  listAwardSchedules,
  listAwardPayments,
  listAwardLifeCertificates,
  listAwardMedicalReviews,
  listAwardSuspensions,
  listAwardOverpayments,
  listAwardCommunications,
  listAwardAudit,
  getAward360OverviewCounts,
} from '@/services/bn/awards/award360Service';

const k = (id: string, tab: string) => ['award360', id, tab] as const;

export const useAward360Header = (id: string) =>
  useQuery({ queryKey: k(id, 'header'), queryFn: () => getAward360Header(id), enabled: !!id });

export const useAward360Overview = (
  id: string,
  enabled = true,
  opts: import('@/services/bn/awards/award360Service').Award360OverviewOptions = {},
) =>
  useQuery({
    queryKey: ['award360', id, 'overview', opts] as const,
    queryFn: () => getAward360OverviewCounts(id, opts),
    enabled: !!id && enabled,
  });

export const useAwardPensioner = (id: string, enabled = true) =>
  useQuery({ queryKey: k(id, 'pensioner'), queryFn: () => getAwardPensioner(id), enabled: !!id && enabled });

export const useAwardClaim = (id: string, enabled = true) =>
  useQuery({ queryKey: k(id, 'claim'), queryFn: () => getAwardClaim(id), enabled: !!id && enabled });

export const useAwardProduct = (id: string, enabled = true) =>
  useQuery({ queryKey: k(id, 'product'), queryFn: () => getAwardProduct(id), enabled: !!id && enabled });

export const useAwardBeneficiaries = (id: string, enabled = true) =>
  useQuery({
    queryKey: k(id, 'beneficiaries'),
    queryFn: () => listAwardBeneficiaries(id),
    enabled: !!id && enabled,
  });

export const useAwardSchedules = (id: string, enabled = true) =>
  useQuery({ queryKey: k(id, 'schedule'), queryFn: () => listAwardSchedules(id), enabled: !!id && enabled });

export const useAwardPayments = (id: string, enabled = true) =>
  useQuery({ queryKey: k(id, 'payments'), queryFn: () => listAwardPayments(id), enabled: !!id && enabled });

export const useAwardLifeCertificates = (id: string, enabled = true) =>
  useQuery({
    queryKey: k(id, 'life-certificates'),
    queryFn: () => listAwardLifeCertificates(id),
    enabled: !!id && enabled,
  });

export const useAwardMedicalReviews = (id: string, enabled = true) =>
  useQuery({
    queryKey: k(id, 'medical'),
    queryFn: () => listAwardMedicalReviews(id),
    enabled: !!id && enabled,
  });

export const useAwardSuspensions = (id: string, enabled = true) =>
  useQuery({
    queryKey: k(id, 'suspensions'),
    queryFn: () => listAwardSuspensions(id),
    enabled: !!id && enabled,
  });

export const useAwardOverpayments = (id: string, enabled = true) =>
  useQuery({
    queryKey: k(id, 'overpayments'),
    queryFn: () => listAwardOverpayments(id),
    enabled: !!id && enabled,
  });

export const useAwardCommunications = (id: string, enabled = true) =>
  useQuery({
    queryKey: k(id, 'communications'),
    queryFn: () => listAwardCommunications(id),
    enabled: !!id && enabled,
  });

export const useAwardAudit = (id: string, includeCentral: boolean, enabled = true) =>
  useQuery({
    queryKey: k(id, `audit:${includeCentral ? 'central' : 'local'}`),
    queryFn: () => listAwardAudit(id, { includeCentralAudit: includeCentral }),
    enabled: !!id && enabled,
  });

// BN-AWARD360-B1 — paged/filtered hooks.
import {
  listAwardSchedulesPaged,
  listAwardPaymentsPaged,
  listAwardLifeCertificatesPaged,
  getAwardScheduleDetail,
  getAwardLifeCertificateReminders,
  type AwardScheduleQuery,
  type AwardPaymentQuery,
  type AwardLifeCertificateQuery,
} from '@/services/bn/awards/award360Service';

export const useAwardSchedulesPaged = (query: AwardScheduleQuery, enabled = true) =>
  useQuery({
    queryKey: ['award360', query.awardId, 'schedule-paged', query],
    queryFn: () => listAwardSchedulesPaged(query),
    enabled: !!query.awardId && enabled,
  });

export const useAwardPaymentsPaged = (query: AwardPaymentQuery, enabled = true) =>
  useQuery({
    queryKey: ['award360', query.awardId, 'payments-paged', query],
    queryFn: () => listAwardPaymentsPaged(query),
    enabled: !!query.awardId && enabled,
  });

export const useAwardLifeCertificatesPaged = (
  query: AwardLifeCertificateQuery,
  award: { status?: string | null; awardType?: string | null } | null,
  enabled = true,
) =>
  useQuery({
    queryKey: ['award360', query.awardId, 'life-cert-paged', query],
    queryFn: () => listAwardLifeCertificatesPaged(query, award),
    enabled: !!query.awardId && enabled,
  });

export const useAwardScheduleDetail = (rowId: string | null) =>
  useQuery({
    queryKey: ['award360', 'schedule-detail', rowId],
    queryFn: () => getAwardScheduleDetail(rowId as string),
    enabled: !!rowId,
  });

export const useAwardLifeCertReminders = (awardId: string, enabled = true) =>
  useQuery({
    queryKey: ['award360', awardId, 'life-cert-reminders'],
    queryFn: () => getAwardLifeCertificateReminders(awardId),
    enabled: !!awardId && enabled,
  });

// BN-AWARD360-B2 — paged/detail hooks for beneficiaries, overpayments, comms.
import {
  listAwardBeneficiariesPaged,
  getAwardBeneficiaryDetail,
  listAwardOverpaymentsPaged,
  getAwardOverpaymentDetail,
  listAwardCommunicationsPaged,
  getAwardCommunicationDetail,
  type AwardBeneficiaryQuery,
  type AwardOverpaymentQuery,
  type AwardCommunicationQuery,
} from '@/services/bn/awards/award360Service';

export const useAwardBeneficiariesPaged = (
  query: AwardBeneficiaryQuery,
  award: { baseAmount?: number | null; awardType?: string | null } | null,
  enabled = true,
) =>
  useQuery({
    queryKey: ['award360', query.awardId, 'beneficiaries-paged', query],
    queryFn: () => listAwardBeneficiariesPaged(query, award),
    enabled: !!query.awardId && enabled,
  });

export const useAwardBeneficiaryDetail = (id: string | null, enabled = true) =>
  useQuery({
    queryKey: ['award360', 'beneficiary-detail', id],
    queryFn: () => getAwardBeneficiaryDetail(id as string),
    enabled: !!id && enabled,
  });

export const useAwardOverpaymentsPaged = (query: AwardOverpaymentQuery, enabled = true) =>
  useQuery({
    queryKey: ['award360', query.awardId, 'overpayments-paged', query],
    queryFn: () => listAwardOverpaymentsPaged(query),
    enabled: !!query.awardId && enabled,
  });

export const useAwardOverpaymentDetail = (id: string | null, enabled = true) =>
  useQuery({
    queryKey: ['award360', 'overpayment-detail', id],
    queryFn: () => getAwardOverpaymentDetail(id as string),
    enabled: !!id && enabled,
  });

export const useAwardCommunicationsPaged = (query: AwardCommunicationQuery, enabled = true) =>
  useQuery({
    queryKey: ['award360', query.awardId, 'communications-paged', query],
    queryFn: () => listAwardCommunicationsPaged(query),
    enabled: !!query.awardId && enabled,
  });

export const useAwardCommunicationDetail = (
  id: string | null,
  opts: { canViewContent?: boolean } = {},
  enabled = true,
) =>
  useQuery({
    queryKey: ['award360', 'communication-detail', id, opts.canViewContent ?? false],
    queryFn: () => getAwardCommunicationDetail(id as string, opts),
    enabled: !!id && enabled,
  });
