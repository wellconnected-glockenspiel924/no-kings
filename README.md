# Ownership Lens — Asset Surveillance Terminal

A Chrome extension (Manifest V3) that checks whether the website you're currently
viewing is **(partly) held by the "Big Three" asset managers** — Vanguard,
BlackRock, and State Street — and reports the combined stake, the sector, and,
crucially, **who actually controls the company**.

Built as an educational demo of the popular *"BlackRock/Vanguard owns everything"*
narrative.

---

## Install (load unpacked)

1. Open Chrome and go to `chrome://extensions`
2. Toggle **Developer mode** ON (top-right)
3. Click **Load unpacked**
4. Select this folder (`asset-surveillance-extension`)
5. Pin the extension and click its icon on any site (try `apple.com`, `disney.com`, `walmart.com`)

> Works in Edge and Brave too (same `chrome://extensions` flow).

There's also a **MANUAL QUERY** box in the popup so you can demo any tracked
domain during your presentation without navigating away, plus a
**VIEW ALL TRACKED ENTITIES** list ranked by combined stake.

---

## How it works

```
active tab URL ──▶ extract registrable domain (eTLD+1)
               ──▶ look up in OWNERSHIP_DB (data.js)
               ──▶ classify by combined Big-Three %  ──▶ render verdict
```

Verdict bands (by combined Vanguard + BlackRock + State Street stake):

| Band            | Threshold        | Colour |
|-----------------|------------------|--------|
| HEAVILY HELD    | ≥ 15%            | red    |
| PARTLY HELD     | 8–15%            | amber  |
| LIGHTLY HELD    | > 0–8%           | green  |
| CLAIM N/A       | privately held   | blue   |
| NOT IN DATABASE | unknown domain   | grey   |

## Files

| File            | Purpose                                              |
|-----------------|------------------------------------------------------|
| `manifest.json` | MV3 config; requests `activeTab` + `tabs`            |
| `popup.html`    | Popup markup                                          |
| `popup.css`     | "Surveillance terminal" dossier theme                |
| `popup.js`      | Tab detection, domain parsing, lookup, rendering     |
| `data.js`       | The ownership dataset (read the header comment!)     |
| `icons/`        | Toolbar icons (16/48/128)                            |

---

## ⚠️ Honesty notes for your exam (important)

This is the part that turns a meme into a real project — own these points:

1. **The data is illustrative and static.** The percentages are approximate,
   rounded, and frozen. They are *not* live. A production version would query
   SEC EDGAR 13F filings or a financial-data API at runtime. Say this up front.

2. **The Big Three appearing everywhere is real — but mundane.** They run index
   funds and ETFs and hold those shares *on behalf of millions of ordinary
   investors* (pensions, 401(k)s). "Vanguard owns 8% of Apple" really means the
   holders of Vanguard's funds collectively do.

3. **The control flags are the point.** Notice how many "owned by them"
   companies are actually **family- or founder-controlled** via dual-class
   shares — Walmart (Walton family), Meta (Zuckerberg), The New York Times
   (Sulzberger family), Fox/News Corp (Murdoch trust), Nike (Knight), Alphabet
   (Page & Brin). The extension surfaces this to show the simplistic narrative
   omits who actually holds *voting control*.

4. **The `calm.com` case** is deliberately included: it's privately held, so the
   public-shareholder claim doesn't even mechanically apply. A good example of a
   brand that gets swept into "they own this too" lists incorrectly.

A strong framing for the display: *"This tool reproduces the conspiracy claim —
and then shows exactly where it falls apart."*

---

# v2.0 — Accuracy upgrade + notifications

## What's new
- **Background service worker** (`background.js`): every page load is auto-resolved.
- **Toolbar badge**: shows the combined Big-Three % right on the icon, colour-coded by band (red/amber/green/blue). Per-tab.
- **Desktop notification**: fires when the combined stake crosses your threshold — once per domain per session, so it doesn't nag.
- **Wikidata resolver** (`resolver.js`): for domains not in the static list, it searches Wikidata, confirms via the official-website property, climbs the `parent organization`/`owned by` chain to the listed parent, and reads the ticker. No API key needed.
- **Confidence + source chips**: every verdict is labelled `exact` (static DB) / `high` / `medium` / `low`, and `STATIC DB` / `WIKIDATA` / `+ LIVE`.
- **Caching**: results cached 24h in `chrome.storage.local`.
- **Settings panel** (⚙): toggle notifications, set the threshold, and paste an optional live-data key.
- **Live-data adapter**: with a (free) Financial Modeling Prep key, real institutional holdings replace the static numbers. Key is stored locally only and sent only to the data provider.

## New file
| File            | Purpose                                               |
|-----------------|-------------------------------------------------------|
| `background.js` | Service worker: auto-detect, badge, notifications     |
| `resolver.js`   | Shared resolve/classify/cache/Wikidata/live-data      |

## ⚠️ Testing note (say this if asked)
The **offline paths** (static dataset, classification, badge logic, caching, settings) are verified. The **Wikidata and live-data network paths** could not be exercised in the build environment — validate them in Chrome. Everything degrades gracefully: if a network call fails, you fall back to the static dataset or a clean "NOT RESOLVED" state, so the demo never breaks.

## How the accuracy improves (the defensible version)
Accuracy = *resolution* × *data*. v1 had a fixed 35-domain map and illustrative numbers. v2 adds a real resolution layer (Wikidata parent-chain) so arbitrary domains map to the correct *listed parent*, a live-data adapter for real ownership %, caching, and a confidence score so the tool is honest about how sure it is rather than silently wrong. The static dataset remains the always-works fallback and the offline demo path.
