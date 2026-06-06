import { Link } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';

interface Props { helpHref: string }

export function HelpButton({ helpHref }: Props) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to={helpHref}
            aria-label="Help and support"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            <HelpCircle className="h-4 w-4" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">Help &amp; support</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
