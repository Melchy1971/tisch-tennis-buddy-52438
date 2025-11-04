import React, { useEffect, useMemo, useRef, useState } from "react";

type Item = {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  isActive?: boolean;
  onSelect: () => void;
};

export function RovingFocusList({ items, orientation = "horizontal", className }: {
  items: Item[];
  orientation?: "horizontal" | "vertical";
  className?: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(() => Math.max(0, items.findIndex(i => i.isActive) || 0));
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const idx = items.findIndex(i => i.isActive);
    if (idx >= 0) setCurrentIndex(idx);
  }, [items]);

  const arrowPrev = orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";
  const arrowNext = orientation === "horizontal" ? "ArrowRight" : "ArrowDown";

  const focusItem = (idx: number) => {
    const el = refs.current[idx];
    if (el) el.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === arrowPrev) {
      e.preventDefault();
      const next = (currentIndex - 1 + items.length) % items.length;
      setCurrentIndex(next);
      focusItem(next);
    } else if (e.key === arrowNext) {
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
      items[currentIndex]?.onSelect();
    }
  };

  return (
    <nav role="navigation" aria-label="Hauptnavigation" className={className} onKeyDown={onKeyDown}>
      <ul className={`flex gap-1 ${orientation === "vertical" ? "flex-col" : "flex-row"}`} aria-orientation={orientation}>
        {items.map((item, idx) => (
          <li key={item.id}>
            <button
              ref={el => (refs.current[idx] = el)}
              type="button"
              tabIndex={idx === currentIndex ? 0 : -1}
              aria-current={item.isActive ? "page" : undefined}
              onClick={item.onSelect}
              className={`min-h-11 w-full px-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 hover:bg-white/20 flex items-center justify-start transition-colors ${
                item.isActive 
                  ? "bg-white/20 text-white shadow-lg" 
                  : "text-white/90 hover:text-white"
              }`}
            >
              {item.icon}
              <span className="ml-2">{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}


