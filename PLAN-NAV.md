# Navigations-Refactor (Scope & Plan)

## Ziel
Responsives/adaptives Navigationssystem mit Varianten:
- `mobile_bottom` (Bottom-Nav)
- `tablet_drawer` (seitlicher Drawer)
- `desktop_sidebar` (persistente Sidebar)

Breakpoints: `sm ≤ 640`, `md ≤ 1024`, `lg > 1024` plus Feature-Detection für `(pointer: coarse)`.

A11y: Roving Tabindex, Pfeiltasten (Links/Rechts bzw. Oben/Unten je Layout), Home/End, `:focus-visible`, Touch‑Hit‑Area ≥ 44×44 px. Keine UA-Sniffing.

## Ansatz (kleiner, sicherer Refactor)
1. Neuer `BreakpointProvider` (matchMedia) mit Kontext + Hook für `sm/md/lg` und `pointer: coarse`.
2. Neue Navigations-Root `Nav` mit automatischer Variantenauswahl und optionaler Override-Prop.
3. Drei schlanke Varianten-Komponenten (`MobileBottomNav`, `TabletDrawerNav`, `DesktopSidebarNav`).
4. Gemeinsame A11y-Logik als `RovingFocusList` (roving tabindex, Arrow/Home/End, min 44×44).
5. Demo-Seite `NavigationDemo` mit Variant-Toggle (Prop-Override), ohne bestehende Routen zu verändern.

Sicherheitsaspekt: Bestehende `Navigation.tsx` bleibt unverändert. Neue Komponenten sind additive und können schrittweise integriert werden.

## Mapping Breakpoints → Varianten
- Default-Heuristik:
  - `pointer: coarse` und `sm`: `mobile_bottom`
  - `md`: `tablet_drawer`
  - `lg`: `desktop_sidebar`
- Manuelle Override via Prop `variant`.

## A11y-Details
- Elemente in `role="navigation"` mit `aria-current` für aktive Seite.
- Roving Tabindex (nur aktives Item `tabIndex=0`, andere `-1`).
- Tastatur: Arrow-Keys zyklisch, Home/End an den Anfang/Ende, Enter/Space aktiviert.
- Fokus-Styling mit `:focus-visible`. Min-Hit-Area via Utility-Klassen (`h-11 min-w-11`).

## Deliverables (Batch 1)
- PLAN-NAV.md (dieses Dokument)
- Neue Dateien:
  - `src/providers/BreakpointProvider.tsx`
  - `src/hooks/useBreakpoint.ts`
  - `src/components/navigation/Nav.tsx`
  - `src/components/navigation/RovingFocusList.tsx`
  - `src/components/navigation/variants/MobileBottomNav.tsx`
  - `src/components/navigation/variants/TabletDrawerNav.tsx`
  - `src/components/navigation/variants/DesktopSidebarNav.tsx`
  - `src/pages/NavigationDemo.tsx`

## Nächste Schritte (Batch 2)
- Optionale Konsolidierung der Menü-Datenquelle mit bestehender `Navigation.tsx`.
- Integration in App-Shell und conditional rendering über Provider.
