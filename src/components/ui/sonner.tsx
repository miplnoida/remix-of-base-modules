import type { ComponentProps } from "react";
import { Toaster as Sonner } from "sonner";
import { useSystemSettingsContext } from "@/contexts/SystemSettingsContext";

type ToasterProps = ComponentProps<typeof Sonner>;

type SonnerPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';

/**
 * Dynamic Sonner Toaster that reads position from system settings.
 * Uses the "success" position as the global Sonner position (Sonner only supports one position).
 * Duration is applied per-toast via the global toast wrapper.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { getSetting } = useSystemSettingsContext();
  const position = (getSetting('toast_position_success', 'top-right') as SonnerPosition) || 'top-right';
  const defaultDuration = parseInt(getSetting('toast_duration_success', '4'), 10) * 1000 || 4000;

  return (
    <Sonner
      position={position}
      theme={"system"}
      className="toaster group"
      duration={defaultDuration}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
