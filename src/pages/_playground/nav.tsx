import React from "react";
import { BreakpointProvider } from "@/providers/BreakpointProvider";
import { Nav } from "@/components/navigation/Nav";
import type { NavVariant } from "@/components/navigation/Nav";
import { baseNavigation } from "@/navigation";

export default function PlaygroundNav() {
  const [active, setActive] = React.useState("dashboard");

  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : "");
  const variantParam = searchParams.get('navVariant') as NavVariant | null;
  const devVariant: NavVariant | undefined =
    variantParam === 'mobile_bottom' || variantParam === 'tablet_drawer' || variantParam === 'desktop_sidebar'
      ? variantParam
      : undefined;

  const items = baseNavigation.map((base) => ({
    id: base.id,
    label: base.label,
    icon: base.icon,
    active: active === base.id,
    onSelect: () => setActive(base.id),
  }));

  return (
    <BreakpointProvider>
      <div className="min-h-screen pl-0 lg:pl-[280px]">
        <div className="p-4 flex items-center gap-2 flex-wrap">
          <label className="text-sm">Variante:</label>
          <select
            className="border rounded px-2 py-1"
            value={devVariant ?? "auto"}
            onChange={(e) => {
              const v = e.target.value;
              const url = new URL(window.location.href);
              if (v === "auto") url.searchParams.delete("navVariant");
              else url.searchParams.set("navVariant", v);
              window.history.replaceState({}, "", url.toString());
              window.location.reload();
            }}
          >
            <option value="auto">Auto</option>
            <option value="mobile_bottom">mobile_bottom</option>
            <option value="tablet_drawer">tablet_drawer</option>
            <option value="desktop_sidebar">desktop_sidebar</option>
          </select>
        </div>

        <main className="p-4">
          <h1 className="text-2xl font-bold mb-2">Navigation Playground</h1>
          <p className="text-muted-foreground mb-6">Aktiv: {active}</p>
          <div className="h-[1200px] rounded border bg-muted/20" />
        </main>

        <Nav items={items} variant={devVariant} />
      </div>
    </BreakpointProvider>
  );
}


