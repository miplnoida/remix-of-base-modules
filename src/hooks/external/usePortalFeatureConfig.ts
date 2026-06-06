import { useQuery } from '@tanstack/react-query';
import { getPortalFeatureConfig, type PortalFeatureConfig } from '@/services/external/portalFeatureConfigService';

export function usePortalFeatureConfig() {
  return useQuery<PortalFeatureConfig>({
    queryKey: ['external-portal-feature-config'],
    queryFn: getPortalFeatureConfig,
    staleTime: 60_000,
  });
}
