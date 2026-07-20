import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, Package, FileSignature, ArrowLeftRight, FolderTree, Search, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Assets", url: "/assets", icon: Package },
  { title: "Contracts", url: "/contracts", icon: FileSignature },
  { title: "Transfers", url: "/transfers", icon: ArrowLeftRight },
  { title: "Collections", url: "/collections", icon: FolderTree },
  { title: "Query Explorer", url: "/explorer", icon: Search },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent className="bg-sidebar">
        <div className={cn("px-4 py-5 flex items-center gap-2", collapsed && "justify-center px-2")}>
          <div className="h-8 w-8 rounded-md bg-gradient-primary flex items-center justify-center shadow-glow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-sm font-semibold gradient-text">Tokenize</div>
              <div className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider">Substrate Console</div>
            </div>
          )}
        </div>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Navigation</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active}>
                      <NavLink
                        to={item.url}
                        end
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 transition-colors",
                            isActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-primary"
                              : "hover:bg-sidebar-accent/50",
                          )
                        }
                      >
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
