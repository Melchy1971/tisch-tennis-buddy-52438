import { useEffect, useRef } from "react";

/**
 * Hook for announcing messages to screen readers
 * Uses ARIA live regions to provide accessible notifications
 */
export const useA11yAnnouncer = () => {
  const announceRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Create announcement container if it doesn't exist
    if (!document.getElementById("a11y-announcer")) {
      const announcer = document.createElement("div");
      announcer.id = "a11y-announcer";
      announcer.setAttribute("role", "status");
      announcer.setAttribute("aria-live", "polite");
      announcer.setAttribute("aria-atomic", "true");
      announcer.className = "sr-only";
      document.body.appendChild(announcer);
      announceRef.current = announcer;
    } else {
      announceRef.current = document.getElementById("a11y-announcer") as HTMLDivElement;
    }
  }, []);

  const announce = (message: string, priority: "polite" | "assertive" = "polite") => {
    if (announceRef.current) {
      announceRef.current.setAttribute("aria-live", priority);
      announceRef.current.textContent = message;
      
      // Clear after announcement
      setTimeout(() => {
        if (announceRef.current) {
          announceRef.current.textContent = "";
        }
      }, 1000);
    }
  };

  return { announce };
};
