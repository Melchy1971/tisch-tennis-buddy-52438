import React from "react";
import { Nav } from "@/components/navigation/Nav";
import type { NavVariant } from "@/hooks/useBreakpoint";
import { BreakpointProvider } from "@/providers/BreakpointProvider";
import { Home, Calendar, Users, Settings } from "lucide-react";

export default function NavigationDemo() {
  const [variant, setVariant] = React.useState<NavVariant | undefined>(undefined);
  const [active, setActive] = React.useState("home");

  const items = [
    { id: "home", label: "Dashboard", icon: <Home className="h-4 w-4" />, onSelect: () => setActive("home"), isActive: active === "home" },
    { id: "teams", label: "Mannschaften", icon: <Users className="h-4 w-4" />, onSelect: () => setActive("teams"), isActive: active === "teams" },
    { id: "matches", label: "Spielplan", icon: <Calendar className="h-4 w-4" />, onSelect: () => setActive("matches"), isActive: active === "matches" },
    { id: "settings", label: "Einstellungen", icon: <Settings className="h-4 w-4" />, onSelect: () => setActive("settings"), isActive: active === "settings" },
  ];

  return (
    <BreakpointProvider>
      <div className="min-h-screen pl-0 lg:pl-64">
        <div className="p-4 flex items-center gap-2 flex-wrap">
          <label className="text-sm">Variante:</label>
          <select
            className="border rounded px-2 py-1"
            value={variant ?? "auto"}
            onChange={(e) => setVariant(e.target.value === "auto" ? undefined : (e.target.value as NavVariant))}
          >
            <option value="auto">Auto</option>
            <option value="mobile_bottom">mobile_bottom</option>
            <option value="tablet_drawer">tablet_drawer</option>
            <option value="desktop_sidebar">desktop_sidebar</option>
          </select>
        </div>

        <main className="p-4">
          <h1 className="text-2xl font-bold mb-2">Navigation Demo</h1>
          <p className="text-muted-foreground mb-6">Aktive Seite: {active}</p>
          <div className="h-[1200px] rounded border bg-muted/20" />
        </main>

        <Nav items={items} variant={variant} />
      </div>
    </BreakpointProvider>
  );
}


