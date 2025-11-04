import React, { useEffect, useRef, useState } from "react";
import type { NavItem } from "./types";

type Props = {
  items: NavItem[];
  ariaLabel?: string;
};

export function DrawerNav({ items, ariaLabel = "Hauptnavigation" }: Props) {
  const initialIndex = Math.max(0, items.findIndex((i) => i.active));
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex >= 0 ? initialIndex : 0);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const idx = items.findIndex((i) => i.active);
    if (idx >= 0) setCurrentIndex(idx);
  }, [items]);

  const focusItem = (idx: number) => {
    const el = refs.current[idx];
    if (el) el.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = (currentIndex - 1 + items.length) % items.length;
      setCurrentIndex(next);
      focusItem(next);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = (currentIndex + 1) % items.length;
      setCurrentIndex(next);
      focusItem(next);
    } else if (e.key === "Home") {
      e.preventDefault();
      setCurrentIndex(0);
      focusItem(0);
    } else if (e.key === "End") {
      e.preventDefault();
      const last = items.length - 1;
      setCurrentIndex(last);
      focusItem(last);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const item = items[currentIndex];
      if (!item?.disabled) {
        if (item?.onSelect) item.onSelect();
        else if (item?.href) window.location.assign(item.href);
      }
    }
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-72 border-r bg-background z-30 hidden md:flex lg:hidden">
      <nav
        role="navigation"
        aria-label={ariaLabel}
        className="flex-1 overflow-auto p-2"
        onKeyDown={onKeyDown}
      >
        <ul className="flex flex-col gap-1">
          {items.map((item, idx) => (
            <li key={item.id}>
              <button
                ref={(el) => (refs.current[idx] = el)}
                type="button"
                tabIndex={idx === currentIndex ? 0 : -1}
                aria-current={item.active ? "page" : undefined}
                aria-disabled={item.disabled || undefined}
                disabled={item.disabled}
                className="w-full h-11 min-h-11 px-3 rounded-md text-sm inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  if (item.disabled) return;
                  if (item.onSelect) item.onSelect();
                  else if (item.href) window.location.assign(item.href);
                }}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

export default DrawerNav;


