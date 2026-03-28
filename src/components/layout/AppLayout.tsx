
import { ReactNode, useMemo } from 'react';
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Header } from "@/components/Header";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DeveloperInfoFAB } from "@/components/developer-info/DeveloperInfoFAB";

interface AppLayoutProps {
  children: ReactNode;
}

function getSidebarCookieState(): boolean {
  const cookie = document.cookie
    .split('; ')
    .find(row => row.startsWith('sidebar:state='));
  if (cookie) {
    return cookie.split('=')[1] === 'true';
  }
  return true; // default open
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const defaultOpen = useMemo(() => getSidebarCookieState(), []);

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
          <Header />
          <main className="flex-1 p-0 overflow-x-hidden">
            <div className="mx-auto w-full max-w-[100%] p-3 sm:p-4 md:p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
      <TooltipProvider>
        <DeveloperInfoFAB />
      </TooltipProvider>
    </SidebarProvider>
  );
};
