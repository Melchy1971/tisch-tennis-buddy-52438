# Navigation QA Checkliste

Bitte jede Zeile prüfen und abhaken. Bei Fehlern "[ ] Fail" markieren und kurz begründen.

## Varianten & Breakpoints
- [ ] Pass: Wechsel zu `mobile_bottom` bei ≤640px (sm)
- [ ] Pass: Wechsel zu `tablet_drawer` bei 641–1024px (md)
- [ ] Pass: Wechsel zu `desktop_sidebar` bei ≥1025px (lg)
- [ ] Fail: (Begründung)

## Tastatur-Navigation
- [ ] Pass: Tab fokussiert Navigationsleiste und erstes aktives Element
- [ ] Pass: Arrow (Links/Rechts in BottomBar, Oben/Unten in Drawer/Sidebar) rotiert zyklisch
- [ ] Pass: Home springt zum ersten, End zum letzten Eintrag
- [ ] Pass: Enter/Space aktiviert Eintrag
- [ ] Pass: Escape schließt Drawer (md) wenn offen
- [ ] Fail: (Begründung)

## Hit Area (Touch)
- [ ] Pass: Min. 44×44 px pro Item bei `(pointer: coarse)`
- [ ] Fail: (Begründung)

## ARIA-Zustände
- [ ] Pass: `aria-current="page"` am aktiven Eintrag
- [ ] Pass: Gruppen (Sidebar) besitzen `aria-labelledby` auf die Abschnittsüberschrift
- [ ] Fail: (Begründung)

## Visuelle Zustände
- [ ] Pass: `:focus-visible` Ring ist sichtbar und kontrastreich
- [ ] Pass: Hover-State ist sichtbar, ohne Fokus zu überdecken
- [ ] Fail: (Begründung)

## Sonstiges
- [ ] Pass: Dev-Override via `?navVariant=...` funktioniert (mobile_bottom|tablet_drawer|desktop_sidebar)
- [ ] Fail: (Begründung)
