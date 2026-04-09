import React from 'react';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export const BIMASourceIndicator: React.FC = () => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-flex items-center cursor-help"
          tabIndex={0}
          aria-label="Data sourced from SSB Admin"
        >
          <Info className="h-3.5 w-3.5 text-muted-foreground" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p className="text-xs">Data sourced from SSB Admin</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);
