---
target: signal (whole app)
total_score: 33
p0_count: 0
p1_count: 2
timestamp: 2026-08-10T14-06-01Z
slug: signal-whole-app
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Optimistic list mutations (toggle/done/delete/restore) give no feedback on failure. |
| 2 | Match System / Real World | 4 | n/a — language matches the user's own mental model exactly. |
| 3 | User Control and Freedom | 4 | Delete-to-Archive-with-Restore fix genuinely landed; Cancel/backdrop always available. |
| 4 | Consistency and Standards | 3 | Focus-visible styling inconsistent: rich accent ring on inputs, browser-default hairline on every button/link. |
| 5 | Error Prevention | 3 | Swipe threshold + soft-delete are strong, but Archive's "Delete forever" is one un-confirmed, irreversible tap. |
| 6 | Recognition Rather Than Recall | 4 | Icon+label+live helper copy everywhere; badge+icon never color-alone. |
| 7 | Flexibility and Efficiency | 3 | Swipe + kebab both work; search correctly gated behind >8 items. |
| 8 | Aesthetic and Minimalist Design | 4 | Genuinely on-brief against the anti-references list. |
| 9 | Error Recovery | 2 | Only the create/edit form checks `res.ok`; every other mutation fails silently. |
| 10 | Help and Documentation | 3 | Formally n/a (single user, no onboarding needed), but in-context helper text substitutes appropriately. |
| **Total** | | **33/40** | **Good — up from 30/40, real gains plus new, sharper findings** |

## Anti-Patterns Verdict

**Not slop.** Restrained one-accent-plus-semantic-color palette, no gradients/glassmorphism/stat-grids, terse honest copy, and implementation details ( the 120px swipe threshold's own comment, `inert` on the collapsed menu, the `--accent-fill` token's own explanatory comment) that only come from someone actually deciding tradeoffs.

**Deterministic scan**: CLI scan (`detect.mjs` over `app`/`public`) is clean again (`[]`). The live overlay confirms the fixes landed where intended, with one leftover inconsistency:

| Prior finding | Status now |
|---|---|
| `low-contrast` (white on `#3b82f6`) — FAB, Save, 2 Settings buttons | **Fixed** — all four now compute `#2563eb` background, ~5.2:1, clears AA. |
| `cramped-padding` — 2 Settings buttons | **Fixed** — both now compute 16px horizontal padding. |
| `dark-glow` — FAB, Save, 2 Settings buttons | **Half-fixed** — the 2 Settings buttons are clean (no shadow). FAB and Save still glow in the *old* lighter blue (`#3b82f6`) because their `box-shadow` still reads `var(--accent)` while `background` moved to the new `var(--accent-fill)` — the two tokens now mismatch on the same element. |
| `flat-type-hierarchy` on `body` | Persists — as before, this is a generic-scan rule fighting the product register's own deliberately tight type scale (`reference/product.md` calls for 1.125–1.2 ratios). No action recommended. |
| `gpt-thin-border-wide-shadow` on the sheet modal form | Persists, unchanged — still reads a suspicious `0.555556px` border, consistent with the earlier read that it's a rendering/measurement artifact rather than a real ghost-card pattern. No action recommended. |
| `nested-cards` on the sheet's textarea wrapper | Persists, unchanged — one functional input-group border, not decorative stacking. Minor at most. |

## Overall Impression

The fixes were real, not cosmetic — both assessors independently confirmed contrast, padding, and soft-delete actually work as shipped, not just claimed. The score moved because of that, not in spite of it. What's left is sharper and smaller: a focus-visible rule that only covers a third of the interactive surface, and a genuinely new catch — now that Delete is safe everywhere else, Archive's own permanent "Delete forever" stands out as the one remaining spot where a slip of the thumb is instant and silent, right where a user is likely tapping fastest (cleanup mode).

## What's Working

- **The soft-delete fix is load-bearing, not decorative** — `deleteSignal` genuinely PATCHes to `status: 'deleted'`, and Archive's "nothing is ever silently lost" copy is now actually true for that path.
- **The contrast fix is systemic** — `--accent-fill` is used consistently across every primary CTA, verified live via computed style on all of them.
- **The segmented-selector pattern remains a standout** — icon + label + live helper copy, confirmed working for every date mode and repeat state.

## Priority Issues

**[P1] Focus-visible fix covers inputs but not buttons or links**
- **Why it matters**: last round's finding was scoped as "no focus indicator on any input" and got fixed exactly as scoped — but the app is majority-buttons (kebab, flag, chips, Cancel/Save, Archive actions, nav icons), and all of those still fall back to a near-invisible browser-default hairline. Verified live: a focused chip's outline is barely distinguishable from its own "selected" border.
- **Fix**: extend the same rule — `button:focus-visible, a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }`.
- **Suggested command**: `$impeccable harden`

**[P1] Archive's "Delete forever" is the one remaining instant, unconfirmed, permanent action — and it's color-coded as safe**
- **Why it matters**: this is a new catch, not a leftover from last round — it only became visible as a double standard once the main-list Delete became safe. The Trash2 icon here uses the same neutral gray as Restore, while the *reversible* delete upstream correctly uses urgent red. For a sole owner with no other backup of this data, the one place the app's careful anti-accident work doesn't reach is exactly where someone moves fastest (cleanup mode).
- **Fix**: give it the urgent-red treatment consistent with the rest of the app, and/or add a lightweight confirm step.
- **Suggested command**: `$impeccable harden`

**[P2] Optimistic UI updates never check for failure or roll back**
- **Why it matters**: `toggleSignal`, `markDone`, `deleteSignal`, `restore`, and `deleteForever` all mutate local state immediately without checking `res.ok`. On a flaky connection, a failed action looks identical to a successful one — the item just vanishes — quietly reintroducing the exact "I thought this was captured" failure mode the app exists to eliminate. Only the create/edit sheet currently handles this correctly.
- **Fix**: revert local state on a non-ok response and surface a small inline error, matching the sheet's existing pattern.
- **Suggested command**: `$impeccable harden`

**[P3] Focus ring and "selected" state use the same visual language**
- **Why it matters**: once the P1 above is fixed, a focused-but-unselected chip and a selected-but-unfocused chip will still both read as "accent blue border" — hard to tell apart at a glance. Minor since touch is ~95% of usage, but PRODUCT.md names occasional laptop use.
- **Fix**: differentiate focus (e.g. `--accent-hi` or an offset ring) from selection (the current soft-fill treatment).
- **Suggested command**: `$impeccable polish`

**[P3] Button glow shadow still references the old accent color**
- **Why it matters**: small, purely visual — the FAB and Save button's `box-shadow` still points at `var(--accent)` (the lighter dark-mode blue) while their `background` moved to `var(--accent-fill)`, so the glow no longer matches the button it's glowing around.
- **Fix**: point the `boxShadow` at `var(--accent-fill)` too, in `app/page.tsx`, `app/components/SignalSheet.tsx`, and `app/login/page.tsx`.
- **Suggested command**: `$impeccable polish`

No P0s this round — nothing currently broken or blocking.

## Persona Red Flags

**Sam (cautious, worried about breaking things)**: would hit Archive's cleanup flow expecting the same safety the rest of the app just earned, and lose something permanently on a fast, muscle-memory tap — right after the app trained them that delete is safe.

**Alex (occasional laptop/keyboard use, per PRODUCT.md)**: tabbing through the sheet gets a crisp ring on the two text fields and an almost-invisible native hairline on every chip and button — inconsistent, and indistinguishable from the chips' own selected styling.

**Riley (relies on visible affordances, not memory)**: benefits from the app's real "icon+color together, never alone" discipline elsewhere, but gets no such cue on Archive's delete-forever — no color, no confirm, nothing to interrupt a fast tap.

## Minor Observations

- The hidden file input for "Attach a photo" isn't reachable via Tab — its wrapping `label` isn't independently focusable, so there's currently no keyboard-only path to attach a photo.
- The streak strip's `aria-label` is only set on hit days; the non-hit days are silent to a screen reader.
- Both `flat-type-hierarchy` and `gpt-thin-border-wide-shadow` detector flags are unchanged from last round and still read as register-appropriate / a measurement artifact respectively — no action recommended.

## Questions to Consider

- If Delete is now safe everywhere else, why is Archive — of all screens — the one place a slip of the thumb is still permanent and silent?
- Does an un-checked optimistic update that can silently fail quietly reintroduce the exact "silently losing track of things" failure mode this app exists to eliminate?
- Inputs got a deliberate, on-brand focus ring; buttons didn't — was that an intentional scope decision, or just where the CSS selector happened to stop?
