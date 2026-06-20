import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLgAccess, type LgCapability } from "@/hooks/legal/useLgAccess";

interface Props extends ButtonProps {
  capability: LgCapability;
  /** If true, hide the button entirely when the user lacks capability. Default: false (disable + tooltip). */
  hideWhenDenied?: boolean;
  /** Optional override tooltip text. */
  deniedReason?: string;
}

/**
 * Button gated by a Legal capability.
 *
 * If the current user lacks the capability:
 *   - hideWhenDenied=true   → renders nothing
 *   - hideWhenDenied=false  → renders a disabled button with a tooltip explaining
 *     which capability/role is required.
 */
export function LgActionButton({
  capability, hideWhenDenied, deniedReason, children, disabled, ...rest
}: Props) {
  const { can } = useLgAccess();
  const allowed = can(capability);

  if (!allowed && hideWhenDenied) return null;

  if (!allowed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {/* span wrapper so disabled button still fires tooltip */}
            <span className="inline-block">
              <Button {...rest} disabled>{children}</Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {deniedReason ?? `Requires Legal capability: ${capability}`}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return <Button {...rest} disabled={disabled}>{children}</Button>;
}
