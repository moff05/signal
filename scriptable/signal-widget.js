// Signal home-screen widget.
//
// Setup:
// 1. Install the free "Scriptable" app from the App Store.
// 2. Create a new script in Scriptable, paste this whole file in.
// 3. Fill in CONFIG.token below with your WIDGET_TOKEN (from .env.local /
//    Vercel project env vars) — never commit your real token to this file.
// 4. Long-press your home screen -> + -> Scriptable -> pick this script,
//    small or medium size.

const CONFIG = {
  apiUrl: "https://signal-drab-omega.vercel.app/api/widget",
  token: "PASTE_YOUR_WIDGET_TOKEN_HERE",
};

async function fetchSignals() {
  const req = new Request(`${CONFIG.apiUrl}?token=${CONFIG.token}`);
  req.timeoutInterval = 10;
  try {
    const data = await req.loadJSON();
    return { signals: data.signals ?? [], streak: data.streak ?? 0 };
  } catch {
    return { signals: null, streak: 0 };
  }
}

function buildWidget(signals, streak) {
  const widget = new ListWidget();
  widget.backgroundColor = new Color("#0a0a0a");
  widget.url = "https://signal-drab-omega.vercel.app";

  const header = widget.addStack();
  const title = header.addText("SIGNAL");
  title.font = Font.boldSystemFont(12);
  title.textColor = new Color("#22c55e");
  if (streak > 0) {
    header.addSpacer();
    const streakText = header.addText(`🔥${streak}`);
    streakText.font = Font.systemFont(11);
    streakText.textColor = new Color("#9ca3af");
  }
  widget.addSpacer(6);

  if (signals === null) {
    const err = widget.addText("Couldn't load");
    err.font = Font.systemFont(13);
    err.textColor = new Color("#9ca3af");
  } else if (signals.length === 0) {
    const empty = widget.addText("Nothing chosen for today");
    empty.font = Font.systemFont(13);
    empty.textColor = new Color("#9ca3af");
  } else {
    for (const signal of signals.slice(0, 5)) {
      const row = widget.addStack();
      row.centerAlignContent();

      const dot = row.addText("●");
      dot.font = Font.systemFont(10);
      dot.textColor = new Color("#22c55e");
      row.addSpacer(4);

      const text = row.addText(signal.text);
      text.font = Font.systemFont(13);
      text.textColor = new Color("#f5f5f5");
      text.lineLimit = 1;

      widget.addSpacer(4);
    }
  }

  // A hint only — iOS ultimately controls actual WidgetKit refresh timing —
  // but requesting a tighter interval improves the odds of fresher data.
  widget.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);
  return widget;
}

const { signals, streak } = await fetchSignals();
const widget = buildWidget(signals, streak);

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  widget.presentMedium();
}
Script.complete();
