/**
 * Phase 5 — Compact chip showing the resolved online-response mode for an
 * acknowledgment / communication. Reads only the FROZEN snapshot — never
 * live policies. Use anywhere officers need to see how an employer link
 * was configured at send time.
 */
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { ShieldCheck, ShieldOff, Eye, CheckCircle2, MessageSquare, Layers } from 'lucide-react';
import {
  ONLINE_RESPONSE_MODE_LABELS,
  ONLINE_RESPONSE_MODE_DESCRIPTIONS,
  type OnlineResponseMode,
} from '@/types/onlineResponse';

interface Props {
  mode?: OnlineResponseMode | null;
  enabled?: boolean | null;
  matchedPolicyId?: string | null;
  className?: string;
}

const ICONS: Record<OnlineResponseMode, typeof ShieldOff> = {
  NONE: ShieldOff,
  VIEW_ONLY: Eye,
  ACKNOWLEDGMENT_ONLY: CheckCircle2,
  LIMITED_RESPONSE: MessageSquare,
  FULL_RESPONSE: Layers,
};

const VARIANTS: Record<OnlineResponseMode, 'secondary' | 'destructive' | 'outline' | 'default'> = {
  NONE: 'destructive',
  VIEW_ONLY: 'secondary',
  ACKNOWLEDGMENT_ONLY: 'outline',
  LIMITED_RESPONSE: 'default',
  FULL_RESPONSE: 'default',
};

export function OnlineResponseModeBadge({ mode, enabled, matchedPolicyId, className }: Props) {
  const effective: OnlineResponseMode = enabled === false ? 'NONE' : (mode ?? 'ACKNOWLEDGMENT_ONLY');
  const Icon = ICONS[effective];

  const tip = (
    <div className="space-y-1">
      <div className="font-semibold text-xs">{ONLINE_RESPONSE_MODE_LABELS[effective]}</div>
      <div className="text-xs">{ONLINE_RESPONSE_MODE_DESCRIPTIONS[effective]}</div>
      {matchedPolicyId ? (
        <div className="text-[10px] opacity-70">Policy: {matchedPolicyId.slice(0, 8)}…</div>
      ) : (
        <div className="text-[10px] opacity-70">No matching policy — using defaults</div>
      )}
      <div className="text-[10px] opacity-70 pt-1 border-t border-border/40">
        Frozen at send time. Admin policy edits do not change this link.
      </div>
    </div>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={VARIANTS[effective]} className={`gap-1 ${className ?? ''}`}>
            <Icon className="h-3 w-3" />
            <span className="text-[10px] font-medium">
              {ONLINE_RESPONSE_MODE_LABELS[effective].split(' (')[0]}
            </span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          {tip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
