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

export const useAward360Overview = (id: string, enabled = true) =>
  useQuery({
    queryKey: k(id, 'overview'),
    queryFn: () => getAward360OverviewCounts(id),
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
