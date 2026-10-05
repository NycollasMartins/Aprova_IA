import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  CalendarDays,
  ListChecks,
  RotateCcw,
  TrendingUp,
  Settings,
  ShieldCheck,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Logo } from "./Logo";
import { AreaSwitcher } from "./AreaSwitcher";
import { useRole } from "@/hooks/useRole";

const main = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Cronograma", url: "/cronograma", icon: CalendarDays },
  { title: "Questões", url: "/questoes", icon: ListChecks },
  { title: "Revisões", url: "/revisoes", icon: RotateCcw },
  { title: "Desempenho", url: "/desempenho", icon: TrendingUp },
  // Tutor IA oculto do menu enquanto a Edge Function não está implementada.
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (p: string) => pathname === p || pathname.startsWith(p + "/");
  const { isAdmin } = useRole();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-4">
        <Logo collapsed={collapsed} />
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Estudo</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {main.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!collapsed && (
          <div className="mt-4 px-2">
            <AreaSwitcher />
          </div>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          {isAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Admin" isActive={isActive("/admin")}>
                <Link to="/admin">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Admin</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Configurações" isActive={isActive("/configuracoes")}>
              <Link to="/configuracoes">
                <Settings className="h-4 w-4" />
                <span>Configurações</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
