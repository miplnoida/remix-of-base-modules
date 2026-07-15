/**
 * Award 360 shared action button — BN-AWARD360-2.1F.
 *
 * Rendering rules:
 * - `availability.visible === false` → renders nothing.
 * - `availability.executionMode === 'NAVIGATE'` → renders an enabled link
 *   using `availability.targetRoute`.
 * - `availability.executionMode === 'SERVER_COMMAND'` and `enabled === true`
 *   → renders an enabled button that fires `onServerCommand` (no direct
 *   mutation is added in this correction; server commands remain unavailable).
 * - Otherwise → renders a disabled button whose tooltip is the resolver
 *   `reason`. UI code MUST NOT invent alternative disabled-reason strings.
 */
import React from 'react';
import { Button } from '@/components/ui/button';
import type {
  AwardActionAvailability,
} from '@/services/bn/awards/awardActionAvailability';

type ButtonVariant = React.ComponentProps<typeof Button>['variant'];
type ButtonSize = React.ComponentProps<typeof Button>['size'];

export interface Award360ActionButtonProps {
  availability: AwardActionAvailability;
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  onServerCommand?: () => void;
}

export const Award360ActionButton: React.FC<Award360ActionButtonProps> = ({
  availability,
  label,
  variant = 'outline',
  size = 'sm',
  className,
  onServerCommand,
}) => {
  if (!availability.visible) return null;

  if (availability.executionMode === 'NAVIGATE' && availability.enabled && availability.targetRoute) {
    return (
      <Button
        asChild
        variant={variant}
        size={size}
        className={className}
        title={availability.reason}
        data-award-action={availability.action}
        data-award-execution-mode="NAVIGATE"
      >
        <a href={availability.targetRoute}>{label}</a>
      </Button>
    );
  }

  if (availability.executionMode === 'SERVER_COMMAND' && availability.enabled) {
    return (
      <Button
        variant={variant}
        size={size}
        className={className}
        title={availability.reason}
        onClick={onServerCommand}
        data-award-action={availability.action}
        data-award-execution-mode="SERVER_COMMAND"
      >
        {label}
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      disabled
      title={availability.reason}
      aria-disabled="true"
      data-award-action={availability.action}
      data-award-execution-mode="DISABLED"
      data-award-action-reason={availability.reason}
    >
      {label}
    </Button>
  );
};

export default Award360ActionButton;
