/* =============================================================
   PIRANHA VIBES — Seed catalog
   Mirrors the live piranhavibes.com catalogue. Used as the
   offline / fallback source and as the seed data pushed into
   Google Sheets on first run of the Apps Script backend.
   ============================================================= */

window.PV_CATEGORIES = [
  {
    id: "kids",
    name: "Kids Wear",
    short: "Kids",
    headline: "Fun, Colourful & Culturally Cool",
    blurb:
      "Soft, durable fabrics perfect for active little ones who never stop moving. Our children's collection combines comfort with cultural learning.",
    image: "assets/img/products/aaicha-ladoba.webp",
    sizes: ["22", "24", "26", "28", "30", "32"],
  },
  {
    id: "women",
    name: "Women Collection",
    short: "Women",
    headline: "Modern Women, Rooted by Core",
    blurb:
      "Bold, empowering slogans crafted for women who balance tradition with contemporary aspiration. Stylish cuts and colours that let you celebrate identity in every stitch.",
    image: "assets/img/products/allergic-to-morning-lavender.webp",
    sizes: ["S", "M", "L", "XL", "2XL"],
  },
  {
    id: "men",
    name: "Men's Collection",
    short: "Men",
    headline: "Casual Comfort, Witty & Wise",
    blurb:
      "From thought-provoking proverbs to humorous everyday sayings — designs that celebrate the richness of language and slip effortlessly into modern life.",
    image: "assets/img/products/daughter-and-papa.webp",
    sizes: ["S", "M", "L", "XL", "2XL", "3XL"],
  },
  {
    id: "tote",
    name: "Tote Bags",
    short: "Totes",
    headline: "Everyday Carry, Elevated",
    blurb:
      "Durable, spacious and reusable. A sustainable alternative to plastic that adds a unique touch of Marathi personality to your everyday.",
    image: "assets/img/products/tulips.webp",
    sizes: ["One Size"],
  },
  {
    id: "yoga",
    name: "Yoga Collection",
    short: "Yoga",
    headline: "Inner Strength, Outer Grace",
    blurb:
      "Breathable, easy-moving pieces made for the mat and the moments after it.",
    image: "assets/img/products/keep-calm.webp",
    sizes: ["S", "M", "L", "XL", "2XL"],
  },
  {
    id: "infant",
    name: "Infant Wear",
    short: "Infants",
    headline: "The Softest First Wardrobe",
    blurb:
      "Gentle, skin-friendly cotton rompers designed for the tiniest members of the family.",
    image: "assets/img/products/cute-romper.webp",
    sizes: ["0-6M", "6-12M", "12-18M", "18-24M"],
  },
];

const K = ["22", "24", "26", "28", "30", "32"];
const M = ["S", "M", "L", "XL", "2XL", "3XL"];
const W = ["S", "M", "L", "XL", "2XL"];
const I = ["0-6M", "6-12M", "12-18M", "18-24M"];
const O = ["One Size"];

const kidsCopy =
  "Playful Marathi slogans on premium combed cotton that kids love and parents trust. Pre-shrunk, colour-locked and built to survive endless play and washing.";
const menCopy =
  "A witty Marathi line on heavyweight bio-washed cotton. Relaxed drop-shoulder fit, ribbed collar and a print that holds its colour wash after wash.";
const womenCopy =
  "Empowering Marathi typography on soft, breathable cotton with a flattering modern cut. Made to move from morning chai to late-evening plans.";
const toteCopy =
  "Premium Cotton Tote Bag — Carry Your Style. Carry Your Vibes. A thoughtfully designed, premium-quality 300 GSM tote bag with a spacious 16 × 14 inch size and secure zipper closure.";

window.PV_PRODUCTS = [
  /* ── KIDS ───────────────────────────────────────────────── */
  { sku: "PV-KID-DHP", slug: "dhampuklya", name: "Dhampuklya", category: "kids", price: 399, stock: 24, sizes: K, colors: ["Mustard"], desc: kidsCopy, badge: "Bestseller", featured: 1 },
  { sku: "PV-KID-LDB", slug: "ladubai", name: "Ladubai", category: "kids", price: 399, stock: 18, sizes: K, colors: ["Pink"], desc: kidsCopy, badge: "", featured: 1 },
  { sku: "PV-KID-WOB", slug: "wheels-on-the-bus", name: "Wheels On The Bus", category: "kids", price: 399, stock: 20, sizes: K, colors: ["Navy Blue"], desc: kidsCopy, badge: "", featured: 0 },
  { sku: "PV-KID-MBT", slug: "mazi-bat-mazi-batting", name: "Mazi Bat Mazi Batting", category: "kids", price: 399, stock: 16, sizes: K, colors: ["Red"], desc: kidsCopy, badge: "", featured: 1 },
  { sku: "PV-KID-BLP", slug: "babachi-ladki", name: "Babachi Ladki", category: "kids", price: 399, stock: 22, sizes: K, colors: ["Pink"], desc: kidsCopy, badge: "", featured: 0 },
  { sku: "PV-KID-BLR", slug: "babanchi-ladki", name: "Babanchi Ladki", category: "kids", price: 399, stock: 14, sizes: K, colors: ["Red"], desc: kidsCopy, badge: "", featured: 0 },
  { sku: "PV-KID-GGL", slug: "i-dont-need-google", name: "I Don't Need Google", category: "kids", price: 399, stock: 12, sizes: K, colors: ["Yellow"], desc: kidsCopy, badge: "Trending", featured: 1 },
  { sku: "PV-KID-TWB", slug: "twinning-with-brother", name: "Twinning With Brother", category: "kids", price: 399, stock: 10, sizes: K, colors: ["White"], desc: kidsCopy, badge: "", featured: 0 },
  { sku: "PV-KID-PKP", slug: "pasara-karnyat-patait", name: "Pasara Karnyat Patait", category: "kids", price: 399, stock: 15, sizes: K, colors: ["Sky Blue"], desc: kidsCopy, badge: "", featured: 0 },
  { sku: "PV-KID-GDA", slug: "gondas-aagau", name: "Gondas Aagau", category: "kids", price: 399, stock: 19, sizes: K, colors: ["Navy Blue"], desc: kidsCopy, badge: "", featured: 0 },
  { sku: "PV-KID-AAL", slug: "aaicha-ladoba", name: "Aaicha Ladoba", category: "kids", price: 399, stock: 26, sizes: K, colors: ["Red"], desc: kidsCopy, badge: "Bestseller", featured: 1 },
  { sku: "PV-KID-BCC", slug: "babachi-carbon-copy", name: "Babachi Carbon Copy", category: "kids", price: 399, stock: 17, sizes: K, colors: ["Red"], desc: kidsCopy, badge: "", featured: 0 },
  { sku: "PV-KID-SKP", slug: "sakharech-pote", name: "Sakharech Pote", category: "kids", price: 350, stock: 21, sizes: K, colors: ["Black"], desc: kidsCopy, badge: "", featured: 0 },
  { sku: "PV-KID-HNM", slug: "hanumaan", name: "Hanumaan", category: "kids", price: 370, stock: 13, sizes: K, colors: ["Orange"], desc: kidsCopy, badge: "", featured: 1 },
  { sku: "PV-KID-ACC", slug: "aaichi-carbon-copy", name: "Aaichi Carbon Copy", category: "kids", price: 399, stock: 20, sizes: K, colors: ["Yellow"], desc: kidsCopy, badge: "New", featured: 1 },

  /* ── MEN ────────────────────────────────────────────────── */
  { sku: "PV-MEN-EKS", slug: "ekante-sukhmasyatam", name: "Ekante Sukhmasyatam", category: "men", price: 450, stock: 14, sizes: M, colors: ["Black"], desc: menCopy, badge: "", featured: 1 },
  { sku: "PV-MEN-FTP", slug: "fukat-te-poshtik", name: "Fukat Te Poshtik", category: "men", price: 450, stock: 16, sizes: M, colors: ["White"], desc: menCopy, badge: "Trending", featured: 1 },
  { sku: "PV-MEN-DPA", slug: "daughter-and-papa", name: "Daughter and PAPA", category: "men", price: 450, stock: 12, sizes: M, colors: ["Navy Blue"], desc: menCopy, badge: "Bestseller", featured: 1 },

  /* ── WOMEN ──────────────────────────────────────────────── */
  { sku: "PV-WMN-AMK", slug: "allergic-to-morning", name: "Allergic To Morning", category: "women", price: 450, stock: 15, sizes: W, colors: ["Kiwi Green"], desc: womenCopy, badge: "", featured: 1 },
  { sku: "PV-WMN-CKR", slug: "chakra", name: "Chakra", category: "women", price: 450, stock: 11, sizes: W, colors: ["Violet"], desc: womenCopy, badge: "New", featured: 1 },
  { sku: "PV-WMN-AML", slug: "allergic-to-morning-lavender", name: "Allergic To Morning Lavender", category: "women", price: 450, stock: 18, sizes: W, colors: ["Lavender"], desc: womenCopy, badge: "Bestseller", featured: 1 },

  /* ── TOTE BAGS ──────────────────────────────────────────── */
  { sku: "PV-TOT-CHF", slug: "chafa", name: "Chafa", category: "tote", price: 350, stock: 30, sizes: O, colors: ["Black"], desc: toteCopy, badge: "", featured: 1 },
  { sku: "PV-TOT-JSW", slug: "jastwand", name: "Jastwand", category: "tote", price: 350, stock: 28, sizes: O, colors: ["Black"], desc: toteCopy, badge: "", featured: 0 },
  { sku: "PV-TOT-NGD", slug: "nishigandh", name: "Nishigandh", category: "tote", price: 350, stock: 25, sizes: O, colors: ["Black"], desc: toteCopy, badge: "", featured: 0 },
  { sku: "PV-TOT-BRN", slug: "bharatnatyam", name: "Bharatnatyam", category: "tote", price: 350, stock: 22, sizes: O, colors: ["Black"], desc: toteCopy, badge: "Trending", featured: 1 },
  { sku: "PV-TOT-KTH", slug: "kathak", name: "Kathak", category: "tote", price: 350, stock: 24, sizes: O, colors: ["Black"], desc: toteCopy, badge: "", featured: 1 },
  { sku: "PV-TOT-PRJ", slug: "prajakta", name: "Prajakta", category: "tote", price: 350, stock: 26, sizes: O, colors: ["Black"], desc: toteCopy, badge: "", featured: 0 },
  { sku: "PV-TOT-TLP", slug: "tulips", name: "Tulips", category: "tote", price: 330, stock: 27, sizes: O, colors: ["Off White"], desc: toteCopy, badge: "Bestseller", featured: 1 },

  /* ── YOGA ───────────────────────────────────────────────── */
  { sku: "PV-YOG-KPC", slug: "keep-calm", name: "Keep Calm", category: "yoga", price: 450, stock: 14, sizes: W, colors: ["White"], desc: "Breathable, easy-moving cotton with a calm, minimal print. Made for the mat and everything after it.", badge: "New", featured: 1 },

  /* ── INFANT ─────────────────────────────────────────────── */
  { sku: "PV-INF-CRW", slug: "cute-romper", name: "Cute Romper", category: "infant", price: 250, stock: 20, sizes: I, colors: ["White"], desc: "Ultra-soft skin-friendly cotton romper with easy press-button closure — gentle on newborn skin, easy on parents.", badge: "", featured: 1 },
  { sku: "PV-INF-CRP", slug: "cute-romper-pink", name: "Cute Romper Pink", category: "infant", price: 300, stock: 18, sizes: I, colors: ["Pink"], desc: "Ultra-soft skin-friendly cotton romper with easy press-button closure — gentle on newborn skin, easy on parents.", badge: "", featured: 1 },
].map((p) => ({
  ...p,
  mrp: 0,
  active: 1,
  image: `assets/img/products/${p.slug}.webp`,
}));

/* Seed coupons — editable from the admin panel / Sheet */
window.PV_COUPONS = [
  { code: "VIBES10", type: "percent", value: 10, minOrder: 799, active: 1 },
  { code: "FLAT50", type: "flat", value: 50, minOrder: 599, active: 1 },
];

window.PV_TESTIMONIALS = [
  {
    text: "The fabric quality genuinely surprised me. My son has worn his Aaicha Ladoba tee every week for four months and the print still looks new.",
    name: "Sneha Kulkarni",
    place: "Pune",
  },
  {
    text: "Finally a brand that puts Marathi on clothes without making it look like a souvenir. The typography is beautiful and the fits are proper.",
    name: "Rohit Deshmukh",
    place: "Mumbai",
  },
  {
    text: "Ordered three totes for my college group. Sturdy canvas, roomy, and everyone asked where they were from. Dispatch was quick too.",
    name: "Aditi Jadhav",
    place: "Nashik",
  },
  {
    text: "Bought the Daughter and PAPA tee as a gift for my father. He wears it to every family function now. Worth every rupee.",
    name: "Pranav Shinde",
    place: "Nagpur",
  },
];
