import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Shield, Users, Building2, ClipboardCheck, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Overview", icon: Shield },
  { to: "/onboarding/individual", label: "Individual Onboarding", icon: Users },
  { to: "/onboarding/corporate", label: "Corporate Onboarding", icon: Building2 },
  { to: "/analyst", label: "Analyst Review", icon: ClipboardCheck, restricted: true },
];

export function AppShell({ children }: { children?: React.ReactNode }) {
  const pathname = useRouterState({ select: s => s.location.pathname });
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const d = saved ? saved === "dark" : true;
    setDark(d);
    document.documentElement.classList.toggle("dark", d);
  }, []);

  const toggle = () => {
    const d = !dark; setDark(d);
    document.documentElement.classList.toggle("dark", d);
    localStorage.setItem("theme", d ? "dark" : "light");
  };

  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      <aside className="hidden md:flex w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="px-6 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-md bg-primary text-primary-foreground grid place-items-center font-bold">V</div>
            <div>
              <div className="font-semibold tracking-tight">Veridian KYC</div>
              <div className="text-[11px] text-muted-foreground">Compliance Platform</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map(n => {
            const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm" : "hover:bg-sidebar-accent",
                )}
              >
                <Icon className="size-4" />
                <span className="flex-1">{n.label}</span>
                {n.restricted && <span className="text-[10px] uppercase tracking-wider opacity-70">Staff</span>}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 text-[11px] text-muted-foreground border-t border-sidebar-border">
          <div>v1.0 · Simulated environment</div>
          <div>Audit-ready · FATF aligned</div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border bg-card/60 backdrop-blur flex items-center justify-between px-4 md:px-8">
          <div className="text-sm text-muted-foreground">
            Tier-1 Global Banking · KYC / AML Orchestration
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs px-2 py-1 rounded-full bg-success/15 text-success border border-success/30">
              ● System Online
            </span>
            <button onClick={toggle} className="size-9 grid place-items-center rounded-md hover:bg-accent text-muted-foreground" aria-label="Toggle theme">
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8 max-w-[1400px] w-full mx-auto">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}
