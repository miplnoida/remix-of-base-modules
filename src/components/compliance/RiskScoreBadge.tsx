import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Shield, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';

interface RiskScoreBadgeProps {
  riskBand: string | null | undefined;
  score?: number | null;
  showScore?: boolean;
  size?: 'sm' | 'md';
}

const RISK_CONFIG: Record<string, { label: string; className: string; icon: typeof Shield }> = {
  LOW: { label: 'Low Risk', className: 'bg-green-100 text-green-800 border-green-200', icon: ShieldCheck },
  MEDIUM: { label: 'Medium Risk', className: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Shield },
  HIGH: { label: 'High Risk', className: 'bg-orange-100 text-orange-800 border-orange-200', icon: ShieldAlert },
  CRITICAL: { label: 'Critical Risk', className: 'bg-red-100 text-red-800 border-red-200', icon: ShieldX },
};

export function RiskScoreBadge({ riskBand, score, showScore = true, size = 'sm' }: RiskScoreBadgeProps) {
  const band = (riskBand || '').toUpperCase();
  const config = RISK_CONFIG[band];
  if (!config) return null;

  const Icon = config.icon;
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`${config.className} ${textSize} gap-1`}>
            <Icon className={iconSize} />
            {config.label}
            {showScore && score != null && (
              <span className="font-mono ml-1">({Math.round(score)})</span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.label}{score != null ? ` — Score: ${Math.round(score)}/100` : ''}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
