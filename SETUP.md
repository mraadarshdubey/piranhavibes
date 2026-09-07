# Piranha Vibes — Setup Guide

**Live:** <https://piranhavibes.com> · Admin: <https://piranhavibes.com/admin.html>

## Current status

| Piece | State |
| ----- | ----- |
| Storefront on the custom domain | ✅ live |
| Google Sheets backend | ✅ connected (`API_VERSION 2`) |
| Admin password (`ADMIN_KEY`) | ✅ set — sign-in works |
| Orders, stock, pricing, coupons, settings | ✅ verified end to end |
| **Product photo upload → GitHub** | ⬜ needs `GH_TOKEN` — see *Product image uploads* |

Everything below is the full walkthrough, kept for reference and for setting the
project up again from scratch.

---

The site works **immediately** with no setup: open `index.html` and everything
(browsing, cart, checkout) runs on the built-in catalogue. Follow this guide to
connect Google Sheets so orders, pricing and stock become live and manageable.

Total time: about 10 minutes.

---

## Part 1 — Run the site locally

The site is plain HTML/CSS/JS. It needs a tiny web server (not `file://`) so the
pages can talk to each other properly.

**Option A — Python** (already installed on most machines)

```bash
cd piranha-vibes && python -m http.server 5199
```

**Option B — Node**

```bash
npx serve piranha-vibes -l 5199
```

Then open <http://localhost:5199>.

Admin console: <http://localhost:5199/admin.html>

---

## Part 2 — Create the Google Sheet database

1. Go to <https://sheets.new> and create a blank spreadsheet.
   Name it something like **Piranha Vibes — Store DB**.
2. Menu: **Extensions ▸ Apps Script**. A code editor opens in a new tab.
3. Delete everything in `Code.gs`.
4. Open `google-apps-script/Code.gs` from this project, copy the **entire**
   file, and paste it into the Apps Script editor.
5. Click the **save** icon (or `Ctrl+S`).

### Set your admin key

**The quick way — run a function.** In the Apps Script editor, find
`INSTALL_ADMIN_KEY` near the top of `Code.gs`:

```js
function INSTALL_ADMIN_KEY() {
  var NEW_KEY = '';   // <-- type your password here, between the quotes
```

Type your password between those quotes, save, then pick
**`INSTALL_ADMIN_KEY`** from the function dropdown at the top and press
**Run**. The Execution log tells you straight away whether it saved. Then blank
the quotes again and save, so the password isn't left in your script source.

No redeploy is needed — the key is read fresh on every request.

To confirm later without revealing it, run **`CHECK_ADMIN_KEY`**. It prints the
length and the first/last character only.

**The manual way — Script Properties.**

1. In Apps Script, click the **gear icon (Project Settings)** in the left rail.
2. Scroll to **Script Properties ▸ Add script property**.
3. Add these two:

   | Property       | Value                                      |
   | -------------- | ------------------------------------------ |
   | `ADMIN_KEY`    | any strong password you choose             |
   | `NOTIFY_EMAIL` | `piranhavibes@gmail.com` *(optional)*      |

   `ADMIN_KEY` is what you type to log into `admin.html`. Choose something long
   — anyone with this key can change prices and read customer orders.
   `NOTIFY_EMAIL` gets an email every time an order comes in. Leave it out if
   you don't want emails.

4. Click **Save script properties**. ← this button is easy to miss; typing the
   values alone does nothing until you press it.

### If you created the script at script.google.com instead

A script made from <https://script.google.com> is *standalone* — it isn't
attached to any spreadsheet, so `SpreadsheetApp.getActiveSpreadsheet()` returns
nothing. The script handles this, you just need to tell it which sheet to use:

- **Easiest** — add nothing. Run `setup` and it creates a spreadsheet called
  **"Piranha Vibes — Store DB"** in your Drive and remembers it. The
  execution log prints the link; you can also run the `openDatabase` function
  any time to get it again.
- **Or point it at an existing sheet** — add a Script Property `SHEET_ID` with
  the long ID from the spreadsheet's URL:
  `docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit`

> Seeing **`TypeError: Cannot read properties of null (reading 'getSheetByName')`**?
> That's exactly this situation, on an older copy of `Code.gs`. Re-copy the
> current `google-apps-script/Code.gs` over your script and run `setup` again.

### Build the sheets

1. Back in the **Editor**, pick `setup` from the function dropdown at the top.
2. Click **Run**.
3. Google will ask for permission — click **Review permissions**, pick your
   account, then **Advanced ▸ Go to (project name) (unsafe) ▸ Allow**.
   (This warning appears for every personal Apps Script; it is your own script.)
4. Open the spreadsheet. You should now see 7 sheets:
   **Products** (31 rows seeded), **Orders**, **OrderItems**, **Settings**,
   **Coupons**, **Contacts**, **Subscribers**.
   If the script created the sheet for you, its link is in the **Execution log**
   at the bottom of the editor.

---

## Part 3 — Publish the API

1. In Apps Script click **Deploy ▸ New deployment**.
2. Click the gear next to "Select type" and choose **Web app**.
3. Fill in:
   - **Description**: `Piranha Vibes API v1`
   - **Execute as**: **Me**
   - **Who has access**: **Anyone**   ← must be "Anyone", not "Anyone with Google account"
4. Click **Deploy**, approve if asked, then **copy the Web app URL**.
   It looks like `https://script.google.com/macros/s/AKfycb..../exec`.

## Part 4 — Connect the site

The URL has to go into `assets/js/config.js`, because that file is what every
visitor's browser downloads:

```js
API_URL: "https://script.google.com/macros/s/AKfycb..../exec",
```

Save, commit, push. Done — the store is now reading from your Sheet.

To confirm: open `admin.html`, sign in with your `ADMIN_KEY`. The orange
"Offline preview" banner should be gone and the Settings tab should say
**Connected to Google Sheets**.

### Connecting from the admin panel instead

If the site is already deployed and you'd rather not edit code, the login
screen has a **Connect your backend** box. Paste the `/exec` URL and press
**Connect & verify** — it calls the deployment first and only saves the URL if
it actually answers, so a typo or a wrong sharing setting is caught right
there.

Two things to know about this shortcut:

- It is stored in **that one browser** (`localStorage`). Your customers'
  browsers know nothing about it, so **the storefront still runs on the seed
  catalogue** — no live prices, and orders won't land in the Sheet.
- It is meant for testing and emergencies. For the real thing, put the URL in
  `config.js`.

Once connected, **Settings ▸ Backend** shows the exact line to paste into
`config.js` with a copy button, plus a **Disconnect this browser** button.

Common errors it will tell you about:

- Pasting the `/dev` URL — that's the private test link. Use
  **Deploy ▸ Manage deployments** and copy the **Web app** URL ending `/exec`.
- "Couldn't reach that deployment" — the deployment's *Who has access* isn't
  **Anyone**, or you edited `Code.gs` without deploying a **new version**.

> **Whenever you edit `Code.gs` later**, you must re-deploy:
> **Deploy ▸ Manage deployments ▸ pencil icon ▸ Version: New version ▸ Deploy**.
> The URL stays the same, so you don't need to change `config.js` again.

---

## Part 5 — Day-to-day use

### Admin console (`admin.html`)

| Tab            | What you can do                                                                     |
| -------------- | ----------------------------------------------------------------------------------- |
| **Dashboard**  | Revenue, orders today, pending fulfilment, 14-day revenue chart, top sellers, low-stock alerts |
| **Orders**     | Filter by status, search, change status, open an order for full details, add courier + tracking ID, WhatsApp the customer, print an invoice, export CSV |
| **Products**   | Edit price / MRP / stock / badge / featured / visibility inline for many products at once, then hit **Save changes**. Add new products, edit full details, delete |
| **Coupons**    | Create and remove discount codes (percentage or flat, with a minimum order) |
| **Settings**   | Shipping fee, free-shipping threshold, COD on/off, COD fee, tax %, UPI ID, announcement-bar text |

Every save writes straight into the Google Sheet — you can also just edit the
Sheet by hand and the site picks it up.

### Admin access

The admin key is checked by the Apps Script backend, never by this website.
It lives in **exactly one place**: Apps Script ▸ Project Settings ▸ Script
Properties ▸ `ADMIN_KEY`.

> **Never write the key into a file in this project.** `config.js`, `SETUP.md`
> and every other file here get published with the site — anything typed into
> them is readable by the whole internet. The key belongs only in Script
> Properties, which lives inside your Google account.

To change it: edit `ADMIN_KEY` in Script Properties and save. It takes effect
instantly and every signed-in session stops working on its next action — no
redeploy needed.

What the login screen does for you:

- **Wrong key** — refuses entry and counts down remaining attempts.
- **5 wrong attempts** — locks the form for 60 seconds.
- **Backend unreachable** — it will *not* quietly let you in. You get an
  explicit "Continue in offline preview" button, and that mode only ever shows
  the local seed catalogue and orders placed on this device.
- **"Keep me signed in"** — off by default. Leave it off on shared computers;
  when it's on, the key is stored in that browser until you sign out.
- **Idle for 30 minutes** — signs you out automatically.

### Order statuses

`New → Confirmed → Packed → Shipped → Delivered` (plus `Cancelled`).
Customers see this exact progress on `track.html`.

### Stock

Stock is decremented automatically when an order is placed. A product with
stock `0` shows as **Sold out** and cannot be added to the bag. Products at or
below 5 units show an "Only N left" nudge and appear in the dashboard's
low-stock alerts.

### Adding a new product

1. Admin ▸ Products ▸ **+ New product**.
2. Type the name, then **drop the product photo onto the image box** (or click
   it to browse). The image is resized, converted to WebP and uploaded
   automatically — see the next section.
3. Fill in price, stock, sizes and colours, then **Create product**.

You can also skip the uploader and type an image path or any public image URL
into the "Image path or URL" field by hand.

---

## Product image uploads

When you add a product from the admin panel, the photo has to end up somewhere
public. The uploader handles this for you, and **no credential ever reaches the
browser or the published site** — the secrets live in Apps Script Script
Properties, inside your own Google account.

Before uploading, the browser resizes the image to 1200 px on its longest edge
and re-encodes it as WebP (usually 30–120 KB), so nothing bloats.

Uploads go into your GitHub repo. Until `GH_TOKEN` and `GH_REPO` are set, the
uploader is switched off and says so — you can still type an image path or URL
into the product editor by hand, and everything else works normally.

> **Why there's no Google Drive option.** An earlier build saved uploads to a
> public Drive folder. Those files download fine with `curl`, but Google blocks
> them when a browser requests them from another website, so every product
> image rendered as a broken image. It was removed rather than left as a
> fallback that quietly produces a broken storefront.

### Commit straight into your GitHub repo

Every uploaded image becomes a real commit in `assets/img/products/`, exactly
like the 31 seeded photos.

**1. Create a fine-grained token** (this is the safest kind — it can only touch
the one repo, and only its files):

1. Go to <https://github.com/settings/personal-access-tokens/new>
2. **Token name**: `piranha-vibes-image-upload`
3. **Expiration**: 1 year (set a calendar reminder to rotate it)
4. **Repository access** ▸ **Only select repositories** ▸ `piranhavibes`
5. **Repository permissions** ▸ find **Contents** ▸ set to **Read and write**
6. **Generate token** and copy it — GitHub shows it only once.

> **Step 5 is the one everybody gets wrong.** Scroll to *Repository*
> permissions, not *Account* permissions.

#### Exactly which permission each call needs

From GitHub's
[permissions reference for fine-grained tokens](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens):

| Call the uploader makes                     | Permission required |
| ------------------------------------------- | ------------------- |
| `GET /repos/{owner}/{repo}` — does it exist? | **Metadata: read**  |
| `GET .../contents/{path}` — file already there? | **Contents: read**  |
| `PUT .../contents/{path}` — **commit the image** | **Contents: write** |
| `DELETE .../contents/{path}` — clean up the probe | **Contents: write** |

Ticking **Contents: Read and write** covers all four — `write` includes `read`,
and `Metadata: read` is added for you automatically.

The same page notes that some endpoints *"can also be used to access public
resources without these permissions."* Our repo is public, so the two read
calls answer even for a token with no permissions at all. That is precisely why
the installer's first checks pass while the commit fails with
`403 Resource not accessible by personal access token` — **only the write test
proves anything**, which is why the installer does a real test commit rather
than trusting a read.

If you hit that 403 you don't need a new token: open the token, set
**Contents → Read and write**, press **Update token**, and run the installer
again.

Org-owned repos additionally need the token approved by an organisation owner.
`mraadarshdubey/piranhavibes` is a personal repo, so that doesn't apply — the
installer prints the owner type so you can confirm.

**Stuck on the fine-grained screen?** A classic token also works and can be
pre-filled in one click:
<https://github.com/settings/tokens/new?scopes=repo&description=Piranha%20Vibes%20image%20uploads>
— the `repo` scope is already ticked, so just set an expiry and press
**Generate token**. The trade-off: a classic token can reach *all* your repos,
where the fine-grained one is limited to this single repository. Prefer
fine-grained when you can.

**2. Install it — the quick way.** In the Apps Script editor find
`INSTALL_GITHUB_UPLOADS` and paste the token on the `TOKEN` line:

```js
function INSTALL_GITHUB_UPLOADS() {
  var TOKEN  = '';                              // <-- paste your token here
  var REPO   = 'mraadarshdubey/piranhavibes';   // owner/repo
  var BRANCH = 'main';
```

Save, pick **`INSTALL_GITHUB_UPLOADS`** from the function dropdown, press
**Run**. It doesn't just save the settings — it checks the repo is reachable,
makes a real test commit to prove write access, deletes that commit again, and
only then stores anything. The log tells you exactly what happened:

```
Repository   : mraadarshdubey/piranhavibes (public)
Write access : OK (test commit made)
Cleanup      : OK (test commit removed)

SUCCESS — image uploads are live.
```

If it fails you get the reason, not a generic error — wrong token, missing
Contents permission, or a repo the token can't see. Then blank the `TOKEN` line
and save.

Run **`CHECK_GITHUB_UPLOADS`** any time to confirm it's still working.

**2b. Or add the properties by hand** ▸ Project Settings ▸ Script Properties:

| Property       | Value                              | Notes                        |
| -------------- | ---------------------------------- | ---------------------------- |
| `GH_TOKEN`     | the token you just copied          | required                     |
| `GH_REPO`      | `mraadarshdubey/piranhavibes`      | required                     |
| `GH_BRANCH`    | `main`                             | optional, defaults to `main` |
| `GH_IMAGE_DIR` | `assets/img/products`              | optional                     |
| `GH_IMAGE_URL` | `raw`                              | optional — see below         |

**3. Re-deploy.** Script Properties take effect immediately, but if you also
pasted a newer `Code.gs`, publish it:
**Deploy ▸ Manage deployments ▸ pencil ▸ Version: New version ▸ Deploy**.
The first run of `INSTALL_GITHUB_UPLOADS` will ask permission to make external
requests — approve it.

**4. Check it.** Admin ▸ Settings ▸ *Product image storage* should now read
**Backend: GitHub** with your repo name.

#### `GH_IMAGE_URL` — how the image is linked

| Value             | Stored in the sheet                               | Behaviour                                                                 |
| ----------------- | ------------------------------------------------- | ------------------------------------------------------------------------- |
| `raw` *(default)* | `https://raw.githubusercontent.com/…/my-tee.webp` | Visible **instantly**, everywhere, including local testing. Public repos only. This is the default because it never leaves you staring at a broken image. |
| `relative`        | `assets/img/products/my-tee.webp`                 | Cleanest and fastest once live, and works for private repos. But the image only appears after GitHub Pages finishes rebuilding — usually under a minute — and never resolves on `localhost`, because the file exists only in the repo. |
| `jsdelivr`        | `https://cdn.jsdelivr.net/gh/…/my-tee.webp`       | Global CDN, public repos only. Fast, but a brand-new file can take a few minutes to propagate. |

Switch to `relative` once you're happy everything works and want the extra
speed. Changing it only affects *future* uploads — images already added keep
whichever URL they were saved with.

> **A note on the token.** You are not sharing it with anyone — you paste it
> into your own Apps Script project. It is never written into `config.js`,
> never sent to a visitor's browser, and never committed to the repo. If it
> ever leaks, delete it at
> <https://github.com/settings/personal-access-tokens> and generate a new one;
> because it is scoped to Contents on a single repo, that is the entire blast
> radius.

---

## Sheet columns reference

You can also add a row directly in the **Products** sheet — the columns are:

```
sku | slug | name | category | price | mrp | stock | sizes | colors |
badge | featured | active | image | desc
```

`sizes` and `colors` are pipe-separated: `S|M|L|XL`. `featured` and `active`
are `1` or `0`. `mrp` shows as a struck-through "was" price — leave it `0` to
hide it. Valid `category` values: `kids`, `women`, `men`, `tote`, `yoga`,
`infant`.

---

## Part 6 — Going live on a real domain

The site is fully static, so any static host works — no server needed. The
whole project lives at the **root** of `mraadarshdubey/piranhavibes`, so
`index.html` is the entry point with no sub-folder to configure.

### How it's currently deployed

Repo ▸ **Settings ▸ Pages ▸ Source: Deploy from a branch ▸ `main` / `/ (root)`**,
with a `CNAME` file at the repo root containing `piranhavibes.com`, and
Cloudflare fronting the domain.

The repo is **public**, which is what makes GitHub Pages free and lets the
`raw`/`jsdelivr` image URLs work. It also means `admin.html` is reachable by
anyone — that's fine, because it's only a login form and every piece of real
data is fetched after the backend verifies `ADMIN_KEY`. The key is the whole
defence, so keep it strong.

**A caution about the `CNAME` file.** The moment it exists, Pages treats that
domain as the site's address and 301-redirects every `*.github.io` URL there.
If the domain's DNS isn't already pointing at the Pages site, both URLs go dark
— the github.io one redirects away, and the custom domain serves whatever it
was serving before. Point the DNS first, then add `CNAME`.

In Cloudflare, keep **SSL/TLS mode on "Full"**. "Flexible" against an
HTTPS origin causes a redirect loop.

### Other hosts

- **Netlify / Vercel / Cloudflare Pages** — connect the GitHub repo, leave the
  build command empty and the publish directory as `/`. Free tier is plenty,
  and Pages works from a private repo at no cost.
- **Your existing hosting** — upload the folder contents over FTP.

Then point `www.piranhavibes.com` at the host and add the SSL certificate
(automatic on all of the above).

### Pushing future changes

```bash
git add -A && git commit -m "your message" && git push
```

### Before you launch

- [ ] Set `ADMIN_KEY` to something long and unguessable — not a name, not a
      date, not a phone number. `admin.html` sits at a public URL, so this key
      is the only thing between the internet and your orders and pricing. A
      passphrase of four random words, or 16+ mixed characters, is the bar.
- [ ] Set your real UPI ID in Admin ▸ Settings.
- [ ] Check shipping fee and free-shipping threshold.
- [ ] Update the Instagram / Facebook URLs in `assets/js/config.js`.
- [ ] Place one live test order end-to-end and confirm the Sheet row appears.

### A note on security

`admin.html` is protected by the admin key, but the *page file itself* is
public on a static host — anyone can open the login screen. Every read of
orders and every write to pricing or stock is verified against `ADMIN_KEY` by
the Apps Script backend, so the login screen alone gives nothing away.

That makes the key the whole defence. Two rules:

1. **It must not be guessable.** Someone who knows the brand will try the owner's
   name, the shop name, and dates. Use random words or a generated string.
2. **It must never enter this repository.** No `config.js`, no README, no
   commit message, no screenshot. Script Properties only.

If you suspect it leaked, change `ADMIN_KEY` in Script Properties — every
existing session stops working immediately, no redeploy required.

---

## Troubleshooting

**"Offline preview" banner won't go away**
`API_URL` is empty or wrong in `config.js`, or the deployment's *Who has
access* isn't set to **Anyone**. Open the `/exec` URL directly in a browser —
you should see `{"ok":true,"service":"Piranha Vibes API","version":1}`.

**Orders aren't reaching the Sheet**
The customer still gets an order ID (it's saved on their device so nothing is
lost), and the success page tells them to confirm on WhatsApp. Re-deploy the
script as a **new version** and check the access setting.

**Price changes don't show on the site**
The catalogue is cached in the browser for 5 minutes. Hit **Refresh** in the
admin sidebar, or wait it out. Change `CACHE_MINUTES` in `config.js` to make it
shorter.

**`TypeError: Cannot read properties of null (reading 'getSheetByName')`**
The script is standalone (made at script.google.com) rather than bound to a
Sheet. Use the current `Code.gs` — it creates the spreadsheet for you on the
first `setup` run, or uses the `SHEET_ID` script property if you set one. See
*"If you created the script at script.google.com instead"* above.

**`SHEET_ID is set but that spreadsheet could not be opened`**
The value must be only the ID, not the whole URL — the part between `/d/` and
`/edit`. Also check the sheet isn't in someone else's Drive or in the trash.

**I can't find the spreadsheet the script created**
In the Apps Script editor, run the `openDatabase` function and read the
**Execution log** — it prints the URL. Or search Drive for
"Piranha Vibes — Store DB".

**Image upload says "GitHub upload failed (404)"**
`GH_REPO` is wrong, the branch doesn't exist, or the token wasn't given access
to that repository. `GH_REPO` must be `owner/repo` with no `https://` and no
`.git`.

**Image upload says "(401)" or "(403)"**
The token is expired, mistyped, or missing the **Contents: Read and write**
permission. Generate a fresh one and update `GH_TOKEN`.

**"Image uploads are switched off"**
`GH_TOKEN` and `GH_REPO` aren't set, or you set them but haven't deployed a
**new version** so the live web app is still running the old code. Run
`diagnose` in the editor — it prints whether image uploads are enabled.

**Uploaded image doesn't show on the site yet**
Only happens with `GH_IMAGE_URL=relative`, where the image appears once GitHub
Pages finishes rebuilding — check the Actions tab of your repo. The default
`raw` shows it immediately.

**Admin login rejects the right password**
The login screen diagnoses this for you — it asks the backend a `health`
question and then tells you which of these it actually is:

1. **`ADMIN_KEY` was never added** — every password is refused, because
   `requireKey` needs the property to exist. Add it in Project Settings ▸
   Script Properties. No redeploy needed.
2. **The deployment is running old code** — you pasted the new `Code.gs` and
   saved, but Apps Script keeps serving the last *deployed* version.
   **Deploy ▸ Manage deployments ▸ pencil ▸ Version: New version ▸ Deploy.**
3. **Genuinely the wrong key** — it's case-sensitive; check for a stray space
   at either end.

To see the same answer from inside the editor, run the **`diagnose`** function
and read the Execution log. It prints whether `ADMIN_KEY` is set (never its
value), the code version, the spreadsheet URL and the row count of every sheet.

You can also check from a browser — open your `/exec` URL with
`?action=health` on the end. `"adminKeySet": true` means the password is
configured; if you see `"service"` instead of `"adminKeySet"`, the deployment
is stale.

---

### Razorpay Webhook Setup (Automated Order Payment Verification)

1. Open your [Razorpay Dashboard](https://dashboard.razorpay.com/) (Live Mode).
2. Go to **Settings** ▸ **Webhooks** ▸ **Add New Webhook**.
3. **Webhook URL**: Paste your Google Apps Script Web App `/exec` URL (the one from `config.js` `API_URL`).
4. **Secret**: Leave blank or set as preferred.
5. **Active Events**: Select:
   - `payment.captured`
   - `payment_link.paid`
   - `order.paid`
6. Click **Save Webhook**.

Whenever a customer completes payment on Razorpay, your Google Apps Script automatically marks the order in your Google Sheet as **Paid** with the Razorpay Payment ID (`pay_XXXXX`).
