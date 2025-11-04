import React from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { RovingFocusList } from "../RovingFocusList";
import type { NavItem } from "@/components/nav/types";

export function TabletDrawerNav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="fixed top-2 left-2 z-40">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Navigation öffnen" className="h-11 w-11">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-2">
          <RovingFocusList
            items={items.map(i => ({ 
              ...i, 
              onSelect: () => { 
                i.onSelect?.(); 
                setOpen(false); 
              } 
            }))}
            orientation="vertical"
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}


