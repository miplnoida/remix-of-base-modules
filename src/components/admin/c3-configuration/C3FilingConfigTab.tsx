import { useGroupedC3Configs } from '@/hooks/useC3CalculationConfig';
import { C3ConfigCategoryCard } from '@/components/admin/c3-config/C3ConfigCategoryCard';
import { Loader2 } from 'lucide-react';

export function C3FilingConfigTab() {
  const { groupedConfigs, isLoading, error } = useGroupedC3Configs();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
        <p className="font-medium">Failed to load configuration</p>
        <p className="text-sm mt-1">{(error as Error).message}</p>
      </div>
    );
  }

  const filingGroup = groupedConfigs.find(g => g.category === 'filing');

  if (!filingGroup) {
    return (
      <div className="text-muted-foreground text-center py-8">
        No filing configuration found.
      </div>
    );
  }

  return <C3ConfigCategoryCard group={filingGroup} />;
}
