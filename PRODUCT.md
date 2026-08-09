# Product

## Register

product

## Users

Nicholas Moffett — the sole user. Opens Signal from an iPhone home-screen PWA and a Scriptable widget, multiple times a day, to capture something fast (a task, an event, a deadline) and to triage what actually matters today. Also uses it on a laptop occasionally. No other users, no accounts, no onboarding flow needed.

## Product Purpose

A persistent priority/notes/calendar capture tool that replaces asking an AI assistant ad hoc to "put this on my calendar." Unifies three kinds of entries — fixed-time events (pushed one-way to Google Calendar), deadline-bound tasks (auto-escalating in urgency as the date nears), and someday/backlog items (no date, sit until touched) — under one fast-capture flow and a daily "pick your signal" triage ritual. Success looks like: capture takes seconds, and a glance at the list or the widget tells Nicholas what's actually urgent without him having to re-triage everything himself.

## Brand Personality

Sharp & confident. One bold accent color carrying real visual weight, high contrast, opinionated typography — closer to the terminal-inspired look of his career-dashboard project or TickTick than to a soft consumer to-do app. Confident, not decorative: every visual choice should read as a deliberate tool for triage, not a lifestyle app.

## Anti-references

Explicitly not a generic SaaS dashboard: no stat-card grids, no gradient accents, no glassmorphism, no corporate-dashboard cliches (KPI tiles, soft pastel palettes, rounded-everything cards). This is a personal tool for one person's pocket, not a product demo.

## Design Principles

1. **Exactly one manual priority decision.** Whether something is in today's Signal is the only thing a user ever taps to set — "Urgent" is computed automatically from date proximity (climbs on its own as a deadline nears), and everything else is just neutral backlog. Don't reintroduce a third manual bucket; it's the thing that made the original design confusing.
2. **The three entry types should feel like different kinds of objects**, not three radio-button variants of one form. A fixed-time event, a deadline, and a someday idea have different shapes of urgency and should look it.
3. **One-handed mobile first.** Big tap targets, minimal chrome, and once installed to the home screen it must read as a native app, not "a website in an app wrapper."
4. **Capture speed over form completeness.** Adding a signal should never feel like filling out a form — the default path (just type and save) stays the fastest path.
5. **One bold accent, used with intent** — not a muted multi-color SaaS palette. The three semantic priority colors (green/yellow/red) are functional signal, not decoration, and stay visually distinct from the one brand accent.

## Accessibility & Inclusion

WCAG AA contrast minimum throughout (verify new colors against both the dark and light token sets in `app/globals.css`). Dark mode is the primary experience; the existing light-mode fallback via `prefers-color-scheme` should keep working, not be treated as an afterthought. No other specific accessibility needs — single sighted user, iOS Safari/PWA only.
