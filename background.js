/* =============================================================================
 * background.js — service worker (MV3)
 * Auto-resolves each page, sets a per-tab badge, and notifies on matches.
 * ===========================================================================*/

importScripts("data.js", "resolver.js");

// Per-session dedupe so we don't notify repeatedly for the same domain.
const notifiedThisSession = new Set();
// Remember last result per tab so we can repaint the badge on tab switch.
const lastByTab = new Map();

const BADGE_COLORS = {
  "v-high": "#cc3a3a",
  "v-mid":  "#b8881f",
  "v-low":  "#3f9d6b",
  "v-id":   "#3f7fb0",
  "v-na":   "#3f7fb0",
  "v-none": "#566058"
};

function paintBadge(tabId, res) {
  const band = OL.classify(res);
  let text = "";
  if (band.pct != null) text = Math.round(band.pct) + "";       // e.g. "19"
  else if (band.cls === "v-na") text = "N/A";
  else if (band.cls === "v-id") text = "?";
  try {
    chrome.action.setBadgeBackgroundColor({ color: BADGE_COLORS[band.cls] || "#566058", tabId });
    chrome.action.setBadgeText({ text, tabId });
    chrome.action.setTitle({
      tabId,
      title: res.company ? `${res.company} — ${band.label}` : "No Kings"
    });
  } catch (e) {}
}

async function maybeNotify(res) {
  const band = OL.classify(res);
  if (band.pct == null || band.pct < 0) return;
  const settings = await OL.getSettings();
  if (!settings.notifyEnabled) return;
  if (band.pct < settings.threshold) return;
  if (await OL.isDomainMuted(res.domain)) return;
  if (settings.notifySilent) return;
  if (notifiedThisSession.has(res.domain)) return;
  notifiedThisSession.add(res.domain);

  const controlLine = res.controlledBy ? `\n⚑ Actual control: ${res.controlledBy}` : "";
  try {
    chrome.notifications.create("ol:" + res.domain + ":" + Date.now(), {
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: `${band.label} — ${band.pct.toFixed(1)}%`,
      message:
        `${res.company} (${res.ticker || "—"}) is ${band.pct.toFixed(1)}% held by ` +
        `Vanguard + BlackRock + State Street combined.${controlLine}`,
      buttons: [{ title: "Don't show for this site" }],
      priority: 1
    });
  } catch (e) {}
}

async function processTab(tabId, url) {
  if (!url || !/^https?:\/\//.test(url)) {
    try { chrome.action.setBadgeText({ text: "", tabId }); } catch (e) {}
    return;
  }
  const res = await OL.resolve(url);
  lastByTab.set(tabId, res);
  if (res.status === "unknown") {
    try { chrome.action.setBadgeText({ text: "", tabId }); } catch (e) {}
    return;
  }
  paintBadge(tabId, res);
  maybeNotify(res);
}

// Fire when a page finishes loading.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab && tab.url) {
    processTab(tabId, tab.url);
  }
});

// Repaint badge when switching tabs (badge text is per-tab).
chrome.tabs.onActivated.addListener(({ tabId }) => {
  const cached = lastByTab.get(tabId);
  if (cached && cached.status !== "unknown") paintBadge(tabId, cached);
  else chrome.tabs.get(tabId, (t) => { if (t && t.url) processTab(tabId, t.url); });
});

chrome.tabs.onRemoved.addListener((tabId) => lastByTab.delete(tabId));

// Clear the per-session notify dedupe roughly daily.
chrome.runtime.onInstalled.addListener(() => notifiedThisSession.clear());

chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
  if (buttonIndex !== 0) return;
  const domain = notificationId.split(":")[1];
  if (domain) await OL.muteDomain(domain);
  try { chrome.notifications.clear(notificationId); } catch (e) {}
});

chrome.notifications.onClicked.addListener((notificationId) => {
  try { chrome.notifications.clear(notificationId); } catch (e) {}
});

function recheckActiveTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const t = tabs && tabs[0];
    if (t && t.url) {
      notifiedThisSession.delete(OL.normalizeDomain(t.url));
      processTab(t.id, t.url);
    }
  });
}

// Settings are saved in the service worker so writes survive popup close (MV3).
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === "saveSettings") {
    OL.setSettings(msg.settings || {}).then((merged) => {
      if (msg.recheck) recheckActiveTab();
      sendResponse({ ok: true, settings: merged });
    });
    return true;
  }
  if (msg && msg.type === "recheck") {
    recheckActiveTab();
  }
  return false;
});
