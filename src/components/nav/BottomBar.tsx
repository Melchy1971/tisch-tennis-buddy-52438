import React, { useEffect, useMemo, useRef, useState } from "react";
import type { NavItem } from "./types";

type Props = {
  items: NavItem[];
  ariaLabel?: string;
};

export function BottomBar({ items, ariaLabel = "Hauptnavigation" }: Props) {
  // Initial aktives Item anhand von item.active, sonst 0
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
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      const next = (currentIndex - 1 + items.length) % items.length;
      setCurrentIndex(next);
      focusItem(next);
    } else if (e.key === "ArrowRight") {
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
    <div className="fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav
        role="navigation"
        aria-label={ariaLabel}
        className="mx-auto max-w-md"
        onKeyDown={onKeyDown}
      >
        <ul className="flex items-stretch justify-between gap-1 px-2 py-1">
          {items.map((item, idx) => (
            <li key={item.id} className="flex-1">
              <button
                ref={(el) => (refs.current[idx] = el)}
                type="button"
                tabIndex={idx === currentIndex ? 0 : -1}
                aria-current={item.active ? "page" : undefined}
                aria-disabled={item.disabled || undefined}
                disabled={item.disabled}
                onClick={() => {
                  if (item.disabled) return;
                  if (item.onSelect) item.onSelect();
                  else if (item.href) window.location.assign(item.href);
                }}
                className="w-full min-h-11 min-w-11 px-3 py-2 rounded-md text-sm inline-flex flex-col items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {item.icon}
                <span className="leading-none">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export default BottomBar;


