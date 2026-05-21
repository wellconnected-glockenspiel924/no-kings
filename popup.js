/* =============================================================================
 * popup.js — Ownership Lens popup (v2: async resolution + settings)
 * Depends on globals: OWNERSHIP_DB, BIG_THREE (data.js) and OL (resolver.js)
 * ===========================================================================*/

(function () {
  "use strict";

  const resultEl = document.getElementById("result");

  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  /* ---- rendering ---------------------------------------------------------*/
  function renderResult(res) {
    if (!res || res.status === "unknown") return renderUnknown(res ? res.domain : "");

    const band = OL.classify(res);
    const holders = res.holders || {};
    const maxPct = Math.max(10, 1, ...Object.values(holders));

    const bars = Object.entries(holders)
      .sort((a, b) => b[1] - a[1])
      .map(([name, pct]) => `
        <div class="holder">
          <div class="holder-top"><span class="h-name">${esc(name)}</span><span class="h-pct">${pct.toFixed(1)}%</span></div>
          <div class="bar"><span style="width:${(pct / maxPct * 100).toFixed(1)}%"></span></div>
        </div>`).join("");

    const combined = (res.type === "private" || Object.keys(holders).length === 0) ? "" : `
      <div class="combined">
        <span class="c-label">COMBINED BIG-THREE STAKE</span>
        <span class="c-val">${OL.sumBigThree(holders).toFixed(1)}%</span>
      </div>`;

    const control = res.controlledBy ? `
      <div class="callout control"><span class="c-head">⚑ ACTUAL CONTROL</span><b>${esc(res.controlledBy)}</b></div>` : "";
    const note = res.note ? `
      <div class="callout note"><span class="c-head">NOTE</span>${esc(res.note)}</div>` : "";

    const confClass = res.confidence || "";
    const srcLabel = ({ "local": "STATIC DB", "wikidata": "WIKIDATA",
      "local+live": "DB + LIVE", "wikidata+live": "WIKIDATA + LIVE" })[res.source] || (res.source || "").toUpperCase();

    return `
      <div class="target">
        <span class="domain">${esc(res.domain)}</span>
        <span class="tag">RESOLVED</span>
      </div>
      <div class="chips">
        ${res.confidence ? `<span class="chip ${confClass}">CONFIDENCE · ${esc(res.confidence)}</span>` : ""}
        ${srcLabel ? `<span class="chip src">SOURCE · ${esc(srcLabel)}</span>` : ""}
      </div>
      <div class="verdict ${band.cls}">
        ${band.pct != null ? `<span class="v-pct">${band.pct.toFixed(1)}%</span>` : ""}
        <div class="v-label">${band.label}</div>
        ${band.sub ? `<div class="v-sub">${esc(band.sub)}</div>` : ""}
      </div>
      <div class="company">${esc(res.company || "—")}${res.ticker ? `<span class="ticker">${esc(res.ticker)}</span>` : ""}</div>
      <div class="sector">SECTOR · ${esc(res.sector || "—")}</div>
      <div class="holders">${bars}</div>
      ${combined}
      ${control}
      ${note}`;
  }

  function renderUnknown(domain) {
    return `
      <div class="target"><span class="domain">${esc(domain || "—")}</span><span class="tag">UNRESOLVED</span></div>
      <div class="verdict v-none"><div class="v-label">NOT RESOLVED</div>
        <div class="v-sub">Couldn't identify the operating company.</div></div>
      <div class="callout note"><span class="c-head">WHY?</span>
        Not in the static dataset, and Wikidata resolution returned nothing usable
        (or the network was blocked). Try a tracked entity below, or a different domain.</div>`;
  }

  async function show(input) {
    resultEl.innerHTML = `<div class="scanning">Resolving…</div>`;
    try {
      const res = await OL.resolve(input);
      resultEl.innerHTML = renderResult(res);
    } catch (e) {
      resultEl.innerHTML = renderUnknown(input);
    }
  }

  /* ---- active tab --------------------------------------------------------*/
  function init() {
    if (typeof chrome === "undefined" || !chrome.tabs) {
      resultEl.innerHTML = renderUnknown("(no active tab — open in browser)");
      return;
    }
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs && tabs[0] && tabs[0].url ? tabs[0].url : "";
      if (!url || /^chrome|^edge|^about/.test(url)) {
        resultEl.innerHTML = renderUnknown("(browser page — no website)");
        return;
      }
      show(url);
    });
  }

  /* ---- manual query ------------------------------------------------------*/
  const input = document.getElementById("manual");
  const go = document.getElementById("go");
  const runManual = () => { const v = input.value.trim(); if (v) show(v); };
  go.addEventListener("click", runManual);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") runManual(); });

  /* ---- settings ----------------------------------------------------------*/
  const settingsPanel = document.getElementById("settings");
  document.getElementById("settings-btn").addEventListener("click", async () => {
    if (settingsPanel.hidden) {
      const s = await OL.getSettings();
      document.getElementById("set-notify").checked = !!s.notifyEnabled;
      document.getElementById("set-threshold").value = s.threshold;
      document.getElementById("set-key").value = s.fmpApiKey || "";
    }
    settingsPanel.hidden = !settingsPanel.hidden;
  });
  document.getElementById("set-save").addEventListener("click", async () => {
    await OL.setSettings({
      notifyEnabled: document.getElementById("set-notify").checked,
      threshold: Number(document.getElementById("set-threshold").value) || 15,
      fmpApiKey: document.getElementById("set-key").value.trim()
    });
    settingsPanel.hidden = true;
    try { chrome.runtime.sendMessage({ type: "recheck" }); } catch (e) {}
    init(); // re-resolve current tab with new settings
  });

  /* ---- view all (static dataset) -----------------------------------------*/
  const toggle = document.getElementById("toggle-all");
  const allList = document.getElementById("all-list");
  let built = false;
  toggle.addEventListener("click", () => {
    if (!allList.hidden) {
      allList.hidden = true; toggle.textContent = "▸ VIEW ALL TRACKED ENTITIES"; return;
    }
    if (!built) {
      const seen = new Set();
      allList.innerHTML = Object.entries(OWNERSHIP_DB)
        .filter(([, e]) => { if (seen.has(e.company)) return false; seen.add(e.company); return true; })
        .map(([dom, e]) => {
          const isPriv = e.type === "private";
          const c = isPriv ? null : OL.sumBigThree(e.holders);
          const band = OL.classify({ type: e.type, holders: e.holders });
          return { dom, e, c, cls: band.cls, sort: c == null ? -1 : c };
        })
        .sort((a, b) => b.sort - a.sort)
        .map((r) => `
          <div class="all-row" data-dom="${esc(r.dom)}">
            <div><div class="ar-name">${esc(r.e.company)}</div><div class="ar-dom">${esc(r.dom)}</div></div>
            <div class="ar-pct ${r.cls}">${r.c == null ? "N/A" : r.c.toFixed(0) + "%"}</div>
          </div>`).join("");
      allList.querySelectorAll(".all-row").forEach((row) =>
        row.addEventListener("click", () => { show(row.getAttribute("data-dom")); window.scrollTo({ top: 0, behavior: "smooth" }); }));
      built = true;
    }
    allList.hidden = false; toggle.textContent = "▾ HIDE TRACKED ENTITIES";
  });

  init();
})();
