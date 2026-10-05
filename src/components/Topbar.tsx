import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfile } from "@/hooks/useProfile";
import { Link } from "@tanstack/react-router";
import { ConcursoSelector } from "@/components/ConcursoSelector";
import { StudyTimerWidget } from "@/components/StudyTimerWidget";

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const { profile } = useProfile();
  const name = profile?.display_name ?? profile?.full_name ?? profile?.email ?? "—";
  const initials = (name || "?")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/70 px-4 backdrop-blur-xl sm:px-6">
      <SidebarTrigger className="-ml-1" />
      <div className="hidden sm:block">
        <h1 className="text-base font-semibold leading-tight">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <StudyTimerWidget />
        <ConcursoSelector />
        <Link
          to="/configuracoes"
          className="flex items-center gap-2 rounded-xl border border-border bg-card/60 py-1 pl-1 pr-3 hover:bg-accent transition"
        >
          <Avatar className="h-7 w-7">
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={name} />}
            <AvatarFallback className="bg-gradient-primary text-[11px] font-bold text-primary-foreground">
              {initials || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="hidden text-left leading-tight sm:block">
            <div className="text-xs font-semibold">{name}</div>
            {profile?.target_concurso && (
              <div className="text-[10px] text-muted-foreground line-clamp-1">
                {profile.target_concurso}
              </div>
            )}
          </div>
        </Link>
      </div>
    </header>
  );
}
