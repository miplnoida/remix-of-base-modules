import { useState } from "react";
import { Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsAdmin } from "@/hooks/useNavigationMenu";
import { useLocation } from "react-router-dom";
import { DeveloperInfoModal } from "./DeveloperInfoModal";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export const DeveloperInfoFAB = () => {
  const isAdmin = useIsAdmin();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Only visible for Admin (Super Admin)
  if (!isAdmin) return null;

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={() => setOpen(true)}
            size="icon"
            className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground"
            aria-label="Developer Information"
          >
            <Code2 className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Developer Information</p>
        </TooltipContent>
      </Tooltip>

      <DeveloperInfoModal
        open={open}
        onOpenChange={setOpen}
        currentRoute={location.pathname}
      />
    </>
  );
};
