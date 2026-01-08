import { useHasPermission, useIsAdmin } from "@/hooks/useNavigationMenu";
import { Button, ButtonProps } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PermissionButtonProps extends ButtonProps {
  moduleName: string;
  actionName: string;
  hideWhenDisabled?: boolean;
  children: React.ReactNode;
}

/**
 * A button that checks permissions before allowing actions.
 * Admin users always have full access.
 * If user doesn't have permission, button is disabled or hidden.
 */
export function PermissionButton({
  moduleName,
  actionName,
  hideWhenDisabled = false,
  children,
  onClick,
  ...props
}: PermissionButtonProps) {
  const isAdmin = useIsAdmin();
  const hasPermission = useHasPermission(moduleName, actionName);

  // Admin users always have access
  if (isAdmin) {
    return (
      <Button {...props} onClick={onClick}>
        {children}
      </Button>
    );
  }

  if (hideWhenDisabled && !hasPermission) {
    return null;
  }

  if (!hasPermission) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button {...props} disabled>
                {children}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>You don't have permission to perform this action</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button {...props} onClick={onClick}>
      {children}
    </Button>
  );
}
