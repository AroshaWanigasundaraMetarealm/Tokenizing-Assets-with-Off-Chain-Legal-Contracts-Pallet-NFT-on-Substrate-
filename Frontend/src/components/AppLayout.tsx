import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ConnectionBadge } from "@/components/ConnectionBadge";
import { AccountSelector } from "@/components/AccountSelector";
import { EndpointDialog } from "@/components/EndpointDialog";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-3 border-b border-border bg-background/80 backdrop-blur sticky top-0 z-30 px-3">
            <SidebarTrigger className="text-foreground" />
            <div className="flex-1" />
            <ConnectionBadge />
            <EndpointDialog />
            <AccountSelector />
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-x-hidden">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
