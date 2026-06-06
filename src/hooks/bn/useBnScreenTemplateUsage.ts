import { useQuery } from '@tanstack/react-query';
import { getScreenTemplateUsage } from '@/services/bn/config/configImpactService';

/**
 * Returns the impact report (product versions consuming a screen template)
 * for the Screen & Field Library "Used by" badge and jump link.
 */
export function useBnScreenTemplateUsage(templateId: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'screen-template-usage', templateId],
    queryFn: () => getScreenTemplateUsage(templateId!),
    enabled: !!templateId,
    staleTime: 30_000,
  });
}
