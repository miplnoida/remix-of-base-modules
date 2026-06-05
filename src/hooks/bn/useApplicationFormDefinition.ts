import { useQuery } from '@tanstack/react-query';
import { getApplicationFormDefinition } from '@/services/bn/forms/formDefinitionService';
import type { FormChannel } from '@/services/bn/forms/sectionCatalogue';

export function useApplicationFormDefinition(
  productCode: string | undefined,
  claimDate: string | Date | undefined,
  channel: FormChannel,
) {
  const date = typeof claimDate === 'string' ? claimDate : claimDate?.toISOString().slice(0, 10);
  return useQuery({
    queryKey: ['bn', 'form-definition', productCode, date, channel],
    enabled: !!productCode && !!date,
    queryFn: () => getApplicationFormDefinition(productCode!, date!, channel),
  });
}
