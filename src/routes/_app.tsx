import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AreaAmbientLayer } from "@/components/AreaAmbience";
import { useProfile } from "@/hooks/useProfile";
import { ConcursoProvider } from "@/contexts/ConcursoContext";
import { StudyTimerProvider } from "@/contexts/StudyTimerContext";
import { EditalChangePopup } from "@/components/EditalChangePopup";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  // Guard de sessão (Caminho B): só entra logado e com onboarding concluído.
  const nav = useNavigate();
  const { user, profile, loading } = useProfile();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      nav({ to: "/login", replace: true });
    } else if (profile && profile.onboarding_completed === false) {
      nav({ to: "/onboarding", replace: true });
    }
  }, [loading, user, profile, nav]);

  // Enquanto resolve a sessão (ou se não há usuário), mostra spinner — nunca
  // renderiza a área privada sem sessão válida.
  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ConcursoProvider>
      <StudyTimerProvider>
      <SidebarProvider>
        <AreaAmbientLayer />
        <EditalChangePopup />
        <div className="relative flex min-h-screen w-full">
          <AppSidebar />
          <SidebarInset className="flex min-w-0 flex-1 flex-col bg-transparent">
            <Outlet />
          </SidebarInset>
        </div>
      </SidebarProvider>
      </StudyTimerProvider>
    </ConcursoProvider>
  );
}
