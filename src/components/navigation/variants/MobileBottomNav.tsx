import React from "react";
import { RovingFocusList } from "../RovingFocusList";
import type { NavItem } from "@/components/nav/types";

export function MobileBottomNav({ items }: { items: NavItem[] }) {
  return (
    <div className="fixed bottom-0 inset-x-0 border-t bg-red-600/95 backdrop-blur supports-[backdrop-filter]:bg-red-600/80 z-50 pb-safe">
      <RovingFocusList 
        items={items.map(i => ({ ...i, onSelect: i.onSelect || (() => {}) }))} 
        orientation="horizontal" 
        className="mx-auto max-w-full px-2 py-2 overflow-x-auto" 
      />
    </div>
  );
}


