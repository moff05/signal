# Design

## Theme

Dark-primary (near-black `#0a0a0a` bg), with a working light-mode fallback via `prefers-color-scheme` — dark is the real experience since this is used almost exclusively as an iPhone home-screen app. `color-scheme: light dark` is set at the root so native form controls (date/time pickers) render in the matching OS theme instead of default browser chrome.

## Color

Restrained palette (product register default): one bold accent + three functional semantic colors. The semantic colors are signal, not decoration — they must stay visually distinct from the brand accent so a user never confuses "this is urgent" with "this is the app's brand color."

- `--bg` / `--surface` / `--border` — near-black canvas, one step up for cards/sheets, subtle borders
- `--text` / `--text-muted` — near-white primary text, mid-gray secondary
- `--accent` / `--accent-hi` / `--accent-soft` — the one brand color (blue), full-strength for primary actions, a lighter tint for hover/active, a low-opacity wash for selected-state backgrounds
- `--signal` (green) / `--on-deck` (amber) / `--urgent` (red) — the three manual priority states, always paired with an icon, never color alone (accessibility: don't rely on hue to carry meaning)

## Typography

One family (Geist Sans) for everything — product register, not a brand surface, so display/body pairing isn't needed. Tailwind's default type scale is used as-is (already a reasonable ~1.2 ratio); no custom scale required.

## Components

- **Segmented selectors** (priority, date type): icon + label per option, selected state gets accent border + soft accent background fill, plus one line of dynamic helper copy underneath explaining what the current selection means in plain language — this is the fix for "I don't know what these mean," not a tooltip (tooltips don't work on touch).
- **Cards** (signal list items): state shown via a small icon-in-circle badge (icon + color together, not color alone), icon-only secondary actions (edit/delete) to keep the row calm, a solid primary "done" affordance.
- **Sheet** (new/edit signal): bottom sheet on mobile, centered on wider viewports (unchanged pattern — standard, justified affordance for a mobile create flow, not modal-as-laziness).
- All interactive elements get a 150ms ease transition on color/border/background — instant, jarring state changes were part of what read as "too simple."

## Motion

150–250ms on transitions per product register guidance. A light stagger fade-in on the list when it loads (legitimate per-item reveal, not a decorative page-load sequence). Sheet entrance: slide-up + fade. Everything respects `prefers-reduced-motion` (falls back to instant/opacity-only).

## Anti-patterns avoided

No stat cards, no gradients, no glassmorphism, no custom-built date/time picker (native inputs stay — iOS's own wheel-picker sheet is already excellent; the fix is styling the *closed* trigger to match the theme, not replacing the control).
