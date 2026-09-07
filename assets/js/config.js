/* =============================================================
   PIRANHA VIBES — Global configuration
   -------------------------------------------------------------
   1. Deploy google-apps-script/Code.gs as a Web App (see SETUP.md)
   2. Paste the /exec URL below into API_URL
   3. Everything (products, pricing, stock, orders) then lives in
      your Google Sheet. Until then the site runs on the local
      seed catalog in data.js so it is always fully working.
   ============================================================= */

window.PV_CONFIG = {
  // ── Google Sheets backend ────────────────────────────────────
  // Apps Script Web app (Execute as: Me · Who has access: Anyone).
  // Re-deploying a NEW VERSION keeps this URL, so it rarely changes.
  API_URL:
    "https://script.google.com/macros/s/AKfycbxyuuhq1e3mP6yEw4P0TNKI0ggYdHcB8uHVlm0YLMkH9dUoF98LPGoAkr3PbKrNBbXRCQ/exec",

  // ── Brand ────────────────────────────────────────────────────
  BRAND: "Piranha Vibes",
  TAGLINE: "Rooted by Core",
  EMAIL: "piranhavibes@gmail.com",
  PHONE: "+91 8087691321",
  WHATSAPP: "918087691321",
  ADDRESS:
    "Anuneel, Swami Vivekanand Park, Walhekarwadi, Chinchwad, Pune 411033",
  INSTAGRAM: "https://www.instagram.com/piranhavibes",
  FACEBOOK: "https://www.facebook.com/piranhavibes",

  // ── Commerce defaults (overridden by the Settings sheet) ─────
  CURRENCY: "₹",
  SHIPPING_FEE: 60,
  FREE_SHIPPING_ABOVE: 999,
  COD_ENABLED: true,
  COD_FEE: 0,
  UPI_ID: "piranhavibes@upi",
  RAZORPAY_LINK: "https://rzp.io/rzp/b0G8pfgI",
  TAX_PERCENT: 0,

  // ── Behaviour ────────────────────────────────────────────────
  LOW_STOCK_THRESHOLD: 5,
  CACHE_MINUTES: 5,
};
