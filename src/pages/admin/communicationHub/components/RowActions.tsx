/**
 * EPIC 3D-UX — Icon-based row action primitive shared by all Communication
 * Hub listing screens. Every row action across the Hub renders through
 * <IconAction /> so tooltips, aria-labels, disabled/loading states, and
 * confirm dialogs stay uniform.
 */
import { useState, type ComponentType, type MouseEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Braces,
  Clock,
  Copy,
  Download,
  Eye,
  ExternalLink,
  FileText,
  Loader2,
  RotateCcw,
  Send,
  ShieldCheck,
  Unlock,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export const ACTION_ICONS = {
  view: Eye,
  timeline: Clock,
  copy: Copy,
  retry: RotateCcw,
  cancel: XCircle,
  unlock: Unlock,
  expand: Braces,
  proposal: FileText,
  preflight: ShieldCheck,
  send: Send,
  download: Download,
  external: ExternalLink,
} as const;

export type IconActionIcon = ComponentType<{ className?: string }>;

interface ConfirmSpec {
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface IconActionBase {
  icon: IconActionIcon;
  label: string;
  disabled?: boolean;
  danger?: boolean;
  className?: string;
}

interface IconActionButton extends IconActionBase {
  onClick: (e: MouseEvent) => void | Promise<void>;
  confirm?: ConfirmSpec;
  to?: never;
}
interface IconActionLink extends IconActionBase {
  to: string;
  onClick?: never;
  confirm?: never;
}
export type IconActionProps = IconActionButton | IconActionLink;

export function IconAction(props: IconActionProps) {
  const { icon: Icon, label, disabled, danger, className } = props;
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const iconClasses = cn("h-3.5 w-3.5", danger && "text-destructive");
  const buttonClasses = cn(
    "h-7 w-7 p-0 inline-flex items-center justify-center rounded-md hover:bg-muted disabled:opacity-40 disabled:pointer-events-none focus:outline-none focus:ring-1 focus:ring-ring",
    danger && "hover:bg-destructive/10",
    className,
  );

  const runAction = async (e: MouseEvent) => {
    if (!("onClick" in props) || !props.onClick) return;
    try {
      setLoading(true);
      await props.onClick(e);
    } catch (err: any) {
      toast.error(err?.message ?? `Failed: ${label}`);
    } finally {
      setLoading(false);
    }
  };

  const inner = loading ? <Loader2 className={cn(iconClasses, "animate-spin")} /> : <Icon className={iconClasses} />;

  const trigger =
    "to" in props && props.to ? (
      <Link
        to={props.to}
        aria-label={label}
        title={label}
        className={buttonClasses}
        aria-disabled={disabled || undefined}
        onClick={(e) => {
          if (disabled) e.preventDefault();
        }}
      >
        {inner}
      </Link>
    ) : (
      <button
        type="button"
        aria-label={label}
        title={label}
        className={buttonClasses}
        disabled={disabled || loading}
        onClick={(e) => {
          if (props.confirm) {
            e.preventDefault();
            setConfirmOpen(true);
            return;
          }
          void runAction(e);
        }}
      >
        {inner}
      </button>
    );

  const wrapped = (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent side="top">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  if (!("confirm" in props) || !props.confirm) return wrapped;

  return (
    <>
      {wrapped}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{props.confirm.title}</AlertDialogTitle>
            <AlertDialogDescription>{props.confirm.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{props.confirm.cancelLabel ?? "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              className={props.confirm.danger ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" : undefined}
              onClick={(e) => {
                setConfirmOpen(false);
                void runAction(e as unknown as MouseEvent);
              }}
            >
              {props.confirm.confirmLabel ?? "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function RowActionGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex items-center gap-1", className)}>{children}</div>;
}
