/* =============================================================================
 * resolver.js — shared resolution + classification logic
 * Loaded by BOTH the service worker (importScripts) and the popup (<script>).
 * No DOM access here — only `self`, `fetch`, `chrome`.
 *
 * Depends on globals from data.js: OWNERSHIP_DB, BIG_THREE
 * ===========================================================================*/

(function () {
  "use strict";

  const DEFAULT_SETTINGS = {
    notifyEnabled: true,
    notifySilent: false,  // badge only — skip OS popups on navigation
    threshold: 15,        // combined Big-Three % at/above which we notify
    fmpApiKey: "",        // optional, user-supplied, stored locally only
    mutedDomains: [],     // eTLD+1 domains the user never wants notified
    ttlMs: 1000 * 60 * 60 * 24 // cache results for 24h
  };

  const MULTI_TLD = [
    "co.uk","org.uk","ac.uk","gov.uk","co.jp","or.jp","ne.jp","com.au",
    "net.au","org.au","co.nz","com.br","com.cn","com.mx","co.in","co.za",
    "com.sg","com.tr"
  ];

  function normalizeDomain(input) {
    if (!input) return "";
    let host = input;
    try { if (/^https?:\/\//.test(input)) host = new URL(input).hostname; } catch (e) {}
    host = host.toLowerCase().replace(/^www\./, "").trim();
    const parts = host.split(".").filter(Boolean);
    if (parts.length <= 2) return host;
    const last2 = parts.slice(-2).join(".");
    const last3 = parts.slice(-3).join(".");
    return MULTI_TLD.includes(last2) ? last3 : last2;
  }

  function sumBigThree(holders) {
    if (!holders) return 0;
    return BIG_THREE.reduce((a, n) => a + (holders[n] || 0), 0);
  }

  /** Verdict band. `res` is a normalized result object. */
  function classify(res) {
    if (!res || res.status === "unknown")
      return { cls: "v-none", label: "NOT RESOLVED", sub: "Couldn't identify an operator", pct: null };
    if (res.type === "private")
      return { cls: "v-na", label: "CLAIM N/A", sub: "Privately held — no public shares", pct: null };
    const holders = res.holders || {};
    if (Object.keys(holders).length === 0)
      return { cls: "v-id", label: "COMPANY IDENTIFIED", sub: "No ownership data — add a live-data key", pct: null };
    const c = sumBigThree(holders);
    if (c >= 15) return { cls: "v-high", label: "HEAVILY HELD", sub: "High combined Big-Three stake", pct: c };
    if (c >= 8)  return { cls: "v-mid",  label: "PARTLY HELD",  sub: "Significant minority stake", pct: c };
    if (c > 0)   return { cls: "v-low",  label: "LIGHTLY HELD", sub: "Small combined stake", pct: c };
    return { cls: "v-none", label: "NO STAKE FOUND", sub: "", pct: 0 };
  }

  /* ---- settings + cache (chrome.storage.local) --------------------------- */
  function getSettings() {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get("settings", (o) =>
          resolve(Object.assign({}, DEFAULT_SETTINGS, (o && o.settings) || {})));
      } catch (e) { resolve(Object.assign({}, DEFAULT_SETTINGS)); }
    });
  }
  function setSettings(patch) {
    return getSettings().then((s) => new Promise((resolve) => {
      const merged = Object.assign({}, s, patch);
      chrome.storage.local.set({ settings: merged }, () => resolve(merged));
    }));
  }
  async function isDomainMuted(domain) {
    const s = await getSettings();
    return (s.mutedDomains || []).includes(domain);
  }
  async function muteDomain(domain) {
    const s = await getSettings();
    const muted = s.mutedDomains || [];
    if (muted.includes(domain)) return s;
    return setSettings({ mutedDomains: muted.concat(domain) });
  }
  function cacheGet(key) {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get(key, (o) => {
          const v = o && o[key];
          if (v && v.expires > Date.now()) resolve(v.data);
          else resolve(null);
        });
      } catch (e) { resolve(null); }
    });
  }
  function cacheSet(key, data, ttlMs) {
    try { chrome.storage.local.set({ [key]: { data, expires: Date.now() + ttlMs } }); } catch (e) {}
  }

  /* ---- Wikidata resolution (no API key) ---------------------------------- *
   * Best-effort. Steps:
   *   1. name-search the second-level domain token (e.g. "disney")
   *   2. confirm a candidate via its official-website (P856) matching the domain
   *   3. climb parent-organization (P749) / owned-by (P127) to a LISTED parent
   *   4. read its ticker symbol (P249, as main snak or qualifier)
   * NOTE: network paths could not be tested in the build sandbox — verify in
   * Chrome. Everything degrades gracefully to the static dataset on failure.
   * -----------------------------------------------------------------------*/
  const WD_API = "https://www.wikidata.org/w/api.php";

  function wdGet(params) {
    const qs = new URLSearchParams(Object.assign({ format: "json", origin: "*" }, params));
    return fetch(`${WD_API}?${qs.toString()}`).then((r) => r.json());
  }
  function firstClaimId(ent, prop) {
    try {
      const c = ent.claims[prop][0].mainsnak.datavalue.value;
      return c.id || null;
    } catch (e) { return null; }
  }
  function getTicker(ent) {
    if (!ent || !ent.claims) return null;
    // P249 = ticker symbol; may be a main statement or a qualifier on P414.
    try { if (ent.claims.P249) return ent.claims.P249[0].mainsnak.datavalue.value; } catch (e) {}
    try {
      for (const st of (ent.claims.P414 || [])) {
        const q = st.qualifiers && st.qualifiers.P249;
        if (q && q[0]) return q[0].datavalue.value;
      }
    } catch (e) {}
    return null;
  }
  function labelOf(ent, domain) {
    try { return ent.labels.en.value; } catch (e) { return domain; }
  }

  async function wikidataResolve(domain) {
    try {
      const sld = domain.split(".").slice(-2, -1)[0] || domain;
      const search = await wdGet({ action: "wbsearchentities", search: sld,
        language: "en", type: "item", limit: "6" });
      if (!search.search || !search.search.length) return null;

      const ids = search.search.map((s) => s.id).join("|");
      const det = await wdGet({ action: "wbgetentities", ids, props: "claims|labels" });

      // Prefer the candidate whose official website matches the domain.
      let chosen = null, confidence = "medium";
      for (const s of search.search) {
        const ent = det.entities[s.id];
        if (!ent || !ent.claims || !ent.claims.P856) continue;
        const hit = ent.claims.P856.some((c) => {
          try { return String(c.mainsnak.datavalue.value).includes(domain); } catch (e) { return false; }
        });
        if (hit) { chosen = { id: s.id, ent }; confidence = "high"; break; }
      }
      if (!chosen) { const s0 = search.search[0]; chosen = { id: s0.id, ent: det.entities[s0.id] }; }

      // Climb to a listed parent if the matched entity has no ticker.
      let cur = chosen.ent, ticker = getTicker(cur), climbs = 0;
      const visited = new Set([chosen.id]);
      while (!ticker && climbs < 3) {
        const pid = firstClaimId(cur, "P749") || firstClaimId(cur, "P127");
        if (!pid || visited.has(pid)) break;
        visited.add(pid);
        const pj = await wdGet({ action: "wbgetentities", ids: pid, props: "claims|labels" });
        cur = pj.entities[pid]; if (!cur) break;
        ticker = getTicker(cur); climbs++;
        confidence = confidence === "high" ? "medium" : "low"; // inferred via parent
      }

      const company = labelOf(cur, domain);
      return {
        domain, source: "wikidata", confidence,
        company, ticker: ticker || null,
        type: "public", sector: "—", holders: {}, controlledBy: null,
        note: ticker
          ? "Resolved via Wikidata. Ownership % requires a live-data key (see settings)."
          : "Resolved a company but no stock ticker on Wikidata — may be private or a subsidiary."
      };
    } catch (e) { return null; }
  }

  /* ---- Live institutional holdings (optional, pluggable) ----------------- *
   * Default provider: Financial Modeling Prep (user supplies their own free
   * key). Returns { "Vanguard Group": pct, "BlackRock": pct, "State Street": pct }.
   * Provider response shapes vary — adjust the mapping for your chosen API.
   * -----------------------------------------------------------------------*/
  async function fetchHolders(ticker, apiKey) {
    if (!ticker || !apiKey) return null;
    try {
      const url = `https://financialmodelingprep.com/api/v3/institutional-holder/${encodeURIComponent(ticker)}?apikey=${encodeURIComponent(apiKey)}`;
      const rows = await fetch(url).then((r) => r.json());
      if (!Array.isArray(rows)) return null;
      const want = { "Vanguard": "Vanguard Group", "Blackrock": "BlackRock", "State Street": "State Street" };
      const out = {};
      for (const row of rows) {
        const name = String(row.holder || row.investorName || "").toLowerCase();
        for (const key in want) {
          if (name.includes(key.toLowerCase()) && !out[want[key]]) {
            // Prefer a percent field; otherwise leave undefined (shares-only).
            const pct = row.percentage || row.weightPercent || row.ownership;
            if (typeof pct === "number") out[want[key]] = +pct.toFixed(2);
          }
        }
      }
      return Object.keys(out).length ? out : null;
    } catch (e) { return null; }
  }

  /* ---- Top-level resolve (cache → static → wikidata → live) -------------- */
  async function resolve(input) {
    const domain = normalizeDomain(input);
    if (!domain) return { domain: "", status: "unknown" };

    const cacheKey = "res:" + domain;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const settings = await getSettings();
    let res;

    const local = OWNERSHIP_DB[domain];
    if (local) {
      res = {
        domain, source: "local", confidence: "exact",
        company: local.company, ticker: local.ticker || null,
        type: local.type, sector: local.sector,
        holders: local.holders || {}, controlledBy: local.controlledBy || null,
        note: local.note || null
      };
    } else {
      res = await wikidataResolve(domain);
    }

    if (!res) { res = { domain, status: "unknown" }; }

    // Live-data override when a ticker + key are available.
    if (res.ticker && settings.fmpApiKey) {
      const live = await fetchHolders(res.ticker, settings.fmpApiKey);
      if (live) {
        res.holders = live;
        res.source = res.source === "local" ? "local+live" : "wikidata+live";
        res.note = "Live institutional holdings via your configured data provider.";
      }
    }

    if (res.status !== "unknown") {
      res.combined = res.type === "private" ? null : sumBigThree(res.holders);
      cacheSet(cacheKey, res, settings.ttlMs);
    }
    return res;
  }

  // Expose
  self.OL = {
    DEFAULT_SETTINGS, normalizeDomain, sumBigThree, classify,
    getSettings, setSettings, isDomainMuted, muteDomain,
    resolve, wikidataResolve, fetchHolders
  };
})();
