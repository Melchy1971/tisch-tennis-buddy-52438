import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type Breakpoint = "sm" | "md" | "lg";

type BreakpointContextValue = {
  breakpoint: Breakpoint;
  isCoarsePointer: boolean;
};

const BreakpointContext = createContext<BreakpointContextValue | null>(null);

const queries = {
  sm: "(max-width: 640px)",
  md: "(min-width: 641px) and (max-width: 1024px)",
  lg: "(min-width: 1025px)",
};

function getBreakpoint(): Breakpoint {
  if (typeof window === "undefined") return "lg";
  if (window.matchMedia(queries.sm).matches) return "sm";
  if (window.matchMedia(queries.md).matches) return "md";
  return "lg";
}

function getIsCoarsePointer(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

export function BreakpointProvider({
  children,
  override,
}: {
  children: React.ReactNode;
  override?: { bp?: Breakpoint; coarse?: boolean };
}) {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(override?.bp ?? getBreakpoint());
  const [isCoarsePointer, setIsCoarsePointer] = useState<boolean>(
    override?.coarse ?? getIsCoarsePointer(),
  );

  useEffect(() => {
    const listeners: Array<() => void> = [];

    const smMql = window.matchMedia(queries.sm);
    const mdMql = window.matchMedia(queries.md);
    const lgMql = window.matchMedia(queries.lg);
    const pointerMql = window.matchMedia("(pointer: coarse)");

    const handleChange = () => {
      if (override?.bp !== undefined) return;
      setBreakpoint(getBreakpoint());
    };
    const handlePointer = () => {
      if (override?.coarse !== undefined) return;
      setIsCoarsePointer(getIsCoarsePointer());
    };

    smMql.addEventListener("change", handleChange);
    mdMql.addEventListener("change", handleChange);
    lgMql.addEventListener("change", handleChange);
    pointerMql.addEventListener("change", handlePointer);

    listeners.push(() => smMql.removeEventListener("change", handleChange));
    listeners.push(() => mdMql.removeEventListener("change", handleChange));
    listeners.push(() => lgMql.removeEventListener("change", handleChange));
    listeners.push(() => pointerMql.removeEventListener("change", handlePointer));

    return () => listeners.forEach((off) => off());
  }, [override?.bp, override?.coarse]);

  const value = useMemo(() => ({ breakpoint, isCoarsePointer }), [breakpoint, isCoarsePointer]);

  return <BreakpointContext.Provider value={value}>{children}</BreakpointContext.Provider>;
}

export function useBreakpoint() {
  const ctx = useContext(BreakpointContext);
  if (!ctx) throw new Error("useBreakpoint must be used within BreakpointProvider");
  return ctx;
}


