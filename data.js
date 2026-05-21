/* =============================================================================
 * data.js — Ownership dataset
 * -----------------------------------------------------------------------------
 * IMPORTANT (read this before your exam):
 *   These percentages are ILLUSTRATIVE and STATIC. They are approximate,
 *   rounded figures of the kind reported for large-cap equities, frozen for a
 *   classroom demo. They are NOT live data and will drift over time. A
 *   production version would query a financial-data API (e.g. SEC EDGAR 13F
 *   filings, or a provider like Financial Modeling Prep / Finnhub) at runtime.
 *
 * The teaching point of this project:
 *   The "Big Three" asset managers (Vanguard, BlackRock, State Street) show up
 *   as large shareholders almost everywhere because they run index funds/ETFs
 *   on behalf of millions of ordinary investors — NOT because of secret
 *   control. The `controlledBy` field below is the counter-evidence: many of
 *   these companies are actually FAMILY- or FOUNDER-controlled, which the
 *   simplistic "they own everything" narrative ignores.
 *
 * Schema per entry:
 *   company      string  — legal/common name
 *   ticker       string  — stock symbol (omitted if private)
 *   type         "public" | "private"
 *   sector       string  — for grouping in the "view all" table
 *   holders      object  — { "Holder name": percentOfSharesOutstanding }
 *   controlledBy string? — actual controlling owner, if control != Big Three
 *   note         string? — short explanatory caveat
 * ===========================================================================*/

const BIG_THREE = ["Vanguard Group", "BlackRock", "State Street"];

const OWNERSHIP_DB = {
  /* ---- Big Tech & social ------------------------------------------------ */
  "apple.com":      { company: "Apple Inc.",        ticker: "AAPL", type: "public", sector: "Big Tech",
                      holders: { "Vanguard Group": 8.9, "BlackRock": 6.6, "State Street": 3.8 } },
  "google.com":     { company: "Alphabet Inc.",     ticker: "GOOGL", type: "public", sector: "Big Tech",
                      holders: { "Vanguard Group": 8.1, "BlackRock": 6.4, "State Street": 3.3 },
                      controlledBy: "Founders (Page & Brin) via Class B super-voting shares",
                      note: "Dual-class shares give the founders majority voting control despite the asset managers' economic stakes." },
  "youtube.com":    { company: "Alphabet Inc. (YouTube)", ticker: "GOOGL", type: "public", sector: "Big Tech",
                      holders: { "Vanguard Group": 8.1, "BlackRock": 6.4, "State Street": 3.3 },
                      controlledBy: "Founders (Page & Brin) via Class B super-voting shares" },
  "microsoft.com":  { company: "Microsoft Corp.",   ticker: "MSFT", type: "public", sector: "Big Tech",
                      holders: { "Vanguard Group": 9.0, "BlackRock": 7.0, "State Street": 3.9 } },
  "amazon.com":     { company: "Amazon.com Inc.",   ticker: "AMZN", type: "public", sector: "Big Tech",
                      holders: { "Vanguard Group": 7.5, "BlackRock": 5.9, "State Street": 3.2 },
                      controlledBy: "Jeff Bezos remains the single largest individual shareholder (~9%)" },
  "facebook.com":   { company: "Meta Platforms Inc.", ticker: "META", type: "public", sector: "Big Tech",
                      holders: { "Vanguard Group": 8.0, "BlackRock": 6.6, "State Street": 4.0 },
                      controlledBy: "Mark Zuckerberg via Class B super-voting shares (majority voting power)",
                      note: "Zuckerberg controls the company despite holding a minority of total shares." },
  "instagram.com":  { company: "Meta Platforms Inc. (Instagram)", ticker: "META", type: "public", sector: "Big Tech",
                      holders: { "Vanguard Group": 8.0, "BlackRock": 6.6, "State Street": 4.0 },
                      controlledBy: "Mark Zuckerberg via Class B super-voting shares" },
  "whatsapp.com":   { company: "Meta Platforms Inc. (WhatsApp)", ticker: "META", type: "public", sector: "Big Tech",
                      holders: { "Vanguard Group": 8.0, "BlackRock": 6.6, "State Street": 4.0 },
                      controlledBy: "Mark Zuckerberg via Class B super-voting shares" },
  "netflix.com":    { company: "Netflix Inc.",      ticker: "NFLX", type: "public", sector: "Big Tech",
                      holders: { "Vanguard Group": 8.4, "BlackRock": 6.5, "State Street": 4.1 } },
  "tesla.com":      { company: "Tesla Inc.",        ticker: "TSLA", type: "public", sector: "Big Tech",
                      holders: { "Vanguard Group": 7.1, "BlackRock": 5.8, "State Street": 3.4 },
                      controlledBy: "Elon Musk is the largest individual shareholder (~13%)" },
  "spotify.com":    { company: "Spotify Technology S.A.", ticker: "SPOT", type: "public", sector: "Big Tech",
                      holders: { "Vanguard Group": 3.2, "BlackRock": 4.4, "State Street": 1.1 },
                      controlledBy: "Founders Daniel Ek & Martin Lorentzon hold majority voting power",
                      note: "Founder voting control; Big Three stakes are comparatively small here." },

  /* ---- Media & news ----------------------------------------------------- */
  "disney.com":     { company: "The Walt Disney Co.", ticker: "DIS", type: "public", sector: "Media",
                      holders: { "Vanguard Group": 8.0, "BlackRock": 6.5, "State Street": 4.0 } },
  "disneyplus.com": { company: "The Walt Disney Co. (Disney+)", ticker: "DIS", type: "public", sector: "Media",
                      holders: { "Vanguard Group": 8.0, "BlackRock": 6.5, "State Street": 4.0 } },
  "abc.com":        { company: "The Walt Disney Co. (ABC)", ticker: "DIS", type: "public", sector: "Media",
                      holders: { "Vanguard Group": 8.0, "BlackRock": 6.5, "State Street": 4.0 } },
  "espn.com":       { company: "The Walt Disney Co. (ESPN)", ticker: "DIS", type: "public", sector: "Media",
                      holders: { "Vanguard Group": 8.0, "BlackRock": 6.5, "State Street": 4.0 } },
  "cnn.com":        { company: "Warner Bros. Discovery", ticker: "WBD", type: "public", sector: "Media",
                      holders: { "Vanguard Group": 8.3, "BlackRock": 6.0, "State Street": 3.6 } },
  "max.com":        { company: "Warner Bros. Discovery (Max)", ticker: "WBD", type: "public", sector: "Media",
                      holders: { "Vanguard Group": 8.3, "BlackRock": 6.0, "State Street": 3.6 } },
  "nbcnews.com":    { company: "Comcast Corp. (NBC)", ticker: "CMCSA", type: "public", sector: "Media",
                      holders: { "Vanguard Group": 8.5, "BlackRock": 6.8, "State Street": 4.2 },
                      controlledBy: "Roberts family holds ~33% voting control via Class B shares" },
  "foxnews.com":    { company: "Fox Corporation",   ticker: "FOXA", type: "public", sector: "Media",
                      holders: { "Vanguard Group": 6.0, "BlackRock": 4.5, "State Street": 2.0 },
                      controlledBy: "Murdoch Family Trust holds majority voting control" },
  "wsj.com":        { company: "News Corp",         ticker: "NWSA", type: "public", sector: "Media",
                      holders: { "Vanguard Group": 6.4, "BlackRock": 4.0, "State Street": 1.8 },
                      controlledBy: "Murdoch Family Trust holds ~40% voting control" },
  "nypost.com":     { company: "News Corp (NY Post)", ticker: "NWSA", type: "public", sector: "Media",
                      holders: { "Vanguard Group": 6.4, "BlackRock": 4.0, "State Street": 1.8 },
                      controlledBy: "Murdoch Family Trust holds ~40% voting control" },
  "nytimes.com":    { company: "The New York Times Co.", ticker: "NYT", type: "public", sector: "Media",
                      holders: { "Vanguard Group": 7.9, "BlackRock": 6.6, "State Street": 2.4 },
                      controlledBy: "Ochs-Sulzberger family controls the board via Class B shares",
                      note: "A textbook case: family control via dual-class structure, not asset-manager control." },

  /* ---- Pharma ----------------------------------------------------------- */
  "pfizer.com":     { company: "Pfizer Inc.",       ticker: "PFE", type: "public", sector: "Pharma",
                      holders: { "Vanguard Group": 9.1, "BlackRock": 7.4, "State Street": 5.3 } },
  "modernatx.com":  { company: "Moderna Inc.",      ticker: "MRNA", type: "public", sector: "Pharma",
                      holders: { "Vanguard Group": 7.6, "BlackRock": 6.1, "State Street": 2.9 } },
  "jnj.com":        { company: "Johnson & Johnson", ticker: "JNJ", type: "public", sector: "Pharma",
                      holders: { "Vanguard Group": 9.2, "BlackRock": 7.3, "State Street": 5.6 } },

  /* ---- Food & beverage -------------------------------------------------- */
  "coca-cola.com":  { company: "The Coca-Cola Co.", ticker: "KO", type: "public", sector: "Food & Beverage",
                      holders: { "Vanguard Group": 8.6, "BlackRock": 7.2, "State Street": 4.0 },
                      controlledBy: "Berkshire Hathaway is the single largest holder (~9%)" },
  "pepsi.com":      { company: "PepsiCo Inc.",      ticker: "PEP", type: "public", sector: "Food & Beverage",
                      holders: { "Vanguard Group": 9.0, "BlackRock": 7.0, "State Street": 4.3 } },
  "nestle.com":     { company: "Nestlé S.A.",       ticker: "NSRGY", type: "public", sector: "Food & Beverage",
                      holders: { "Vanguard Group": 3.0, "BlackRock": 2.9, "State Street": 0.8 },
                      note: "Swiss-listed; US asset-manager stakes are smaller for non-US listings." },

  /* ---- Consumer & retail ------------------------------------------------ */
  "walmart.com":    { company: "Walmart Inc.",      ticker: "WMT", type: "public", sector: "Retail",
                      holders: { "Vanguard Group": 3.6, "BlackRock": 2.8, "State Street": 1.6 },
                      controlledBy: "Walton family holds ~45% — majority control",
                      note: "Despite the conspiracy framing, the founding family controls Walmart, not the Big Three." },
  "nike.com":       { company: "Nike Inc.",         ticker: "NKE", type: "public", sector: "Retail",
                      holders: { "Vanguard Group": 7.8, "BlackRock": 6.1, "State Street": 3.0 },
                      controlledBy: "Phil Knight retains majority voting control via Class A shares" },
  "pg.com":         { company: "Procter & Gamble",  ticker: "PG", type: "public", sector: "Consumer Goods",
                      holders: { "Vanguard Group": 8.8, "BlackRock": 6.7, "State Street": 4.1 } },

  /* ---- Energy ----------------------------------------------------------- */
  "exxonmobil.com": { company: "ExxonMobil Corp.",  ticker: "XOM", type: "public", sector: "Energy",
                      holders: { "Vanguard Group": 9.3, "BlackRock": 6.9, "State Street": 5.0 } },
  "chevron.com":    { company: "Chevron Corp.",     ticker: "CVX", type: "public", sector: "Energy",
                      holders: { "Vanguard Group": 8.7, "BlackRock": 6.6, "State Street": 6.2 } },

  /* ---- Banks & finance -------------------------------------------------- */
  "jpmorganchase.com": { company: "JPMorgan Chase", ticker: "JPM", type: "public", sector: "Finance",
                      holders: { "Vanguard Group": 8.9, "BlackRock": 6.5, "State Street": 4.4 } },
  "chase.com":      { company: "JPMorgan Chase (Chase)", ticker: "JPM", type: "public", sector: "Finance",
                      holders: { "Vanguard Group": 8.9, "BlackRock": 6.5, "State Street": 4.4 } },
  "bankofamerica.com": { company: "Bank of America", ticker: "BAC", type: "public", sector: "Finance",
                      holders: { "Vanguard Group": 8.0, "BlackRock": 6.8, "State Street": 4.0 },
                      controlledBy: "Berkshire Hathaway is the largest holder (~13%)" },
  "blackrock.com":  { company: "BlackRock Inc.",    ticker: "BLK", type: "public", sector: "Finance",
                      holders: { "Vanguard Group": 9.0, "State Street": 4.0, "BlackRock": 1.3 },
                      note: "Self-referential: the top holders of BlackRock include Vanguard & State Street (and itself via its own funds)." },

  /* ---- Defense ---------------------------------------------------------- */
  "lockheedmartin.com": { company: "Lockheed Martin", ticker: "LMT", type: "public", sector: "Defense",
                      holders: { "Vanguard Group": 9.4, "BlackRock": 6.9, "State Street": 14.5 },
                      note: "State Street's stake here is unusually large (legacy of pension/index mandates)." },
  "boeing.com":     { company: "The Boeing Co.",    ticker: "BA", type: "public", sector: "Defense",
                      holders: { "Vanguard Group": 7.6, "BlackRock": 6.2, "State Street": 4.5 } },

  /* ---- The "and also this" bucket — where the claim breaks ------------- */
  "calm.com":       { company: "Calm.com, Inc.",    type: "private", sector: "Apps (private)",
                      holders: {},
                      note: "PRIVATELY HELD. There are no public shares for the Big Three to own — the 'they own this too' claim does not mechanically apply. Calm is backed by private VC investors (e.g. Insight Partners, Lightspeed)." }
};
