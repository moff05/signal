# Signal — future ideas

Not scoped, not scheduled. Just captured so they don't get lost.

## Voice capture — add a signal by talking to it

**The want:** capture a signal without opening the app or typing — say it out loud (e.g. "Hey Siri, add a signal: pick up dry cleaning") and it just shows up in the backlog.

**Why it fits:** matches Design Principle 4 ("capture speed over form completeness") better than typing does for the common case of "I just thought of something, log it and get back to what I was doing."

**How to actually build it — iOS Shortcuts + Siri:**
- Create a Shortcut in the iOS Shortcuts app with a custom Siri phrase (e.g. "Add a signal").
- The Shortcut prompts for dictated text (or takes it directly from the Siri phrase itself), then does an HTTP POST to Signal's existing `/api/signals` endpoint — the same multipart form-data shape the web app already sends (`text` field, done).
- Auth: reuse the same pattern already built for the Scriptable widget — a long-lived token (`WIDGET_TOKEN` env var) checked server-side, since Shortcuts can't do cookie-based session auth. Would need either a small dedicated token-gated capture endpoint (mirroring `/api/widget`, but for writes instead of reads) or a way to pass the token as a header/query param on `/api/signals` itself.
- Once built once, "Hey Siri, add a signal" works from anywhere — locked phone, CarPlay, AirPods — no app open required.

**Cheaper stopgap that already works today, no build needed:** iOS's built-in dictation (the microphone key on the keyboard) already works in Signal's own note field. Open the app, tap New Signal, tap the mic, talk, save. Not hands-free/Siri-triggered, but zero engineering — worth remembering this exists before over-building the Shortcuts version.

**Open questions for later:** should the Shortcut auto-summarize (dumping it straight through the existing Groq title-condensing path) or always store dictated text verbatim as the title? Should there be a second Siri phrase for "what's my Signal today?" that reads the flagged items back via Siri's own voice, using the same data the widget already pulls?
