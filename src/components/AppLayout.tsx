
import React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Header } from "@/components/Header";

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * Standard app layout: Sidebar + Header + Page content area.
 * To be used for all authenticated/protected pages, matching EmployerRegistration layout.
 */
export const AppLayout = ({ children }: AppLayoutProps) => (
  <SidebarProvider>
    <div className="min-h-screen flex w-full bg-gray-50">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-6xl mx-auto w-full">{children}</div>
        </main>
      </div>
    </div>
  </SidebarProvider>
);
