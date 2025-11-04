import { useBreakpoint } from "@/providers/BreakpointProvider";

export type NavVariant = "mobile_bottom" | "tablet_drawer" | "desktop_sidebar";

export function useNavVariant(override?: NavVariant) {
  const { breakpoint, isCoarsePointer } = useBreakpoint();

  if (override) return override;

  if (breakpoint === "sm" || isCoarsePointer) return "mobile_bottom";
  if (breakpoint === "md") return "tablet_drawer";
  return "desktop_sidebar";
}


