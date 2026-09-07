/* =============================================================
   PIRANHA VIBES — Core runtime
   API client · catalog store · cart · UI chrome · motion
   ============================================================= */
(function () {
  "use strict";

  const CFG = window.PV_CONFIG;

  /* A backend URL saved from the admin console overrides the one in
     config.js. This lets you connect (or re-point) the site without
     editing and redeploying code — but the override lives in ONE
     browser's localStorage, so config.js still has to be filled in for
     customers to reach the live backend. */
  try {
    const ov = localStorage.getItem("pv_api_url");
    if (ov) CFG.API_URL = ov;
  } catch (e) { }

  const LS = {
    cart: "pv_cart_v1",
    wish: "pv_wish_v1",
    recent: "pv_recent_v1",
    cache: "pv_catalog_cache_v1",
    adminKey: "pv_admin_key_v1",
    orders: "pv_my_orders_v1",
  };

  /* ---------------------------------------------------------
     0. Small helpers
     --------------------------------------------------------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) =>
    String(s == null ? "" : s).replace(
      /[&<>"']/g,
      (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c])
    );
  const money = (n) =>
    CFG.CURRENCY +
    Number(n || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  const read = (k, d) => {
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : d;
    } catch (e) {
      return d;
    }
  };
  const write = (k, v) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) { }
  };
  const qp = (k) => new URLSearchParams(location.search).get(k);
  const slugify = (s) =>
    String(s)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const COLOR_HEX = {
    red: "#d62828",
    "navy blue": "#25306b",
    navy: "#25306b",
    black: "#1b1b1b",
    white: "#f4f4f4",
    yellow: "#f2c14e",
    pink: "#f0a0b8",
    mustard: "#d9a521",
    orange: "#e8781f",
    "sky blue": "#87c2e8",
    violet: "#7c5cc4",
    lavender: "#bda7e0",
    "kiwi green": "#9dbf5a",
    "off white": "#efe9dd",
    grey: "#9a9a9a",
    maroon: "#7b1f2b",
    green: "#2e7d4f",
    beige: "#e3d5bd",
  };
  const colorHex = (c) => COLOR_HEX[String(c || "").toLowerCase()] || "#c9c4b8";

  /* ---------------------------------------------------------
     1. Transport — JSONP reads + resilient writes
     --------------------------------------------------------- */
  let jsonpN = 0;
  /* `base` lets the admin console verify a candidate URL before saving it. */
  function jsonp(params, timeout, base) {
    return new Promise((resolve, reject) => {
      const endpoint = base || CFG.API_URL;
      if (!endpoint) return reject(new Error("NO_API"));
      const cb = "pvcb_" + Date.now() + "_" + jsonpN++;
      const s = document.createElement("script");
      const t = setTimeout(() => {
        cleanup();
        reject(new Error("TIMEOUT"));
      }, timeout || 15000);
      function cleanup() {
        clearTimeout(t);
        delete window[cb];
        if (s.parentNode) s.parentNode.removeChild(s);
      }
      window[cb] = (data) => {
        cleanup();
        resolve(data);
      };
      const u = new URL(endpoint);
      Object.keys(params).forEach((k) => u.searchParams.set(k, params[k]));
      u.searchParams.set("callback", cb);
      s.src = u.toString();
      s.onerror = () => {
        cleanup();
        reject(new Error("NETWORK"));
      };
      document.head.appendChild(s);
    });
  }

  /* POST first (fast, no URL limit); fall back to JSONP if the
     browser blocks the cross-origin read. */
  async function send(action, payload) {
    if (!CFG.API_URL) throw new Error("NO_API");
    const body = JSON.stringify({ action, payload });
    try {
      const r = await fetch(CFG.API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body,
        redirect: "follow",
      });
      const txt = await r.text();
      return JSON.parse(txt);
    } catch (e) {
      return jsonp({ action, data: encodeURIComponent(body) }, 20000);
    }
  }

  /* ---------------------------------------------------------
     2. Catalog store
     --------------------------------------------------------- */
  const Store = {
    products: [],
    categories: window.PV_CATEGORIES || [],
    coupons: window.PV_COUPONS || [],
    settings: {
      shippingFee: CFG.SHIPPING_FEE,
      freeShippingAbove: CFG.FREE_SHIPPING_ABOVE,
      codEnabled: CFG.COD_ENABLED,
      codFee: CFG.COD_FEE,
      upiId: CFG.UPI_ID,
      taxPercent: CFG.TAX_PERCENT,
      announcement: "",
    },
    source: "local",
    ready: null,
  };

  const SPECIFIC_BLACK_TOTES = [
    "chafa",
    "jastwand",
    "nishigandh",
    "bharatnatyam",
    "kathak",
    "prajakta",
  ];

  function normalise(p) {
    const toArr = (v) =>
      Array.isArray(v)
        ? v.filter(Boolean)
        : String(v || "")
          .split(/[,|]/)
          .map((x) => x.trim())
          .filter(Boolean);
    const slug = p.slug || slugify(p.name);
    let colors = toArr(p.colors);
    if (SPECIFIC_BLACK_TOTES.includes(slug)) {
      colors = ["Black"];
    }
    let price = Number(p.price) || 0;
    if (slug === "tulips") {
      price = 330;
    } else if (SPECIFIC_BLACK_TOTES.includes(slug)) {
      price = 350;
    }
    return {
      sku: p.sku || slug.toUpperCase(),
      slug,
      name: p.name || "Untitled",
      category: p.category || "kids",
      price,
      mrp: Number(p.mrp) || 0,
      stock: p.stock === "" || p.stock == null ? 0 : Number(p.stock),
      sizes: toArr(p.sizes),
      colors,
      desc: p.desc || "",
      badge: p.badge || "",
      featured: Number(p.featured) ? 1 : 0,
      active: p.active === 0 || p.active === "0" || p.active === false ? 0 : 1,
      image:
        p.image && String(p.image).trim()
          ? p.image
          : `assets/img/products/${slug}.webp`,
    };
  }

  function loadLocal() {
    Store.products = (window.PV_PRODUCTS || []).map(normalise);
    Store.coupons = window.PV_COUPONS || [];
    Store.source = "local";
  }

  async function loadCatalog(force) {
    loadLocal();
    if (!CFG.API_URL) return Store;

    const cached = read(LS.cache, null);
    if (
      !force &&
      cached &&
      Date.now() - cached.t < (CFG.CACHE_MINUTES || 5) * 60000
    ) {
      apply(cached.d);
      return Store;
    }
    try {
      const res = await jsonp({ action: "catalog" });
      if (res && res.ok) {
        apply(res);
        write(LS.cache, { t: Date.now(), d: res });
      }
    } catch (e) {
      if (cached) apply(cached.d);
      console.warn("[PV] live catalog unavailable, using local seed:", e.message);
    }
    return Store;

    function apply(res) {
      if (res.products && res.products.length)
        Store.products = res.products.map(normalise);
      if (res.coupons) Store.coupons = res.coupons;
      if (res.settings) Object.assign(Store.settings, res.settings);
      Store.source = "sheets";
    }
  }
  Store.ready = loadCatalog();

  const byCat = (id) =>
    Store.products.filter((p) => p.active && p.category === id);
  const bySlug = (s) => Store.products.find((p) => p.slug === s);
  const catMeta = (id) =>
    Store.categories.find((c) => c.id === id) || { name: id, short: id };

  /* ---------------------------------------------------------
     3. Cart
     --------------------------------------------------------- */
  const Cart = {
    items: read(LS.cart, []),
    save() {
      write(LS.cart, this.items);
      paintCart();
      document.dispatchEvent(new CustomEvent("pv:cart"));
    },
    key: (slug, size, color) => `${slug}::${size || "-"}::${color || "-"}`,
    add(slug, size, color, qty) {
      const p = bySlug(slug);
      if (!p) return false;
      const k = this.key(slug, size, color);
      const ex = this.items.find((i) => i.key === k);
      const want = (ex ? ex.qty : 0) + (qty || 1);
      if (p.stock > 0 && want > p.stock) {
        toast(`Only ${p.stock} left in stock`, "err");
        return false;
      }
      if (ex) ex.qty = want;
      else
        this.items.push({
          key: k,
          slug,
          sku: p.sku,
          name: p.name,
          price: p.price,
          image: p.image,
          size: size || "",
          color: color || "",
          qty: qty || 1,
        });
      this.save();
      bumpCount();
      return true;
    },
    setQty(key, q) {
      const it = this.items.find((i) => i.key === key);
      if (!it) return;
      const p = bySlug(it.slug);
      if (q < 1) return this.remove(key);
      if (p && p.stock > 0 && q > p.stock)
        return toast(`Only ${p.stock} left in stock`, "err");
      it.qty = q;
      this.save();
    },
    remove(key) {
      this.items = this.items.filter((i) => i.key !== key);
      this.save();
    },
    clear() {
      this.items = [];
      this.save();
    },
    count() {
      return this.items.reduce((s, i) => s + i.qty, 0);
    },
    subtotal() {
      return this.items.reduce((s, i) => s + i.price * i.qty, 0);
    },
    /* Refresh prices from the live catalog so the sheet is the
       single source of truth even for older cart sessions. */
    sync() {
      let changed = false;
      this.items.forEach((i) => {
        const p = bySlug(i.slug);
        if (p && p.price !== i.price) {
          i.price = p.price;
          changed = true;
        }
        if (p) i.image = p.image;
      });
      if (changed) this.save();
    },
  };

  /* coupon + totals */
  function findCoupon(code) {
    if (!code) return null;
    const c = (Store.coupons || []).find(
      (x) =>
        String(x.code).toUpperCase() === String(code).toUpperCase() &&
        Number(x.active) !== 0
    );
    return c || null;
  }
  function totals(couponCode, method) {
    const s = Store.settings;
    const sub = Cart.subtotal();
    let discount = 0;
    const c = findCoupon(couponCode);
    if (c && sub >= (Number(c.minOrder) || 0)) {
      discount =
        String(c.type).toLowerCase() === "percent"
          ? Math.round((sub * Number(c.value)) / 100)
          : Number(c.value);
      discount = Math.min(discount, sub);
    }
    const after = sub - discount;
    const baseShip = sub === 0 ? 0 : Number(s.shippingFee) || 60;
    const isOnline = method !== "COD";
    const shipDiscount = (sub > 0 && isOnline) ? baseShip : 0;
    const ship = (sub > 0 && !isOnline) ? baseShip : 0;
    const codFee = method === "COD" ? Number(s.codFee) || 0 : 0;
    const tax = Math.round((after * (Number(s.taxPercent) || 0)) / 100);
    return {
      sub,
      discount,
      baseShip,
      shipDiscount,
      ship,
      codFee,
      tax,
      total: Math.max(0, after + ship + codFee + tax),
      couponValid: !!c && sub >= (Number(c.minOrder) || 0),
      coupon: c,
    };
  }

  /* ---------------------------------------------------------
     4. Wishlist + recently viewed
     --------------------------------------------------------- */
  const Wish = {
    ids: read(LS.wish, []),
    has(s) {
      return this.ids.indexOf(s) > -1;
    },
    toggle(s) {
      const i = this.ids.indexOf(s);
      if (i > -1) this.ids.splice(i, 1);
      else this.ids.push(s);
      write(LS.wish, this.ids);
      return this.has(s);
    },
  };
  function pushRecent(slug) {
    let r = read(LS.recent, []).filter((x) => x !== slug);
    r.unshift(slug);
    write(LS.recent, r.slice(0, 8));
  }

  /* ---------------------------------------------------------
     5. UI chrome — header, footer, drawer
     --------------------------------------------------------- */
  const ICON = {
    arrow:
      '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    up: '<svg viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    bag: '<svg viewBox="0 0 24 24"><path d="M6 7h12l1 13H5L6 7Z" stroke-linejoin="round"/><path d="M9 7V6a3 3 0 0 1 6 0v1" stroke-linecap="round"/></svg>',
    heart:
      '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-9.5A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.5C19 15.6 12 20 12 20Z" stroke-linejoin="round"/></svg>',
    search:
      '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5" stroke-linecap="round"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="m12 2 2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8L12 2Z"/></svg>',
    check:
      '<svg viewBox="0 0 24 24"><path d="m4 12 6 6L20 6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    truck:
      '<svg viewBox="0 0 24 24"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" stroke-linejoin="round"/><circle cx="7" cy="18" r="1.8"/><circle cx="17.5" cy="18" r="1.8"/></svg>',
    leaf: '<svg viewBox="0 0 24 24"><path d="M20 4C10 4 4 9 4 16c0 2 1 4 1 4s6-1 9-4 6-8 6-12Z" stroke-linejoin="round"/><path d="M5 20 14 10" stroke-linecap="round"/></svg>',
    refresh:
      '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.6-5.9M20 4v5h-5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    shield:
      '<svg viewBox="0 0 24 24"><path d="M12 3 5 6v6c0 4.5 3 8 7 9 4-1 7-4.5 7-9V6l-7-3Z" stroke-linejoin="round"/><path d="m9 12 2 2 4-4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6" stroke-linecap="round"/></svg>',
    phone:
      '<svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1Z" stroke-linejoin="round"/></svg>',
    pin: '<svg viewBox="0 0 24 24"><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" stroke-linejoin="round"/><circle cx="12" cy="10" r="2.6"/></svg>',
    ig: '<svg viewBox="0 0 24 24"><path d="M12 2.2c3.2 0 3.6 0 4.9.07 1.2.06 1.8.25 2.2.42.6.22 1 .48 1.4.9.4.4.68.8.9 1.4.17.4.36 1 .42 2.2.06 1.3.07 1.7.07 4.9s0 3.6-.07 4.9c-.06 1.2-.25 1.8-.42 2.2a3.9 3.9 0 0 1-.9 1.4c-.4.4-.8.68-1.4.9-.4.17-1 .36-2.2.42-1.3.06-1.7.07-4.9.07s-3.6 0-4.9-.07c-1.2-.06-1.8-.25-2.2-.42a3.9 3.9 0 0 1-1.4-.9 3.9 3.9 0 0 1-.9-1.4c-.17-.4-.36-1-.42-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.9c.06-1.2.25-1.8.42-2.2.22-.6.5-1 .9-1.4.4-.4.8-.68 1.4-.9.4-.17 1-.36 2.2-.42C8.4 2.2 8.8 2.2 12 2.2Zm0 3.2a6.6 6.6 0 1 0 0 13.2 6.6 6.6 0 0 0 0-13.2Zm0 10.9a4.3 4.3 0 1 1 0-8.6 4.3 4.3 0 0 1 0 8.6Zm6.9-11.2a1.55 1.55 0 1 1-3.1 0 1.55 1.55 0 0 1 3.1 0Z"/></svg>',
    fb: '<svg viewBox="0 0 24 24"><path d="M14 9V7.2c0-.8.2-1.2 1.4-1.2H17V3.1A19 19 0 0 0 14.6 3C12 3 10.4 4.5 10.4 7v2H8v3h2.4v9H14v-9h2.5l.4-3H14Z"/></svg>',
    wa: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm5.2 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1-.4-.1-.9-.3-1.5-.6a11 11 0 0 1-4.3-3.9c-.4-.6-.8-1.4-.8-2.2 0-.8.4-1.2.6-1.4a.9.9 0 0 1 .7-.3h.5c.2 0 .4 0 .6.4l.7 1.7c.1.2 0 .4-.1.5l-.3.4c-.1.1-.3.3-.1.6.2.3.7 1.1 1.4 1.8.9.8 1.7 1.1 2 1.2.2.1.4.1.5-.1l.7-.8c.2-.2.3-.2.5-.1l1.6.8c.2.1.4.2.4.3.1.2.1.6-.1 1.1Z"/></svg>',
  };

  function headerHTML(active) {
    const nav = [
      ["index.html", "Home"],
      ["shop.html", "Shop All"],
      ["shop.html?cat=kids", "Kids"],
      ["shop.html?cat=women", "Women"],
      ["shop.html?cat=men", "Men"],
      ["shop.html?cat=tote", "Totes"],
      ["index.html#contact", "Contact"],
    ];
    const ann =
      Store.settings.announcement ||
      "Complimentary Delivery — ₹60 shipping discount applied &nbsp;·&nbsp; <b>Dispatched in 48 hours</b> &nbsp;·&nbsp; Easy 7-day returns &nbsp;·&nbsp; 100% pure cotton";
    const annTrack = `<span>${ann}</span>`.repeat(4);
    return `
<div class="announce"><div class="track">${annTrack}${annTrack}</div></div>
<header class="hdr" id="hdr">
  <div class="wrap-wide hdr-in">
    <a class="logo" href="index.html" aria-label="Piranha Vibes home">
      <img src="assets/img/brand/logo.png" alt="Piranha Vibes" width="160" height="46">
    </a>
    <nav class="nav">
      ${nav
        .map(
          (n) =>
            `<a href="${n[0]}"${active === n[1] ? ' class="active"' : ""
            }>${n[1]}</a>`
        )
        .join("")}
    </nav>
    <div class="hdr-act">
      <button class="icon-btn" id="btnSearch" aria-label="Search">${ICON.search
      }</button>
      <a class="icon-btn" href="track.html" aria-label="Track order">${ICON.truck
      }</a>
      <button class="icon-btn" id="btnCart" aria-label="Open cart">
        ${ICON.bag}<span class="cart-count" id="cartCount">0</span>
      </button>
      <button class="burger" id="burger" aria-label="Menu"><i></i></button>
    </div>
  </div>
</header>
<div class="mnav" id="mnav">
  ${nav.map((n) => `<a href="${n[0]}">${n[1]}</a>`).join("")}
  <a href="track.html">Track Order</a>
</div>
<div class="search-ov" id="searchOv">
  <div class="search-box">
    <div class="wrap">
      <div class="search-field">
        ${ICON.search}
        <input type="search" id="searchInput" placeholder="Search tees, totes, collections…" autocomplete="off">
        <button class="icon-btn" id="searchClose" aria-label="Close">&times;</button>
      </div>
      <div class="search-res" id="searchRes"></div>
    </div>
  </div>
</div>`;
  }

  function footerHTML() {
    return `
<footer class="ftr">
  <div class="wrap">
    <div class="ftr-grid">
      <div>
        <div class="ftr-logo"><img src="assets/img/brand/logo.png" alt="Piranha Vibes"></div>
        <p>Where heritage meets contemporary style. Graphic tees and totes that let you wear your Marathi soul — crafted in premium cotton, printed to last.</p>
        <div class="soc">
          <a href="${CFG.INSTAGRAM}" target="_blank" rel="noopener" aria-label="Instagram">${ICON.ig}</a>
          <a href="${CFG.FACEBOOK}" target="_blank" rel="noopener" aria-label="Facebook">${ICON.fb}</a>
          <a href="https://wa.me/${CFG.WHATSAPP}" target="_blank" rel="noopener" aria-label="WhatsApp">${ICON.wa}</a>
        </div>
      </div>
      <div>
        <h5>Shop</h5>
        ${Store.categories
        .map((c) => `<a href="shop.html?cat=${c.id}">${c.name}</a>`)
        .join("")}
        <a href="shop.html">All Products</a>
      </div>
      <div>
        <h5>Help</h5>
        <a href="track.html">Track Your Order</a>
        <a href="index.html#contact">Contact Us</a>
        <a href="index.html#faq">Shipping &amp; Returns</a>
        <a href="index.html#faq">Size Guide</a>
        <a href="index.html#faq">FAQ</a>
      </div>
      <div>
        <h5>Get in touch</h5>
        <div class="contact-line">${ICON.mail}<a href="mailto:${CFG.EMAIL}" style="padding:0">${CFG.EMAIL}</a></div>
        <div class="contact-line">${ICON.phone}<a href="tel:${CFG.PHONE.replace(
          /\s/g,
          ""
        )}" style="padding:0">${CFG.PHONE}</a></div>
        <div class="contact-line">${ICON.pin}<span>${CFG.ADDRESS}</span></div>
      </div>
    </div>
    <div class="ftr-bot">
      <span>© ${new Date().getFullYear()} ${CFG.BRAND
      }. All rights reserved.</span>
      <span>Rooted by Core · Made in Pune, India</span>
    </div>

    <div class="credit">
      <span class="credit-rule"></span>
      <p class="credit-line">
        <span class="credit-pre">Crafted pixel by pixel &mdash; designed &amp; developed by</span>
        <a class="kaxon" href="https://kaxon.in" target="_blank" rel="noopener noreferrer"
           aria-label="KAXON — visit kaxon.in (opens in a new tab)">
          <span class="kaxon-word" data-text="KAXON">KAXON</span>
          <svg class="kaxon-arrow" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 17 17 7M9 7h8v8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="kaxon-glow"></span>
        </a>
      </p>
      <span class="credit-rule"></span>
    </div>
  </div>
</footer>
<div class="scrim" id="scrim"></div>
<aside class="drawer" id="drawer" aria-label="Shopping cart">
  <div class="drawer-hd">
    <h3>Your Bag <span class="muted" style="font-size:.85rem;font-family:var(--sans)" id="drawerCount"></span></h3>
    <button class="icon-btn" id="drawerClose" aria-label="Close">&times;</button>
  </div>
  <div class="drawer-body" id="drawerBody"></div>
  <div class="drawer-ft" id="drawerFt"></div>
</aside>
<a class="wa-fab" href="https://wa.me/${CFG.WHATSAPP
      }?text=Hi%20Piranha%20Vibes!%20I%20have%20a%20question." target="_blank" rel="noopener" aria-label="Chat on WhatsApp">${ICON.wa
      }</a>
<button class="to-top" id="toTop" aria-label="Back to top">${ICON.up}</button>
<div class="toasts" id="toasts"></div>
<div class="progress-bar" id="progressBar"></div>`;
  }

  /* ---------------------------------------------------------
     6. Product card
     --------------------------------------------------------- */
  function cardHTML(p) {
    const out = p.stock <= 0;
    const off =
      p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
    const low = !out && p.stock <= CFG.LOW_STOCK_THRESHOLD;
    return `
<article class="pc${out ? " sold" : ""}" data-slug="${p.slug}">
  <div class="pc-media">
    <a href="product.html?p=${p.slug}" aria-label="${esc(p.name)}">
      <img src="${p.image}" alt="${esc(p.name)}" loading="lazy" width="600" height="700"
           onerror="this.src='assets/img/brand/hero-main.webp'">
    </a>
    ${out
        ? '<span class="pc-badge out">Sold out</span>'
        : p.badge
          ? `<span class="pc-badge${p.badge.toLowerCase() === "new" ? " red" : ""
          }">${esc(p.badge)}</span>`
          : off
            ? `<span class="pc-badge red">${off}% off</span>`
            : ""
      }
    <button class="pc-wish${Wish.has(p.slug) ? " on" : ""
      }" data-wish="${p.slug}" aria-label="Save">${ICON.heart}</button>
    ${out
        ? ""
        : `<div class="pc-quick"><button class="btn btn-sm" data-quick="${p.slug}">Quick add</button></div>`
      }
  </div>
  <a href="product.html?p=${p.slug}">
    <span class="pc-cat">${esc(catMeta(p.category).short)}</span>
    <h3 class="pc-name">${esc(p.name)}</h3>
  </a>
  <div class="pc-row">
    <span class="pc-price">${money(p.price)}</span>
    ${p.mrp > p.price ? `<span class="pc-mrp">${money(p.mrp)}</span>` : ""}
    ${off ? `<span class="pc-off">${off}% off</span>` : ""}
  </div>
  ${p.colors.length
        ? `<div class="pc-swatches">${p.colors
          .map((c) => `<i style="background:${colorHex(c)}" title="${esc(c)}"></i>`)
          .join("")}</div>`
        : ""
      }
  ${low ? `<div class="pc-stock">Only ${p.stock} left</div>` : ""}
</article>`;
  }

  /* ---------------------------------------------------------
     7. Cart drawer painting
     --------------------------------------------------------- */
  function paintCart() {
    const n = Cart.count();
    const c = $("#cartCount");
    if (c) {
      c.textContent = n;
      c.classList.toggle("on", n > 0);
    }
    const dc = $("#drawerCount");
    if (dc) dc.textContent = n ? `(${n} item${n > 1 ? "s" : ""})` : "";
    const body = $("#drawerBody");
    const ft = $("#drawerFt");
    if (!body || !ft) return;

    if (!Cart.items.length) {
      body.innerHTML = `<div class="empty">${ICON.bag}<p>Your bag is empty.</p>
        <a class="btn btn-sm" href="shop.html" style="margin-top:16px">Start shopping</a></div>`;
      ft.innerHTML = "";
      return;
    }
    body.innerHTML = Cart.items
      .map(
        (i) => `
<div class="ci">
  <a href="product.html?p=${i.slug}"><img src="${i.image}" alt="${esc(
          i.name
        )}" onerror="this.src='assets/img/brand/hero-main.webp'"></a>
  <div>
    <a href="product.html?p=${i.slug}" class="nm">${esc(i.name)}</a>
    <div class="vr">${[i.size, i.color].filter(Boolean).join(" · ") || "—"}</div>
    <div class="pr">${money(i.price * i.qty)}</div>
    <span class="ci-rm" data-rm="${i.key}">Remove</span>
  </div>
  <div class="qty" style="align-self:center">
    <button data-dec="${i.key}" aria-label="Decrease">−</button>
    <span>${i.qty}</span>
    <button data-inc="${i.key}" aria-label="Increase">+</button>
  </div>
</div>`
      )
      .join("");

    const s = Store.settings;
    const sub = Cart.subtotal();
    const t = totals();
    ft.innerHTML = `
<div class="sum-row"><span>Subtotal</span><span>${money(sub)}</span></div>
<div class="sum-row"><span>Delivery Fee</span><span>${money(t.baseShip)}</span></div>
<div class="sum-row" style="color:var(--green);font-weight:600"><span>Online Delivery Discount</span><span>− ${money(t.shipDiscount)}</span></div>
<div class="sum-row total" style="margin-top:6px;padding-top:8px;border-top:1px dashed var(--line)"><span>Total (Online)</span><span>${money(t.total)}</span></div>
<p class="tiny muted" style="margin:6px 0 14px">⚡ Free delivery applied when paying online with UPI at checkout.</p>
<a class="btn btn-block btn-red" href="checkout.html">Checkout ${ICON.arrow}</a>
<a class="btn btn-block btn-ghost btn-sm" href="cart.html" style="margin-top:9px">View full bag</a>`;
  }

  function bumpCount() {
    const c = $("#cartCount");
    if (!c) return;
    c.classList.remove("bump");
    void c.offsetWidth;
    c.classList.add("bump");
  }

  /* ---------------------------------------------------------
     8. Toasts
     --------------------------------------------------------- */
  function toast(msg, kind) {
    const box = $("#toasts");
    if (!box) return alert(msg);
    const el = document.createElement("div");
    el.className = "toast " + (kind === "err" ? "err" : "ok");
    el.innerHTML = `<span class="ic">${kind === "err" ? "!" : "✓"
      }</span><span>${esc(msg)}</span>`;
    box.appendChild(el);
    setTimeout(() => el.remove(), 3600);
  }

  /* ---------------------------------------------------------
     9. Motion
     --------------------------------------------------------- */
  function observe(root) {
    const els = $$(".rv, .stagger, .split-media", root || document);
    if (!("IntersectionObserver" in window)) {
      els.forEach((e) => e.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          const el = en.target;
          if (el.classList.contains("stagger")) {
            Array.from(el.children).forEach((ch, i) => {
              ch.style.transitionDelay = Math.min(i * 55, 600) + "ms";
            });
          }
          el.classList.add("in");
          io.unobserve(el);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px" }
    );
    els.forEach((e) => io.observe(e));
  }

  function countUp() {
    $$("[data-count]").forEach((el) => {
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || "";
      const io = new IntersectionObserver((es) => {
        if (!es[0].isIntersecting) return;
        io.disconnect();
        const dur = 1400;
        const t0 = performance.now();
        (function tick(now) {
          const k = Math.min(1, (now - t0) / dur);
          const eased = 1 - Math.pow(1 - k, 3);
          el.textContent =
            Math.round(target * eased).toLocaleString("en-IN") + suffix;
          if (k < 1) requestAnimationFrame(tick);
        })(t0);
      });
      io.observe(el);
    });
  }

  function magnetic() {
    if (matchMedia("(hover:none)").matches) return;
    $$("[data-magnet]").forEach((el) => {
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.16
          }px, ${(e.clientY - r.top - r.height / 2) * 0.24}px)`;
      });
      el.addEventListener("mouseleave", () => (el.style.transform = ""));
    });
  }

  /* ---------------------------------------------------------
     10. Chrome wiring
     --------------------------------------------------------- */
  function mountChrome(activeNav) {
    const h = $("#pv-header");
    const f = $("#pv-footer");
    if (h) h.innerHTML = headerHTML(activeNav);
    if (f) f.innerHTML = footerHTML();

    // header scroll state + progress bar + to-top
    const hdr = $("#hdr"),
      pb = $("#progressBar"),
      tt = $("#toTop");
    const onScroll = () => {
      const y = scrollY;
      if (hdr) hdr.classList.toggle("scrolled", y > 20);
      if (tt) tt.classList.toggle("on", y > 600);
      if (pb) {
        const max = document.body.scrollHeight - innerHeight;
        pb.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
      }
    };
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    if (tt) tt.onclick = () => scrollTo({ top: 0, behavior: "smooth" });

    // burger
    const bg = $("#burger"),
      mn = $("#mnav");
    if (bg)
      bg.onclick = () => {
        const on = bg.classList.toggle("on");
        mn.classList.toggle("on", on);
        document.body.classList.toggle("is-locked", on);
      };

    // cart drawer
    const scrim = $("#scrim"),
      dr = $("#drawer");
    const openCart = () => {
      Cart.sync();
      paintCart();
      dr.classList.add("on");
      scrim.classList.add("on");
      document.body.classList.add("is-locked");
    };
    const closeAll = () => {
      dr.classList.remove("on");
      scrim.classList.remove("on");
      $("#searchOv") && $("#searchOv").classList.remove("on");
      document.body.classList.remove("is-locked");
    };
    window.PV_openCart = openCart;
    const bc = $("#btnCart");
    if (bc) bc.onclick = openCart;
    if (scrim) scrim.onclick = closeAll;
    const dc = $("#drawerClose");
    if (dc) dc.onclick = closeAll;

    // search overlay
    const so = $("#searchOv"),
      si = $("#searchInput"),
      sr = $("#searchRes");
    const bs = $("#btnSearch");
    if (bs)
      bs.onclick = () => {
        so.classList.add("on");
        document.body.classList.add("is-locked");
        setTimeout(() => si.focus(), 240);
        renderSearch("");
      };
    const sc = $("#searchClose");
    if (sc) sc.onclick = closeAll;
    if (so)
      so.addEventListener("click", (e) => {
        if (e.target === so) closeAll();
      });
    if (si)
      si.addEventListener("input", () => renderSearch(si.value.trim()));
    function renderSearch(q) {
      const list = Store.products.filter((p) => p.active);
      const res = q
        ? list.filter(
          (p) =>
            p.name.toLowerCase().includes(q.toLowerCase()) ||
            catMeta(p.category).name.toLowerCase().includes(q.toLowerCase())
        )
        : list.filter((p) => p.featured).slice(0, 8);
      sr.innerHTML = res.length
        ? res.slice(0, 12).map(cardHTML).join("")
        : `<p class="muted" style="grid-column:1/-1">No products match “${esc(
          q
        )}”. Try “tote”, “kids” or “Marathi”.</p>`;
    }

    addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeAll();
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        bs && bs.click();
      }
    });

    // delegated actions
    document.addEventListener("click", (e) => {
      const inc = e.target.closest("[data-inc]");
      const dec = e.target.closest("[data-dec]");
      const rm = e.target.closest("[data-rm]");
      const wi = e.target.closest("[data-wish]");
      const qk = e.target.closest("[data-quick]");
      if (inc) {
        const it = Cart.items.find((i) => i.key === inc.dataset.inc);
        Cart.setQty(inc.dataset.inc, it.qty + 1);
      }
      if (dec) {
        const it = Cart.items.find((i) => i.key === dec.dataset.dec);
        Cart.setQty(dec.dataset.dec, it.qty - 1);
      }
      if (rm) {
        Cart.remove(rm.dataset.rm);
        toast("Removed from bag");
      }
      if (wi) {
        const on = Wish.toggle(wi.dataset.wish);
        wi.classList.toggle("on", on);
        toast(on ? "Saved to wishlist" : "Removed from wishlist");
      }
      if (qk) {
        const p = bySlug(qk.dataset.quick);
        if (!p) return;
        if (p.sizes.length > 1) {
          location.href = "product.html?p=" + p.slug;
          return;
        }
        if (Cart.add(p.slug, p.sizes[0] || "", p.colors[0] || "", 1)) {
          toast(p.name + " added to bag");
          openCart();
        }
      }
    });

    paintCart();
    observe();
    countUp();
    magnetic();
  }

  /* ---------------------------------------------------------
     11. Orders API
     --------------------------------------------------------- */
  function localOrderId() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return (
      "PV" +
      String(d.getFullYear()).slice(2) +
      p(d.getMonth() + 1) +
      p(d.getDate()) +
      "-" +
      Math.random().toString(36).slice(2, 6).toUpperCase()
    );
  }

  async function placeOrder(order) {
    let res;
    try {
      res = await send("createOrder", order);
    } catch (e) {
      res = null;
    }
    if (!res || !res.ok) {
      // Offline / backend not configured: keep the order locally so the
      // customer still gets a reference and nothing is silently lost.
      res = {
        ok: true,
        orderId: localOrderId(),
        offline: true,
        message: res && res.error ? res.error : "Saved locally",
      };
    }
    const mine = read(LS.orders, []);
    mine.unshift({
      id: res.orderId,
      at: new Date().toISOString(),
      total: order.total,
      status: res.offline ? "Pending sync" : "New",
      phone: order.phone,
      items: order.items,
      offline: !!res.offline,
      customer: order.name,
    });
    write(LS.orders, mine.slice(0, 40));
    write(LS.cache, null);
    return res;
  }

  async function trackOrder(id, phone) {
    try {
      const r = await jsonp({ action: "track", id, phone });
      if (r && r.ok) return r;
    } catch (e) { }
    const mine = read(LS.orders, []).find(
      (o) =>
        String(o.id).toUpperCase() === String(id).toUpperCase() &&
        (!phone || String(o.phone).slice(-10) === String(phone).slice(-10))
    );
    if (mine)
      return {
        ok: true,
        local: true,
        order: {
          id: mine.id,
          status: mine.status,
          createdAt: mine.at,
          total: mine.total,
          customer: mine.customer,
          items: mine.items,
        },
      };
    return { ok: false, error: "Order not found. Check the ID and phone." };
  }

  /* ---------------------------------------------------------
     12. Export
     --------------------------------------------------------- */
  window.PV = {
    CFG,
    LS,
    $,
    $$,
    esc,
    money,
    read,
    write,
    qp,
    slugify,
    colorHex,
    jsonp,
    send,
    Store,
    loadCatalog,
    byCat,
    bySlug,
    catMeta,
    Cart,
    Wish,
    pushRecent,
    totals,
    findCoupon,
    ICON,
    cardHTML,
    mountChrome,
    paintCart,
    toast,
    observe,
    placeOrder,
    trackOrder,
    normalise,
  };
})();
