import React from "react";
import { useNavVariant } from "@/hooks/useBreakpoint";
import type { NavVariant } from "@/hooks/useBreakpoint";
import { MobileBottomNav } from "./variants/MobileBottomNav";
import { TabletDrawerNav } from "./variants/TabletDrawerNav";
import { DesktopSidebarNav } from "./variants/DesktopSidebarNav";
import type { NavItem } from "@/components/nav/types";
import { DrawerNav } from "@/components/nav/DrawerNav";

export type { NavVariant };

export function Nav({ items, variant }: { items: NavItem[]; variant?: NavVariant }) {
  const resolved = useNavVariant(variant);

  if (resolved === "mobile_bottom") return <MobileBottomNav items={items} />;
  if (resolved === "tablet_drawer") return <DrawerNav items={items} />;
  return <DesktopSidebarNav items={items} />;
}


