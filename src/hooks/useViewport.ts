import { useEffect, useState } from "react";

export type BP = "sm" | "md" | "lg";

const queries = {
  sm: "(max-width: 640px)",
  md: "(min-width: 641px) and (max-width: 1024px)",
  lg: "(min-width: 1025px)",
};

function getBp(): BP {
  if (typeof window === "undefined") return "lg";
  if (window.matchMedia(queries.sm).matches) return "sm";
  if (window.matchMedia(queries.md).matches) return "md";
  return "lg";
}

function getCoarse(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

export function useViewport() {
  const [bp, setBp] = useState<BP>(getBp());
  const [coarse, setCoarse] = useState<boolean>(getCoarse());

  useEffect(() => {
    const sm = window.matchMedia(queries.sm);
    const md = window.matchMedia(queries.md);
    const lg = window.matchMedia(queries.lg);
    const ptr = window.matchMedia("(pointer: coarse)");

    const updateBp = () => setBp(getBp());
    const updatePtr = () => setCoarse(getCoarse());

    sm.addEventListener("change", updateBp);
    md.addEventListener("change", updateBp);
    lg.addEventListener("change", updateBp);
    ptr.addEventListener("change", updatePtr);

    return () => {
      sm.removeEventListener("change", updateBp);
      md.removeEventListener("change", updateBp);
      lg.removeEventListener("change", updateBp);
      ptr.removeEventListener("change", updatePtr);
    };
  }, []);

  return { bp, coarse } as const;
}


