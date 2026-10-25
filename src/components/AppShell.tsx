import { Link, useLocation } from "@tanstack/react-router";
import { BarChart3, Clock, Map, Network, Plus, Settings } from "lucide-react";
import logo from "@/assets/drzewo-logo.png";
import type { ReactNode } from "react";
import { useStore } from "@/store";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/", label: "Drzewo", icon: Network },
  { to: "/mapa", label: "Mapa", icon: Map },
  { to: "/os-czasu", label: "Oś czasu", icon: Clock },
  { to: "/statystyki", label: "Statystyki", icon: BarChart3 },
  { to: "/ustawienia", label: "Ustawienia", icon: Settings },
] as const;

function SaveIndicator() {
  const lastSaved = useStore((s) => s.lastSaved);
  const err = useStore((s) => s.saveError);
  if (err) return <span className="text-xs text-destructive">{err}</span>;
  if (!lastSaved) return null;
  return (
    <span className="text-xs text-muted-foreground">
      Zapisano {lastSaved.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const isActive = (to: string) => (to === "/" ? pathname === "/" || pathname.startsWith("/osoba/") : pathname.startsWith(to));
  const hideFab = pathname.startsWith("/osoba/nowa") || pathname.endsWith("/edytuj");

  return (
    <div className="flex h-dvh flex-col">
      <header className="no-print hidden items-center gap-6 border-b bg-card px-6 py-2 md:flex">
        <Link to="/" className="flex items-center gap-2 font-serif text-xl font-semibold text-primary">
          <img src={logo} alt="Logo Drzewo" className="size-8 rounded-lg" />
          Drzewo rodzinne
        </Link>
        <nav className="flex gap-1" aria-label="Główna nawigacja">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors",
                isActive(to) ? "bg-accent text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <SaveIndicator />
          <button
            onClick={() => void supabase.auth.signOut()}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Wyloguj
          </button>
        </div>
      </header>

      <main className="relative min-h-0 flex-1 overflow-auto">{children}</main>

      {!hideFab && (
        <Link
          to="/osoba/nowa"
          aria-label="Dodaj osobę"
          className="no-print fixed bottom-20 right-4 z-30 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-card transition-colors hover:bg-primary-hover md:bottom-6 md:right-6"
        >
          <Plus className="size-7" />
        </Link>
      )}

      <nav
        className="no-print grid grid-cols-5 border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="Główna nawigacja"
      >
        {NAV.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold",
              isActive(to) ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
