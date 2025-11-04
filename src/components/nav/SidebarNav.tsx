import React from "react";
import type { NavItem } from "./types";

type NavSection = {
  id: string;
  label: string;
  items: NavItem[];
};

type Props = {
  items?: NavItem[]; // flache Liste
  sections?: NavSection[]; // genau eine Ebene verschachtelt
  ariaLabel?: string;
  dense?: boolean;
};

export function SidebarNav({ items, sections, ariaLabel = "Hauptnavigation", dense = false }: Props) {
  const rowClass = dense
    ? "h-9 px-2 text-sm"
    : "h-11 px-3 text-sm";

  const ItemButton = ({ item }: { item: NavItem }) => (
    <button
      type="button"
      aria-current={item.active ? "page" : undefined}
      aria-disabled={item.disabled || undefined}
      disabled={item.disabled}
      onClick={() => {
        if (item.disabled) return;
        if (item.onSelect) item.onSelect();
        else if (item.href) window.location.assign(item.href);
      }}
      className={[
        "w-full",
        rowClass,
        "rounded-md inline-flex items-center gap-2",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "hover:bg-accent",
        "disabled:opacity-50 disabled:cursor-not-allowed",
      ].join(" ")}
    >
      {item.icon}
      <span className="truncate">{item.label}</span>
    </button>
  );

  return (
    <aside className="hidden lg:flex lg:flex-col lg:fixed lg:top-0 lg:left-0 lg:h-screen lg:z-30 border-r bg-background" style={{ width: 280 }}>
      <nav role="navigation" aria-label={ariaLabel} className="flex-1 overflow-auto p-2">
        {/* Flache Liste */}
        {items && items.length > 0 && (
          <ul className="flex flex-col gap-1" aria-label={ariaLabel}>
            {items.map((item) => (
              <li key={item.id}>
                <ItemButton item={item} />
              </li>
            ))}
          </ul>
        )}

        {/* Sektionen mit Überschrift und 1 Ebene Items */}
        {sections && sections.length > 0 && (
          <div className="flex flex-col gap-4">
            {sections.map((section) => {
              const headerId = `${section.id}-label`;
              return (
                <section key={section.id} className="flex flex-col gap-2">
                  <h2 id={headerId} className="px-2 text-xs font-semibold text-muted-foreground tracking-wide">
                    {section.label}
                  </h2>
                  <ul aria-labelledby={headerId} className="flex flex-col gap-1">
                    {section.items.map((item) => (
                      <li key={item.id}>
                        <ItemButton item={item} />
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </nav>
    </aside>
  );
}

export default SidebarNav;


