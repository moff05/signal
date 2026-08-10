---
target: signal (whole app)
total_score: 30
p0_count: 0
p1_count: 2
timestamp: 2026-08-09T21-06-54Z
slug: signal-whole-app
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Loading skeletons + "Saving…" exist, but Done/Delete give no confirmation beyond the item silently vanishing. |
| 2 | Match System / Real World | 4 | n/a — "Someday/Deadline/Specific time," "Today's Signal," "Backlog" match the user's own mental model exactly. |
| 3 | User Control and Freedom | 2 | Delete is instant and permanent with zero confirmation or undo. |
| 4 | Consistency and Standards | 3 | Internally consistent, but swipe-right-to-complete inverts the iOS platform convention (swipe-left for destructive/reveal in Mail/Reminders/Messages). |
| 5 | Error Prevention | 2 | No confirmation before permanent delete; no `min` guard on Deadline/Specific-time date inputs, so a past date saves silently. |
| 6 | Recognition Rather Than Recall | 3 | Date-mode selector's live helper copy is a strong recognition aid. |
| 7 | Flexibility and Efficiency | 3 | Swipe (power path) + tap-menu (safe path) coexist well; no bulk actions, but arguably unneeded for one user. |
| 8 | Aesthetic and Minimalist Design | 4 | n/a — genuinely restrained, matches stated brand personality. |
| 9 | Error Recovery | 2 | Sheet save failure shows only generic "Something went wrong," while Settings surfaces the real error — inconsistent specificity. |
| 10 | Help and Documentation | 4 | n/a — appropriately absent for a single known user; PRODUCT.md explicitly rules out onboarding. |
| **Total** | | **30/40** | **Good — solid foundation, address weak areas** |

## Anti-Patterns Verdict

**LLM assessment**: Does not read as AI slop. None of the product-register bans are present — no side-stripe borders, no gradient text, no glassmorphism, no hero-metric template, no identical stat-card grids, no ghost-card pattern, no 32px+ corners. Color is genuinely restrained (one accent + three functional semantic colors, verified live, zero stray hues). Motion is state-tied throughout, with `prefers-reduced-motion` respected. The uppercase "TODAY'S SIGNAL"/"BACKLOG" labels technically resemble the banned tracked-eyebrow pattern but are functional list-grouping labels doing real IA work, not decoration bolted onto empty content.

**Deterministic scan**: `detect.mjs --json app public` on the source tree came back clean (exit 0, zero findings). The browser-injected overlay, run live against the rendered app across four views, found real issues the static scan couldn't see:

| View | Findings |
|---|---|
| Main list `/` | `low-contrast` (3.7:1, needs 4.5:1 — white on `#3b82f6`) + `dark-glow` on the New Signal FAB; `flat-type-hierarchy` on `body` (1.7:1 size ratio) |
| New Signal sheet | Same `low-contrast`/`dark-glow` on FAB + Save button; `gpt-thin-border-wide-shadow` on the modal form; `nested-cards` on the textarea wrapper div |
| `/archive` | No anti-patterns found |
| `/settings` | `low-contrast` + `cramped-padding` (0px horizontal padding at 14px text) on a link-styled-as-button and a button; `flat-type-hierarchy` on `body` |

**Where they converge**: the `low-contrast` finding on `--accent` (`#3b82f6`) buttons independently matches Assessment A's own contrast math (~3.7:1) on the exact same elements — this is the strongest, best-corroborated finding in the whole critique.

**Where they diverge / false positives**: `gpt-thin-border-wide-shadow` on the modal form is likely a measurement artifact — Assessment B's own report flags a suspicious `0.555556px` computed border-width (probably a devicePixelRatio/zoom quirk from the automation session, not a real 1px-border-plus-shadow combo), and Assessment A independently verified no ghost-card pattern exists anywhere. `flat-type-hierarchy` is a generic-scan rule calibrated for brand surfaces expecting bold type contrast; Signal is explicitly product-register, where `reference/product.md` itself calls for a *tighter* scale (1.125–1.2 between steps) — so this flag is working against the register's own stated guidance, not a real defect. `nested-cards` on the sheet's textarea wrapper is technically accurate (border-in-border) but is a single functional input-group, not decorative card-stacking — minor at most.

**Visual overlays**: not left open in your browser — Assessment B injected the overlay, read the console evidence, and closed its tab as part of cleanup, so there's no live `[Human]`-tagged overlay tab to check right now. All findings above are the captured console evidence, not a still-visible highlight.

## Overall Impression

Signal doesn't look or feel AI-generated — it reads as a considered, restrained personal tool with real interaction craft (the swipe-to-complete tuning in particular). The gap isn't aesthetic, it's a handful of concrete gaps between what the app *promises* (WCAG AA throughout, "nothing is ever silently lost") and what it currently *does* (a ~3.7:1 button in the theme you actually use daily, a Delete that's one tap from Done with no safety net). The single biggest opportunity is closing that promise/reality gap on Delete and contrast — both are small, contained fixes, not redesigns.

## What's Working

- **The date-mode segmented selector with live helper copy** — a non-decorative, correctly-targeted fix for the real touch-UI problem that tooltips don't work on touch. Exactly what DESIGN.md prescribed and what shipped.
- **Swipe-to-complete craft** — the deliberately-high 120px threshold (code-commented: "a short, accidental swipe should never complete something"), the `pastQuickDone` visual escalation, and the spring-out exit animation before removal is the kind of interaction-level care that separates this from a generic to-do app.
- **Restrained, functional color** — confirmed live across all four views: one accent blue for actions/selection, semantic colors reserved for state, zero stray hues. Reads calm, which is the right register for a daily-triage tool.

## Priority Issues

**[P1] Dark-mode primary-button text fails the app's own AA contrast bar**
- **Why it matters**: PRODUCT.md commits to "WCAG AA contrast minimum throughout," and DESIGN.md calls dark mode "the real experience since this is used almost exclusively as an iPhone home-screen app" — so the one theme you actually use daily fails that commitment on every primary CTA (New Signal, Save, Connect Google Calendar, Enable daily reminder). Confirmed independently by both the design review (~3.7:1 computed) and the live detector overlay (3.7:1, needs 4.5:1) on the identical elements.
- **Fix**: Use a darker fill for text-bearing filled buttons in dark mode (e.g. reuse light mode's `#2563eb`-family blue for button backgrounds specifically, distinct from the lighter `--accent` used for borders/icons/soft tints), then re-verify contrast.
- **Suggested command**: `$impeccable harden`

**[P1] Delete is instant, unconfirmed, and unrecoverable**
- **Why it matters**: This is a personal memory tool whose entire premise is "trust it instead of asking an AI to remember." Delete sits one tap from Done in the same menu row, but unlike Done — which lands in a restorable Archive — a mis-tap on Delete destroys a note permanently. That directly contradicts the Archive's own empty-state promise ("nothing is ever silently lost"), which turns out to only be true for Done items.
- **Fix**: Either route Delete through the same soft-delete path as Done (a distinct "deleted" status, restorable for a window) or add one lightweight confirm step before permanent deletion.
- **Suggested command**: `$impeccable harden`

**[P2] Collapsed inline-menu controls stay focusable while visually hidden**
- **Why it matters**: Confirmed live — with the kebab menu closed (`grid-template-rows: 0fr` + `overflow:hidden`), the accessibility tree still lists Done/Edit/Delete as focusable buttons. A keyboard or screen-reader user tabs through three phantom controls per card before reaching the next card's real ones. The same collapsed-panel technique is reused for the details expander, so it's likely the same bug in two places.
- **Fix**: Toggle `inert` (or `aria-hidden` + `tabIndex={-1}`) on the collapsed wrapper alongside `menuOpen`/`detailsOpen`.
- **Suggested command**: `$impeccable harden`

**[P2] Settings page has cramped, low-contrast tap targets**
- **Why it matters**: The detector independently caught 0px horizontal padding on a link-styled-as-button and a button at 14px text on `/settings` (needs ≥8px), paired with the same `low-contrast` accent-blue issue as the P1 above. Two compounding issues on the same small set of controls.
- **Fix**: Add horizontal padding to match the rest of the app's button vocabulary; fixed by the same button-color fix above for the contrast half.
- **Suggested command**: `$impeccable layout`

**[P3] Small rough edges: dangling empty section header, undersized mobile tap targets**
- **Why it matters**: Flagging into Today's Signal leaves the "BACKLOG" header rendered above nothing — inconsistent with how Today's Signal already handles its own empty state with real copy. Separately, Archive's Restore/Delete-forever buttons are 40×40px and the search-input's clear "X" is only 20×20px near the input's worst-reach edge for one-handed thumb use (Casey persona) — both below the 44×44pt target this app has otherwise standardized on.
- **Fix**: Hide/replace the Backlog header when empty; bump Archive action buttons and the search-clear button to 44×44px to match the rest of the app.
- **Suggested command**: `$impeccable polish`

## Persona Red Flags

**Casey (distracted, one-handed mobile user)**: Core card controls (flag, kebab) are correctly 44×44px, but Archive's Restore/Delete-forever (40×40px) and the search-clear "X" (20×20px, near the input's right edge — the worst-reach zone for one-handed thumb use) fall below that bar. For someone tapping fast and distracted, the clear button is a real miss target.

**Riley (stress tester / edge cases)**: No `min` attribute on the Deadline/Specific-time date inputs — Riley would immediately save a past-dated signal with nothing stopping them client-side. Riley would also hammer the kebab open/close mid-swipe; the code defensively `stopPropagation`s on menu-row buttons, but those same rows stay live in the a11y tree while visually hidden (the P2 above) — precisely the class of latent bug this persona exists to surface.

**Sam (accessibility / keyboard / screen-reader)**: The clearest hit is the P2 finding — three phantom focusable buttons per card while the kebab menu is visually collapsed. On the positive side, native date/time inputs (not custom pickers) inherit OS-level accessibility for free, and Done has a full non-gesture fallback via the kebab menu, so swipe isn't the only path to completing a signal.

## Minor Observations

- Archive's weekday strip uses single-letter labels (M T W T F S S) — ambiguous for Tue/Thu and Sat/Sun at a glance, low-stakes for a single known user.
- The FAB/Save button's colored glow (`0 10px 30px -8px var(--accent)`) is legitimate (state-tied, not the banned ghost-card combo) but fairly saturated — worth a real-device check in a dark room.
- Settings' two cards correctly reuse the same icon-in-circle-badge language as the rest of the app — good system coherence.
- Empty-state copy ("Nothing yet." / "Tap New Signal below to add your first one.") is calm and matches the "confident, not decorative" brand personality.
- Swipe-right-to-complete inverts iOS's own swipe-left destructive/reveal convention — a defensible, deliberate choice per the code's comments, but worth validating against real daily use rather than assuming it's never caused a mis-swipe.
- `flat-type-hierarchy` and `gpt-thin-border-wide-shadow` detector flags are noted above as register-appropriate / likely measurement artifact respectively — no action recommended.
- The live app currently has zero active signals and one archived item, reported as genuine current personal data, not a test artifact.

## Questions to Consider

- Delete and Done carry very different weight (permanent vs. archived-and-recoverable) but are one tap apart with no visual distinction — should the UI signal irreversibility at the point of action?
- "Today's Signal" is the one manual decision that matters — should being flagged change a card's own visual treatment (accent border, elevated surface), rather than relying entirely on section placement plus a filled-vs-outline flag icon?
- The sheet defers flagging to a separate, later step from the list — is that two-step create-then-commit actually fastest for the common case (capturing something you already know is for today), or would a single optional "add to today" toggle inside the sheet save a step without reintroducing a third manual bucket?
