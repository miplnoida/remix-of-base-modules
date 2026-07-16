/**
 * BN-AWARD360-B3D — Query hooks for deep views.
 */
import { useQuery } from '@tanstack/react-query';
import {
  getAwardPensionerDeep,
  getAwardClaimDeep,
  getAwardProductDeep,
  type PensionerAccess,
  type ClaimAccess,
  type ProductAccess,
} from '@/services/bn/awards/award360DeepService';

export const useAwardPensionerDeep = (awardId: string, access: PensionerAccess, enabled = true) =>
  useQuery({
    queryKey: ['award360', awardId, 'pensioner-deep', access],
    queryFn: () => getAwardPensionerDeep(awardId, access),
    enabled: !!awardId && enabled,
  });

export const useAwardClaimDeep = (awardId: string, access: ClaimAccess, enabled = true) =>
  useQuery({
    queryKey: ['award360', awardId, 'claim-deep', access],
    queryFn: () => getAwardClaimDeep(awardId, access),
    enabled: !!awardId && enabled,
  });

export const useAwardProductDeep = (awardId: string, access: ProductAccess, enabled = true) =>
  useQuery({
    queryKey: ['award360', awardId, 'product-deep', access],
    queryFn: () => getAwardProductDeep(awardId, access),
    enabled: !!awardId && enabled,
  });
