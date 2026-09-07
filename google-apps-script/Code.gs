/*  =============================================================
    PIRANHA VIBES — Google Sheets backend  (Google Apps Script)
    -------------------------------------------------------------
    One file. Deploy it as a Web App and your Google Sheet becomes
    the database for products, pricing, stock, orders and settings.

    QUICK START  (full walkthrough in SETUP.md)
      1. Create a Google Sheet. Extensions ▸ Apps Script.
         (A standalone project from script.google.com also works — see
          SHEET_ID below.)
      2. Replace Code.gs with this file. Save.
      3. Project Settings ▸ Script Properties ▸ add:
            ADMIN_KEY   = a strong password of your choice
            NOTIFY_EMAIL= piranhavibes@gmail.com   (optional)
         To let the admin panel upload product photos into your
         GitHub repo, run INSTALL_GITHUB_UPLOADS — it sets these
         for you and verifies them with a real test commit:
            GH_TOKEN    = fine-grained PAT, Contents: Read & Write
            GH_REPO     = your-username/your-repo
            GH_BRANCH   = main
         Leave them unset and photo upload is simply switched off;
         you can still type an image path or URL by hand.
         Only for STANDALONE projects (not needed if you opened this
         script from inside a Sheet):
            SHEET_ID    = the long ID from the spreadsheet URL, i.e.
                          docs.google.com/spreadsheets/d/<SHEET_ID>/edit
         Leave SHEET_ID out and setup() creates the spreadsheet for you
         and saves its ID here automatically.
      4. Run  setup()  once  (Run ▸ setup) and grant permissions.
      5. Deploy ▸ New deployment ▸ Web app
            Execute as: Me      Who has access: Anyone
      6. Copy the /exec URL into assets/js/config.js → API_URL
    ============================================================= */

/* Bumped whenever Code.gs changes in a way the site can detect, so a
   stale deployment is easy to spot: GET ?action=health */
var API_VERSION = 2;

var SHEETS = {
  products: 'Products',
  orders: 'Orders',
  items: 'OrderItems',
  settings: 'Settings',
  coupons: 'Coupons',
  contacts: 'Contacts',
  subs: 'Subscribers'
};

var HEADERS = {
  Products: ['sku','slug','name','category','price','mrp','stock','sizes','colors','badge','featured','active','image','desc'],
  Orders: ['id','createdAt','status','customer','phone','email','addr1','addr2','landmark','city','state','pincode',
           'itemCount','subtotal','discount','coupon','shipping','codFee','tax','total','paymentMethod','txnRef',
           'notes','courier','trackingId','adminNote','source','updatedAt'],
  OrderItems: ['orderId','createdAt','sku','slug','name','size','color','qty','price','lineTotal'],
  Settings: ['key','value'],
  Coupons: ['code','type','value','minOrder','active'],
  Contacts: ['createdAt','name','phone','email','message'],
  Subscribers: ['createdAt','email']
};

var DEFAULT_SETTINGS = {
  shippingFee: 60,
  freeShippingAbove: 999,
  codEnabled: 1,
  codFee: 0,
  taxPercent: 0,
  upiId: 'piranhavibes@upi',
  announcement: ''
};

/* ==========================================================
   SETUP — run once from the Apps Script editor
   ========================================================== */
function setup() {
  var book = ss();

  Object.keys(HEADERS).forEach(function (name) {
    var sh = book.getSheetByName(name);
    if (!sh) sh = book.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, HEADERS[name].length).setValues([HEADERS[name]]);
      sh.getRange(1, 1, 1, HEADERS[name].length)
        .setFontWeight('bold').setBackground('#0c0e2b').setFontColor('#ffffff');
      sh.setFrozenRows(1);
    }
  });

  var st = book.getSheetByName(SHEETS.settings);
  if (st.getLastRow() < 2) {
    var rows = Object.keys(DEFAULT_SETTINGS).map(function (k) {
      return [k, DEFAULT_SETTINGS[k]];
    });
    st.getRange(2, 1, rows.length, 2).setValues(rows);
  }

  var cp = book.getSheetByName(SHEETS.coupons);
  if (cp.getLastRow() < 2) {
    cp.getRange(2, 1, 2, 5).setValues([
      ['VIBES10', 'percent', 10, 799, 1],
      ['FLAT50', 'flat', 50, 599, 1]
    ]);
  }

  var pr = book.getSheetByName(SHEETS.products);
  if (pr.getLastRow() < 2) {
    pr.getRange(2, 1, SEED.length, HEADERS.Products.length).setValues(SEED);
    pr.autoResizeColumns(1, 4);
  }

  // A brand-new spreadsheet ships with an empty "Sheet1" — drop it.
  var def = book.getSheetByName('Sheet1');
  if (def && def.getLastRow() === 0 && book.getSheets().length > 1) {
    book.deleteSheet(def);
  }

  var msg =
    'Piranha Vibes backend ready — ' + SEED.length + ' products seeded.\n' +
    'Spreadsheet: ' + book.getName() + '\n' +
    'Open it here: ' + book.getUrl();

  Logger.log(msg);
  // Only bound scripts have a UI to toast into.
  try { SpreadsheetApp.getActive().toast('Backend ready — ' + SEED.length + ' products seeded.'); } catch (e) {}
  return msg;
}

/*  ============================================================
    ONE-TIME ADMIN PASSWORD INSTALLER
    ------------------------------------------------------------
    Use this instead of the Script Properties screen if that is
    giving you trouble. It saves the password AND verifies it,
    so you get a straight yes/no in the log.

      1. Type your password between the quotes on the NEW_KEY
         line below.
      2. Function dropdown at the top -> INSTALL_ADMIN_KEY -> Run.
      3. Read the Execution log.
      4. Blank the quotes again and save, so the password is not
         left sitting in your script.

    No redeploy needed — the key is read fresh on every request.
    ============================================================ */
function INSTALL_ADMIN_KEY() {
  var NEW_KEY = '';   // <-- type your password here, between the quotes

  if (!NEW_KEY) {
    throw new Error(
      'NEW_KEY is empty. In the editor, put your password between the quotes ' +
      'on the NEW_KEY line inside INSTALL_ADMIN_KEY, save, then Run again.'
    );
  }
  if (String(NEW_KEY).length < 6) {
    throw new Error('Use at least 6 characters for the admin password.');
  }

  var props = PropertiesService.getScriptProperties();
  props.setProperty('ADMIN_KEY', String(NEW_KEY));

  var saved = props.getProperty('ADMIN_KEY');
  var msg;
  if (saved === String(NEW_KEY)) {
    msg =
      'SUCCESS — ADMIN_KEY saved (' + saved.length + ' characters).\n' +
      'You can sign in to admin.html right now. No redeploy needed.\n\n' +
      'NEXT: clear the NEW_KEY line above (back to two empty quotes) and save,\n' +
      'so your password is not left sitting in the script source.';
  } else {
    msg = 'FAILED — the property did not save. Try the Script Properties screen instead.';
  }
  Logger.log(msg);
  return msg;
}

/*  ============================================================
    ONE-TIME GITHUB IMAGE-UPLOAD INSTALLER
    ------------------------------------------------------------
    Turns on "upload a photo in the admin panel and it lands in
    the repo". It does not just save the settings — it proves
    them, by making a real test commit and deleting it again,
    so you get a definite WORKS or a precise reason why not.

      1. Create a fine-grained token (one minute):
           https://github.com/settings/personal-access-tokens/new
           Repository access . Only select repositories . your repo
           Permissions . Repository permissions . Contents
                        . Read and write
           Generate token, then copy it (shown once).
      2. Paste it between the quotes on the TOKEN line below.
      3. Function dropdown -> INSTALL_GITHUB_UPLOADS -> Run.
      4. Read the Execution log.
      5. Blank the TOKEN line again and save.

    No redeploy needed.
    ============================================================ */
function INSTALL_GITHUB_UPLOADS() {
  var TOKEN  = '';                              // <-- paste your token here
  var REPO   = 'mraadarshdubey/piranhavibes';   // owner/repo
  var BRANCH = 'main';
  var URLMODE = 'raw';                          // 'raw' | 'relative' | 'jsdelivr'

  if (!TOKEN) {
    throw new Error(
      'TOKEN is empty. Paste your fine-grained GitHub token between the quotes ' +
      'on the TOKEN line inside INSTALL_GITHUB_UPLOADS, save, then Run again.'
    );
  }
  if (!/^[\w-]+\/[\w.-]+$/.test(REPO)) {
    throw new Error('REPO must look like owner/repo — got "' + REPO + '".');
  }

  var headers = {
    Authorization: 'Bearer ' + TOKEN,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
  var log = ['GITHUB IMAGE UPLOADS — INSTALL', '-------------------------------'];

  // 1. Whose token is this? Catches a token made on the wrong account.
  var who = UrlFetchApp.fetch('https://api.github.com/user', {
    headers: headers, muteHttpExceptions: true
  });
  if (who.getResponseCode() === 200) {
    try {
      log.push('Token owner  : ' + JSON.parse(who.getContentText()).login);
    } catch (e) {}
  } else if (who.getResponseCode() === 401) {
    throw new Error(explainGhError(who, REPO, 'identifying the token', TOKEN));
  }

  // 2. Does the repo exist and is BRANCH real?
  //    NOTE: per GitHub's docs, GET /repos/{owner}/{repo} only needs
  //    "Metadata: read", and public repositories answer it even with no
  //    permissions at all. So this proves the repo exists — nothing more.
  //    The write test below is the only real proof of access.
  var repoRes = UrlFetchApp.fetch('https://api.github.com/repos/' + REPO, {
    headers: headers, muteHttpExceptions: true
  });
  if (repoRes.getResponseCode() !== 200) {
    throw new Error(explainGhError(repoRes, REPO, 'reading the repository', TOKEN));
  }
  var info = JSON.parse(repoRes.getContentText());
  log.push('Repository   : ' + info.full_name + (info['private'] ? ' (private)' : ' (public)'));
  log.push('Default brnch: ' + info.default_branch);
  log.push('Owner type   : ' + (info.owner && info.owner.type) +
           ((info.owner && info.owner.type === 'Organization')
             ? ' — org repos may also need the token approved by an org owner'
             : ' — personal repo, no org approval needed'));
  if (info['private']) {
    log.push('NOTE         : private repo — GH_IMAGE_URL must be "relative";');
    log.push('               raw and jsdelivr URLs need authentication.');
  }
  if (info.default_branch !== BRANCH) {
    log.push('NOTE         : you set BRANCH="' + BRANCH + '" but the default is "' +
             info.default_branch + '". Make sure that is intentional.');
  }

  // 2. can it actually write? Commit a probe file, then delete it.
  var probePath = '.github/pv-upload-check.txt';
  var api = 'https://api.github.com/repos/' + REPO + '/contents/' +
            probePath.split('/').map(encodeURIComponent).join('/');
  var put = UrlFetchApp.fetch(api, {
    method: 'put', contentType: 'application/json', headers: headers,
    payload: JSON.stringify({
      message: 'chore: verify image upload access',
      content: Utilities.base64Encode('Piranha Vibes upload check. Safe to delete.'),
      branch: BRANCH
    }),
    muteHttpExceptions: true
  });
  if (put.getResponseCode() !== 200 && put.getResponseCode() !== 201) {
    throw new Error(explainGhError(put, REPO, 'writing a file', TOKEN));
  }
  log.push('Contents:write: OK (test commit made) — this is the check that matters');

  var sha = JSON.parse(put.getContentText()).content.sha;
  var del = UrlFetchApp.fetch(api, {
    method: 'delete', contentType: 'application/json', headers: headers,
    payload: JSON.stringify({
      message: 'chore: remove upload access check', sha: sha, branch: BRANCH
    }),
    muteHttpExceptions: true
  });
  log.push('Cleanup      : ' + (del.getResponseCode() === 200
    ? 'OK (test commit removed)'
    : 'left ' + probePath + ' behind — delete it manually'));

  // 3. only now save the settings
  PropertiesService.getScriptProperties().setProperties({
    GH_TOKEN: TOKEN,
    GH_REPO: REPO,
    GH_BRANCH: BRANCH,
    GH_IMAGE_URL: URLMODE
  }, false);

  log.push('');
  log.push('SUCCESS — image uploads are live.');
  log.push('Images will be committed to ' + REPO + ' : ' + ghConfig().dir + '/');
  log.push('URL style: ' + URLMODE +
           (URLMODE === 'raw' ? ' (appears instantly)' : ''));
  log.push('');
  log.push('NEXT: clear the TOKEN line above (back to two empty quotes) and save,');
  log.push('so the token is not left sitting in your script source.');

  var msg = log.join('\n');
  Logger.log(msg);
  return msg;
}

function explainGhError(res, repo, doing, token) {
  var code = res.getResponseCode();
  var detail = '';
  try { detail = JSON.parse(res.getContentText()).message || ''; } catch (e) {}

  // GitHub tells us exactly which permission the call wanted.
  var h = res.getHeaders() || {};
  var needed = h['x-accepted-github-permissions'] ||
               h['X-Accepted-GitHub-Permissions'] || '';
  var scopes = h['x-oauth-scopes'] || h['X-OAuth-Scopes'] || '';
  var kind = /^github_pat_/.test(String(token)) ? 'fine-grained'
           : /^ghp_/.test(String(token)) ? 'classic'
           : 'unknown type';

  var lines = ['FAILED while ' + doing + ' (HTTP ' + code + ')' + (detail ? ' — ' + detail : '')];
  lines.push('Token looks like: ' + kind +
             (String(token).length ? ' (' + String(token).length + ' characters)' : ''));
  if (needed) lines.push('GitHub says this call needs: ' + needed);
  if (scopes) lines.push('Classic token scopes present: ' + (scopes || '(none)'));
  lines.push('');

  if (code === 401) {
    lines.push('FIX: the token was rejected outright — mistyped, expired or revoked.');
    lines.push('     Check for a stray space, or generate a new token.');
  } else if (code === 403) {
    lines.push('FIX: the token is real, but it lacks "Contents: Read and write".');
    lines.push('');
    lines.push('     GitHub requires, per endpoint:');
    lines.push('       GET  /repos/{owner}/{repo}            -> Metadata: read');
    lines.push('       GET  /repos/{owner}/{repo}/contents/  -> Contents: read');
    lines.push('       PUT  /repos/{owner}/{repo}/contents/  -> Contents: WRITE   <- we need this');
    lines.push('       DEL  /repos/{owner}/{repo}/contents/  -> Contents: WRITE');
    lines.push('     A PUBLIC repo answers the read calls even with no permissions,');
    lines.push('     which is why the earlier steps passed and this one did not.');
    lines.push('');
    if (kind === 'classic') {
      lines.push('     Classic token: it needs the "repo" scope ticked.');
      lines.push('     https://github.com/settings/tokens');
    } else {
      lines.push('     You do NOT need a new token — edit the one you have:');
      lines.push('       1. https://github.com/settings/personal-access-tokens');
      lines.push('       2. Click your token');
      lines.push('       3. Repository access -> Only select repositories -> ' + repo);
      lines.push('       4. Scroll to *Repository permissions* (NOT Account permissions)');
      lines.push('       5. Contents  ->  Read and write');
      lines.push('       6. Update token at the bottom of the page');
    }
    lines.push('');
    lines.push('     Then Run INSTALL_GITHUB_UPLOADS again.');
  } else if (code === 404) {
    lines.push('FIX: GitHub cannot find "' + repo + '" for this token.');
    lines.push('     Check the owner/repo spelling, and that the token lists this');
    lines.push('     repository under "Only select repositories".');
  } else if (code === 409 || code === 422) {
    lines.push('FIX: the branch may be protected, or the branch name is wrong.');
    lines.push('     Check BRANCH in INSTALL_GITHUB_UPLOADS matches a real branch.');
  } else {
    lines.push('Unexpected response from GitHub.');
  }
  return lines.join('\n');
}

/* Reports upload config and live connectivity, without writing anything. */
function CHECK_GITHUB_UPLOADS() {
  var g = ghConfig();
  if (!g.token || !g.repo) {
    var m = 'Image uploads are OFF — GH_TOKEN and/or GH_REPO are not set.\n' +
            'Run INSTALL_GITHUB_UPLOADS to turn them on.';
    Logger.log(m);
    return m;
  }
  var res = UrlFetchApp.fetch('https://api.github.com/repos/' + g.repo, {
    headers: {
      Authorization: 'Bearer ' + g.token,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    muteHttpExceptions: true
  });
  var msg = res.getResponseCode() === 200
    ? 'Image uploads are ON.\n' +
      '  Repo   : ' + g.repo + '\n' +
      '  Branch : ' + g.branch + '\n' +
      '  Folder : ' + g.dir + '\n' +
      '  URLs   : ' + g.urlMode + '\n' +
      '  Token  : valid (' + String(g.token).length + ' characters)'
    : 'Image uploads are configured but the token is not working right now.\n' +
      explainGhError(res, g.repo, 'reading the repository', g.token);
  Logger.log(msg);
  return msg;
}

/* Confirms the password without ever revealing it. */
function CHECK_ADMIN_KEY() {
  var k = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  var msg = k
    ? 'ADMIN_KEY is set — ' + k.length + ' characters, starts with "' +
      k.charAt(0) + '", ends with "' + k.charAt(k.length - 1) + '". Login will work.'
    : 'ADMIN_KEY is NOT set. Run INSTALL_ADMIN_KEY, or add it in Project Settings > Script Properties.';
  Logger.log(msg);
  return msg;
}

/* Prints where the database lives — handy if you lose the tab. */
function openDatabase() {
  var url = ss().getUrl();
  Logger.log('Spreadsheet URL: ' + url);
  return url;
}

/* ==========================================================
   ROUTING
   ========================================================== */
function doGet(e) {
  var p = e && e.parameter ? e.parameter : {};
  var out;
  try {
    if (p.data) {
      // JSONP fallback for writes: the whole body arrives encoded.
      out = route(JSON.parse(decodeURIComponent(p.data)));
    } else if (p.action) {
      // Query parameters double as the payload, so every action in route()
      // is reachable over JSONP. Keeping one dispatch table means a new
      // action can never be reachable by POST but silently missing here.
      out = route({ action: p.action, payload: p });
    } else {
      out = { ok: true, service: 'Piranha Vibes API', version: API_VERSION };
    }
  } catch (err) {
    out = { ok: false, error: String(err && err.message ? err.message : err) };
  }
  return reply(out, p.callback);
}

function doPost(e) {
  var out;
  try {
    var raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    var parsed = JSON.parse(raw);

    // Auto-detect Razorpay Webhook payloads
    if (parsed.event || parsed.entity === 'event' || parsed.action === 'razorpayWebhook') {
      out = handleRazorpayWebhook(parsed);
    } else {
      out = route(parsed);
    }
  } catch (err) {
    out = { ok: false, error: String(err && err.message ? err.message : err) };
  }
  return reply(out, null);
}

function route(body) {
  var a = body.action;
  var d = body.payload || {};

  // public
  if (a === 'health') return health();
  if (a === 'catalog') return catalog();
  if (a === 'createOrder') return createOrder(d);
  if (a === 'track') return trackOrder(d.id, d.phone);
  if (a === 'contact') return saveContact(d);
  if (a === 'subscribe') return saveSubscriber(d);
  if (a === 'razorpayWebhook') return handleRazorpayWebhook(d);

  // admin
  if (!requireKey(d.key)) return { ok: false, error: 'Invalid or missing admin key' };
  if (a === 'adminPing') return { ok: true };
  if (a === 'adminData') return adminData();
  if (a === 'uploadImage') return uploadImage(d);
  if (a === 'storageStatus') return storageStatus();
  if (a === 'updateOrderStatus') return updateOrderStatus(d.id, d.status);
  if (a === 'updateOrderMeta') return updateOrderMeta(d);
  if (a === 'updateProducts') return updateProducts(d.updates || []);
  if (a === 'updateProduct') return upsertProduct(d, false);
  if (a === 'createProduct') return upsertProduct(d, true);
  if (a === 'deleteProduct') return deleteProduct(d.slug);
  if (a === 'saveCoupon') return saveCoupon(d);
  if (a === 'deleteCoupon') return deleteCoupon(d.code);
  if (a === 'updateSettings') return updateSettings(d);

  return { ok: false, error: 'Unknown action: ' + a };
}

/* ==========================================================
   RAZORPAY WEBHOOK HANDLER
   ========================================================== */
function handleRazorpayWebhook(body) {
  try {
    var event = body.event || '';
    var payload = body.payload || {};
    var payment = (payload.payment && payload.payment.entity) || (payload.payment_link && payload.payment_link.entity) || {};
    var paymentId = payment.id || '';
    var contact = String(payment.contact || '').replace(/\D/g, '').slice(-10);
    var email = String(payment.email || '').toLowerCase().trim();
    var notes = payment.notes || {};
    var targetOrderId = notes.orderId || notes.id || '';

    if (!paymentId && !event) {
      return { ok: false, error: 'Not a valid Razorpay webhook payload' };
    }

    var book = ss();
    var sh = book.getSheetByName(SHEETS.orders);
    if (!sh) return { ok: false, error: 'Orders sheet missing' };

    var data = sh.getDataRange().getValues();
    if (data.length < 2) return { ok: true, message: 'No orders to update' };

    var header = data[0];
    var idCol = header.indexOf('id');
    var statusCol = header.indexOf('status');
    var phoneCol = header.indexOf('phone');
    var emailCol = header.indexOf('email');
    var txnCol = header.indexOf('txnRef');
    var adminNoteCol = header.indexOf('adminNote');
    var updatedCol = header.indexOf('updatedAt');

    var matchedRowIndex = -1;

    // 1. Match by explicit targetOrderId in notes if provided
    if (targetOrderId) {
      for (var r = data.length - 1; r >= 1; r--) {
        if (String(data[r][idCol]).trim().toUpperCase() === String(targetOrderId).trim().toUpperCase()) {
          matchedRowIndex = r + 1;
          break;
        }
      }
    }

    // 2. Match by recent 10-digit customer phone
    if (matchedRowIndex === -1 && contact && contact.length === 10) {
      for (var r = data.length - 1; r >= 1; r--) {
        var rowPhone = String(data[r][phoneCol] || '').replace(/\D/g, '').slice(-10);
        var rowStatus = String(data[r][statusCol] || '').toLowerCase();
        if (rowPhone === contact && (rowStatus === 'pending' || rowStatus === 'new' || rowStatus === 'unpaid')) {
          matchedRowIndex = r + 1;
          break;
        }
      }
    }

    // 3. Match by customer email
    if (matchedRowIndex === -1 && email) {
      for (var r = data.length - 1; r >= 1; r--) {
        var rowEmail = String(data[r][emailCol] || '').toLowerCase().trim();
        var rowStatus = String(data[r][statusCol] || '').toLowerCase();
        if (rowEmail === email && (rowStatus === 'pending' || rowStatus === 'new' || rowStatus === 'unpaid')) {
          matchedRowIndex = r + 1;
          break;
        }
      }
    }

    if (matchedRowIndex > 0) {
      var nowStr = new Date().toISOString();
      sh.getRange(matchedRowIndex, statusCol + 1).setValue('Paid');
      if (txnCol >= 0) {
        sh.getRange(matchedRowIndex, txnCol + 1).setValue('Razorpay: ' + paymentId);
      }
      if (adminNoteCol >= 0) {
        var existingNote = String(data[matchedRowIndex - 1][adminNoteCol] || '');
        var newNote = (existingNote ? existingNote + ' | ' : '') + 'Verified via Razorpay webhook (' + event + ') on ' + nowStr;
        sh.getRange(matchedRowIndex, adminNoteCol + 1).setValue(newNote);
      }
      if (updatedCol >= 0) {
        sh.getRange(matchedRowIndex, updatedCol + 1).setValue(nowStr);
      }
      return { ok: true, status: 'updated', orderId: data[matchedRowIndex - 1][idCol], paymentId: paymentId };
    }

    return { ok: true, status: 'logged_unmatched', paymentId: paymentId, note: 'No matching pending order found' };
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
}

function reply(obj, callback) {
  var json = JSON.stringify(obj);
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function requireKey(key) {
  var real = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  return !!real && String(key) === String(real);
}

/*  Public, and deliberately so — it reveals no secret, only whether the
    deployment is finished being set up. When ADMIN_KEY is missing every
    admin action is refused, so "not configured" means locked, not open.
    The login screen uses this to tell "wrong password" apart from
    "nobody has set a password yet", which are very different problems. */
function health() {
  var props = PropertiesService.getScriptProperties();
  var out = {
    ok: true,
    version: API_VERSION,
    adminKeySet: !!props.getProperty('ADMIN_KEY'),
    imageBackend: ghReady() ? 'github' : 'none',
    sheetOk: false,
    productCount: 0
  };
  try {
    var sh = ss().getSheetByName(SHEETS.products);
    out.sheetOk = !!sh;
    out.productCount = sh ? Math.max(0, sh.getLastRow() - 1) : 0;
  } catch (e) {
    out.sheetError = String(e.message);
  }
  return out;
}

/*  Run this from the editor when something isn't working — it prints a
    checklist to the Execution log without ever printing the key itself. */
function diagnose() {
  var props = PropertiesService.getScriptProperties();
  var key = props.getProperty('ADMIN_KEY');
  var lines = [
    'PIRANHA VIBES — BACKEND DIAGNOSTIC',
    '----------------------------------',
    'Script code version : ' + API_VERSION,
    'ADMIN_KEY           : ' + (key
      ? 'SET (' + String(key).length + ' characters)'
      : '*** NOT SET — the admin panel cannot log in ***'),
    'NOTIFY_EMAIL        : ' + (props.getProperty('NOTIFY_EMAIL') || 'not set (no order emails)'),
    'Image uploads      : ' + (ghReady()
      ? 'GitHub — ' + props.getProperty('GH_REPO') + ' (' + ghConfig().branch + ')'
      : '*** DISABLED — set GH_TOKEN and GH_REPO to enable ***')
  ];
  try {
    var book = ss();
    lines.push('Spreadsheet         : ' + book.getName());
    lines.push('Spreadsheet URL     : ' + book.getUrl());
    Object.keys(HEADERS).forEach(function (n) {
      var sh = book.getSheetByName(n);
      lines.push('  ' + (n + '                ').slice(0, 14) +
                 (sh ? Math.max(0, sh.getLastRow() - 1) + ' rows' : 'MISSING — run setup()'));
    });
  } catch (e) {
    lines.push('Spreadsheet         : ERROR — ' + e.message);
  }
  if (!key) {
    lines.push('');
    lines.push('FIX: Project Settings > Script Properties > Add script property');
    lines.push('     Name: ADMIN_KEY     Value: <the password you want>');
    lines.push('     Then press "Save script properties". No redeploy needed.');
  }
  var msg = lines.join('\n');
  Logger.log(msg);
  return msg;
}

/* ==========================================================
   SHEET HELPERS
   ========================================================== */
/*  Resolves the spreadsheet that acts as the database.

    Works for both project styles:
      • Bound script  — created via a Sheet's Extensions ▸ Apps Script.
                        getActiveSpreadsheet() gives us the parent.
      • Standalone    — created at script.google.com. There is no active
                        spreadsheet, so we use the SHEET_ID script property;
                        if that isn't set either, we create the database
                        automatically and remember its ID.

    Set SHEET_ID in Project Settings ▸ Script Properties to point the script
    at a specific spreadsheet (paste the long ID from its URL:
    docs.google.com/spreadsheets/d/THIS_PART/edit).                          */
var _BOOK = null;

function ss() {
  if (_BOOK) return _BOOK;
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SHEET_ID');

  if (id) {
    try {
      _BOOK = SpreadsheetApp.openById(String(id).trim());
      return _BOOK;
    } catch (e) {
      throw new Error(
        'SHEET_ID is set to "' + id + '" but that spreadsheet could not be opened. ' +
        'Paste only the ID from the URL (the part between /d/ and /edit), ' +
        'and make sure this Google account can edit it. Original error: ' + e.message
      );
    }
  }

  _BOOK = SpreadsheetApp.getActiveSpreadsheet();
  if (_BOOK) return _BOOK;

  // Standalone project with nothing configured — create the database once.
  _BOOK = SpreadsheetApp.create('Piranha Vibes — Store DB');
  props.setProperty('SHEET_ID', _BOOK.getId());
  Logger.log('Created a new database spreadsheet: ' + _BOOK.getUrl());
  return _BOOK;
}

function sheet(name) {
  var s = ss().getSheetByName(name);
  if (!s) { setup(); s = ss().getSheetByName(name); }
  return s;
}

function readTable(name) {
  var sh = sheet(name);
  var last = sh.getLastRow();
  if (last < 2) return [];
  var head = HEADERS[name];
  var vals = sh.getRange(2, 1, last - 1, head.length).getValues();
  return vals
    .filter(function (r) { return String(r[0]).trim() !== ''; })
    .map(function (r) {
      var o = {};
      head.forEach(function (h, i) { o[h] = r[i]; });
      return o;
    });
}

function findRow(name, colIndex, value) {
  var sh = sheet(name);
  var last = sh.getLastRow();
  if (last < 2) return -1;
  var col = sh.getRange(2, colIndex, last - 1, 1).getValues();
  for (var i = 0; i < col.length; i++) {
    if (String(col[i][0]).trim().toUpperCase() === String(value).trim().toUpperCase()) return i + 2;
  }
  return -1;
}

function iso(v) {
  if (!v) return '';
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

/* ==========================================================
   PUBLIC — catalog
   ========================================================== */
function readSettings() {
  var out = {};
  Object.keys(DEFAULT_SETTINGS).forEach(function (k) { out[k] = DEFAULT_SETTINGS[k]; });
  readTable(SHEETS.settings).forEach(function (r) {
    var v = r.value;
    if (v === 'TRUE' || v === true) v = 1;
    if (v === 'FALSE' || v === false) v = 0;
    out[String(r.key)] = v;
  });
  return out;
}

function catalog() {
  var products = readTable(SHEETS.products).map(function (p) {
    return {
      sku: p.sku, slug: p.slug, name: p.name, category: p.category,
      price: Number(p.price) || 0, mrp: Number(p.mrp) || 0,
      stock: Number(p.stock) || 0,
      sizes: String(p.sizes || ''), colors: String(p.colors || ''),
      badge: p.badge || '', featured: Number(p.featured) ? 1 : 0,
      active: Number(p.active) ? 1 : 0,
      image: p.image || '', desc: p.desc || ''
    };
  }).filter(function (p) { return p.slug; });

  var coupons = readTable(SHEETS.coupons).map(function (c) {
    return {
      code: String(c.code).toUpperCase(), type: String(c.type || 'percent'),
      value: Number(c.value) || 0, minOrder: Number(c.minOrder) || 0,
      active: Number(c.active) ? 1 : 0
    };
  }).filter(function (c) { return c.code; });

  return { ok: true, products: products, coupons: coupons, settings: readSettings() };
}

/* ==========================================================
   PUBLIC — create order
   ========================================================== */
function newOrderId() {
  var d = new Date();
  var p = function (n) { return ('0' + n).slice(-2); };
  var rnd = '';
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (var i = 0; i < 4; i++) rnd += chars.charAt(Math.floor(Math.random() * chars.length));
  return 'PV' + String(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate()) + '-' + rnd;
}

function createOrder(d) {
  if (!d || !d.name || !d.phone || !d.items || !d.items.length) {
    return { ok: false, error: 'Incomplete order' };
  }
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    var id = newOrderId();
    while (findRow(SHEETS.orders, 1, id) !== -1) id = newOrderId();

    var now = new Date();
    var oSheet = sheet(SHEETS.orders);
    oSheet.appendRow([
      id, now, 'New', d.name, "'" + String(d.phone), d.email || '',
      d.addr1 || '', d.addr2 || '', d.landmark || '', d.city || '', d.state || '',
      "'" + String(d.pincode || ''),
      Number(d.itemCount) || 0, Number(d.subtotal) || 0, Number(d.discount) || 0,
      d.coupon || '', Number(d.shipping) || 0, Number(d.codFee) || 0, Number(d.tax) || 0,
      Number(d.total) || 0, d.paymentMethod || '', d.txnRef || '',
      d.notes || '', '', '', '', d.source || '', now
    ]);

    var iSheet = sheet(SHEETS.items);
    var rows = d.items.map(function (i) {
      return [id, now, i.sku || '', i.slug || '', i.name || '', i.size || '', i.color || '',
              Number(i.qty) || 0, Number(i.price) || 0, Number(i.lineTotal) || 0];
    });
    iSheet.getRange(iSheet.getLastRow() + 1, 1, rows.length, HEADERS.OrderItems.length).setValues(rows);

    decrementStock(d.items);
    notify(id, d);

    return { ok: true, orderId: id };
  } finally {
    lock.releaseLock();
  }
}

function decrementStock(items) {
  var sh = sheet(SHEETS.products);
  var last = sh.getLastRow();
  if (last < 2) return;
  var slugCol = HEADERS.Products.indexOf('slug') + 1;
  var stockCol = HEADERS.Products.indexOf('stock') + 1;
  var slugs = sh.getRange(2, slugCol, last - 1, 1).getValues();
  var stocks = sh.getRange(2, stockCol, last - 1, 1).getValues();

  items.forEach(function (it) {
    for (var i = 0; i < slugs.length; i++) {
      if (String(slugs[i][0]) === String(it.slug)) {
        var cur = Number(stocks[i][0]) || 0;
        stocks[i][0] = Math.max(0, cur - (Number(it.qty) || 0));
        break;
      }
    }
  });
  sh.getRange(2, stockCol, last - 1, 1).setValues(stocks);
}

function notify(id, d) {
  try {
    var to = PropertiesService.getScriptProperties().getProperty('NOTIFY_EMAIL');
    if (!to) return;
    var lines = d.items.map(function (i) {
      return '• ' + i.name + ' (' + [i.size, i.color].filter(String).join(', ') + ') × ' + i.qty + ' — ₹' + i.lineTotal;
    }).join('\n');
    MailApp.sendEmail(to, 'New order ' + id + ' — ₹' + d.total,
      'Order ID: ' + id + '\n' +
      'Customer: ' + d.name + '  ' + d.phone + '  ' + (d.email || '') + '\n' +
      'Address: ' + [d.addr1, d.addr2, d.landmark, d.city, d.state, d.pincode].filter(String).join(', ') + '\n' +
      'Payment: ' + d.paymentMethod + (d.txnRef ? ' (UTR ' + d.txnRef + ')' : '') + '\n\n' +
      lines + '\n\n' +
      'Subtotal ₹' + d.subtotal + '\nDiscount ₹' + d.discount + '\nShipping ₹' + d.shipping +
      '\nTOTAL ₹' + d.total + '\n\n' +
      (d.notes ? 'Customer note: ' + d.notes + '\n' : ''));
  } catch (e) { /* notification is best-effort */ }
}

/* ==========================================================
   PUBLIC — track / contact / subscribe
   ========================================================== */
function trackOrder(id, phone) {
  if (!id) return { ok: false, error: 'Order ID required' };
  var row = findRow(SHEETS.orders, 1, id);
  if (row === -1) return { ok: false, error: 'Order not found' };

  var sh = sheet(SHEETS.orders);
  var vals = sh.getRange(row, 1, 1, HEADERS.Orders.length).getValues()[0];
  var o = {};
  HEADERS.Orders.forEach(function (h, i) { o[h] = vals[i]; });

  var stored = String(o.phone).replace(/\D/g, '').slice(-10);
  var given = String(phone || '').replace(/\D/g, '').slice(-10);
  if (given && stored && given !== stored) return { ok: false, error: 'Order not found' };

  var items = readTable(SHEETS.items)
    .filter(function (r) { return String(r.orderId) === String(o.id); })
    .map(function (r) {
      return { sku: r.sku, name: r.name, size: r.size, color: r.color,
               qty: Number(r.qty), price: Number(r.price), lineTotal: Number(r.lineTotal) };
    });

  return {
    ok: true,
    order: {
      id: o.id, status: o.status || 'New', createdAt: iso(o.createdAt),
      customer: o.customer, total: Number(o.total) || 0,
      courier: o.courier || '', trackingId: o.trackingId || '', items: items
    }
  };
}

function saveContact(d) {
  sheet(SHEETS.contacts).appendRow([new Date(), d.name || '', "'" + String(d.phone || ''), d.email || '', d.message || '']);
  return { ok: true };
}

function saveSubscriber(d) {
  if (!d.email) return { ok: false, error: 'Email required' };
  if (findRow(SHEETS.subs, 2, d.email) !== -1) return { ok: true, already: true };
  sheet(SHEETS.subs).appendRow([new Date(), d.email]);
  return { ok: true };
}

/* ==========================================================
   ADMIN
   ========================================================== */
function adminData() {
  var itemsByOrder = {};
  readTable(SHEETS.items).forEach(function (r) {
    var k = String(r.orderId);
    if (!itemsByOrder[k]) itemsByOrder[k] = [];
    itemsByOrder[k].push({
      sku: r.sku, slug: r.slug, name: r.name, size: r.size, color: r.color,
      qty: Number(r.qty) || 0, price: Number(r.price) || 0, lineTotal: Number(r.lineTotal) || 0
    });
  });

  var orders = readTable(SHEETS.orders).map(function (o) {
    return {
      id: o.id, createdAt: iso(o.createdAt), status: o.status || 'New',
      customer: o.customer, phone: String(o.phone).replace(/^'/, ''),
      email: o.email, addr1: o.addr1, addr2: o.addr2, landmark: o.landmark,
      city: o.city, state: o.state, pincode: String(o.pincode).replace(/^'/, ''),
      itemCount: Number(o.itemCount) || 0, subtotal: Number(o.subtotal) || 0,
      discount: Number(o.discount) || 0, coupon: o.coupon,
      shipping: Number(o.shipping) || 0, codFee: Number(o.codFee) || 0,
      tax: Number(o.tax) || 0, total: Number(o.total) || 0,
      paymentMethod: o.paymentMethod, txnRef: String(o.txnRef || ''),
      notes: o.notes, courier: o.courier, trackingId: String(o.trackingId || ''),
      adminNote: o.adminNote, items: itemsByOrder[String(o.id)] || []
    };
  }).reverse();

  var c = catalog();
  var contacts = readTable(SHEETS.contacts).map(function (r) {
    return { createdAt: iso(r.createdAt), name: r.name,
             phone: String(r.phone).replace(/^'/, ''), email: r.email, message: r.message };
  }).reverse();

  return { ok: true, orders: orders, products: c.products, coupons: c.coupons,
           settings: c.settings, contacts: contacts };
}

function updateOrderStatus(id, status) {
  var row = findRow(SHEETS.orders, 1, id);
  if (row === -1) return { ok: false, error: 'Order not found' };
  var sh = sheet(SHEETS.orders);
  sh.getRange(row, HEADERS.Orders.indexOf('status') + 1).setValue(status);
  sh.getRange(row, HEADERS.Orders.indexOf('updatedAt') + 1).setValue(new Date());
  return { ok: true };
}

function updateOrderMeta(d) {
  var row = findRow(SHEETS.orders, 1, d.id);
  if (row === -1) return { ok: false, error: 'Order not found' };
  var sh = sheet(SHEETS.orders);
  ['courier', 'trackingId', 'adminNote'].forEach(function (f) {
    if (d[f] !== undefined) sh.getRange(row, HEADERS.Orders.indexOf(f) + 1).setValue(d[f]);
  });
  sh.getRange(row, HEADERS.Orders.indexOf('updatedAt') + 1).setValue(new Date());
  return { ok: true };
}

function updateProducts(updates) {
  var sh = sheet(SHEETS.products);
  var n = 0;
  updates.forEach(function (u) {
    var row = findRow(SHEETS.products, HEADERS.Products.indexOf('slug') + 1, u.slug);
    if (row === -1) return;
    ['price', 'mrp', 'stock', 'featured', 'badge', 'active'].forEach(function (f) {
      if (u[f] !== undefined) sh.getRange(row, HEADERS.Products.indexOf(f) + 1).setValue(u[f]);
    });
    n++;
  });
  return { ok: true, updated: n };
}

function upsertProduct(d, isNew) {
  var slugCol = HEADERS.Products.indexOf('slug') + 1;
  var row = findRow(SHEETS.products, slugCol, d.slug);
  if (isNew && row !== -1) return { ok: false, error: 'A product with that slug already exists' };
  if (!isNew && row === -1) return { ok: false, error: 'Product not found' };

  var sh = sheet(SHEETS.products);
  var values = HEADERS.Products.map(function (h) {
    return d[h] !== undefined ? d[h] : '';
  });
  if (isNew) sh.appendRow(values);
  else sh.getRange(row, 1, 1, HEADERS.Products.length).setValues([values]);
  return { ok: true };
}

function deleteProduct(slug) {
  var row = findRow(SHEETS.products, HEADERS.Products.indexOf('slug') + 1, slug);
  if (row === -1) return { ok: false, error: 'Product not found' };
  sheet(SHEETS.products).deleteRow(row);
  return { ok: true };
}

function saveCoupon(d) {
  var row = findRow(SHEETS.coupons, 1, d.code);
  var vals = [String(d.code).toUpperCase(), d.type, Number(d.value) || 0,
              Number(d.minOrder) || 0, Number(d.active) ? 1 : 0];
  var sh = sheet(SHEETS.coupons);
  if (row === -1) sh.appendRow(vals);
  else sh.getRange(row, 1, 1, 5).setValues([vals]);
  return { ok: true };
}

function deleteCoupon(code) {
  var row = findRow(SHEETS.coupons, 1, code);
  if (row === -1) return { ok: false, error: 'Coupon not found' };
  sheet(SHEETS.coupons).deleteRow(row);
  return { ok: true };
}

function updateSettings(d) {
  var sh = sheet(SHEETS.settings);
  Object.keys(d).forEach(function (k) {
    if (k === 'key') return;
    var row = findRow(SHEETS.settings, 1, k);
    if (row === -1) sh.appendRow([k, d[k]]);
    else sh.getRange(row, 2).setValue(d[k]);
  });
  return { ok: true };
}

/* ==========================================================
   IMAGE UPLOAD
   ----------------------------------------------------------
   The admin panel sends a compressed image as base64. This
   commits it into your GitHub repo and returns a public URL,
   WITHOUT the browser ever seeing a credential — the token is
   read from Script Properties, which live inside your own
   Google account and are never sent to the client.

   Script Properties:
     GH_TOKEN     fine-grained PAT, Contents: Read & Write,
                  scoped to the one repo (see SETUP.md)
     GH_REPO      "your-username/your-repo"
     GH_BRANCH    default "main"
     GH_IMAGE_DIR default "assets/img/products"
     GH_IMAGE_URL "raw" (default, shows instantly)
                  | "relative" (fastest once Pages rebuilds)
                  | "jsdelivr" (CDN, public repos only)

   Without GH_TOKEN + GH_REPO, uploads are refused with a clear
   message rather than saved somewhere that renders broken.
   ========================================================== */

function ghConfig() {
  var p = PropertiesService.getScriptProperties();
  return {
    token: p.getProperty('GH_TOKEN'),
    repo: p.getProperty('GH_REPO'),
    branch: p.getProperty('GH_BRANCH') || 'main',
    dir: (p.getProperty('GH_IMAGE_DIR') || 'assets/img/products').replace(/^\/|\/$/g, ''),
    urlMode: p.getProperty('GH_IMAGE_URL') || 'raw'
  };
}

function ghReady() {
  var g = ghConfig();
  return !!(g.token && g.repo);
}

function storageStatus() {
  var g = ghConfig();
  var url = '';
  try { url = ss().getUrl(); } catch (e) {}
  return {
    ok: true,
    backend: ghReady() ? 'github' : 'none',
    repo: g.repo || '',
    branch: g.branch,
    dir: g.dir,
    urlMode: g.urlMode,
    sheetUrl: url
  };
}

function safeFileName(name) {
  var dot = String(name).lastIndexOf('.');
  var base = dot > 0 ? String(name).slice(0, dot) : String(name);
  var ext = dot > 0 ? String(name).slice(dot + 1).toLowerCase() : 'webp';
  if (['webp', 'jpg', 'jpeg', 'png', 'gif', 'avif'].indexOf(ext) === -1) ext = 'webp';
  base = base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  if (!base) base = 'product';
  return base + '.' + ext;
}

function uploadImage(d) {
  if (!d || !d.base64) return { ok: false, error: 'No image data received' };
  if (!ghReady()) {
    return {
      ok: false,
      needsSetup: true,
      error:
        'Image uploads need GitHub. Add GH_TOKEN and GH_REPO in Apps Script ▸ ' +
        'Project Settings ▸ Script Properties, then try again. ' +
        'See "Product image uploads" in SETUP.md.'
    };
  }
  var name = safeFileName(d.filename || 'product.webp');
  return uploadToGitHub(name, d.base64, ghConfig());
}

/* ---------- A. GitHub ---------- */
function uploadToGitHub(name, base64, g) {
  var path = g.dir + '/' + name;
  var api = 'https://api.github.com/repos/' + g.repo + '/contents/' +
            path.split('/').map(encodeURIComponent).join('/');
  var headers = {
    Authorization: 'Bearer ' + g.token,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  // If the file already exists we must send its blob sha to overwrite it.
  var sha = null;
  var probe = UrlFetchApp.fetch(api + '?ref=' + encodeURIComponent(g.branch), {
    headers: headers, muteHttpExceptions: true
  });
  if (probe.getResponseCode() === 200) {
    try { sha = JSON.parse(probe.getContentText()).sha; } catch (e) {}
  }

  var body = {
    message: (sha ? 'Update' : 'Add') + ' product image: ' + name,
    content: base64,
    branch: g.branch
  };
  if (sha) body.sha = sha;

  var res = UrlFetchApp.fetch(api, {
    method: 'put',
    contentType: 'application/json',
    headers: headers,
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  });

  var code = res.getResponseCode();
  if (code !== 200 && code !== 201) {
    var msg = 'GitHub upload failed (' + code + ')';
    try { msg += ': ' + JSON.parse(res.getContentText()).message; } catch (e) {}
    if (code === 401 || code === 403) msg += ' — check GH_TOKEN and its repository permissions.';
    if (code === 404) msg += ' — check GH_REPO and GH_BRANCH, and that the token can see this repo.';
    return { ok: false, error: msg };
  }

  var raw = 'https://raw.githubusercontent.com/' + g.repo + '/' + g.branch + '/' + path;
  var cdn = 'https://cdn.jsdelivr.net/gh/' + g.repo + '@' + g.branch + '/' + path;
  var url = g.urlMode === 'raw' ? raw : (g.urlMode === 'jsdelivr' ? cdn : path);

  return {
    ok: true, backend: 'github', url: url, path: path,
    rawUrl: raw, cdnUrl: cdn, committed: true,
    note: g.urlMode === 'relative'
      ? 'Committed to ' + g.repo + '. GitHub Pages usually publishes it within a minute.'
      : 'Committed to ' + g.repo + ' and served immediately.'
  };
}

/*  Why there is no Google Drive fallback
    -------------------------------------
    An earlier version saved uploads to a public Drive folder. Those files
    fetch fine with curl but Google blocks them when a browser requests them
    from another site, so every product image rendered as a broken image.
    A silent half-failure is worse than a clear refusal, so uploads now
    require GitHub and say so plainly when it isn't configured.            */

/* ==========================================================
   SEED CATALOGUE — mirrors assets/js/data.js
   sku, slug, name, category, price, mrp, stock, sizes, colors,
   badge, featured, active, image, desc
   ========================================================== */
var K = '22|24|26|28|30|32';
var M = 'S|M|L|XL|2XL|3XL';
var W = 'S|M|L|XL|2XL';
var I = '0-6M|6-12M|12-18M|18-24M';
var KD = "Playful Marathi slogans on premium combed cotton that kids love and parents trust. Pre-shrunk, colour-locked and built to survive endless play and washing.";
var MD = "A witty Marathi line on heavyweight bio-washed cotton. Relaxed drop-shoulder fit, ribbed collar and a print that holds its colour wash after wash.";
var WD = "Empowering Marathi typography on soft, breathable cotton with a flattering modern cut. Made to move from morning chai to late-evening plans.";
var TD = "Heavy 12oz canvas tote with reinforced handles and a roomy main compartment. Eco-friendly, reusable and printed with an original Marathi motif.";

var SEED = [
['PV-KID-DHP','dhampuklya','Dhampuklya','kids',399,0,24,K,'Mustard','Bestseller',1,1,'assets/img/products/dhampuklya.webp',KD],
['PV-KID-LDB','ladubai','Ladubai','kids',399,0,18,K,'Pink','',1,1,'assets/img/products/ladubai.webp',KD],
['PV-KID-WOB','wheels-on-the-bus','Wheels On The Bus','kids',399,0,20,K,'Navy Blue','',0,1,'assets/img/products/wheels-on-the-bus.webp',KD],
['PV-KID-MBT','mazi-bat-mazi-batting','Mazi Bat Mazi Batting','kids',399,0,16,K,'Red','',1,1,'assets/img/products/mazi-bat-mazi-batting.webp',KD],
['PV-KID-BLP','babachi-ladki','Babachi Ladki','kids',399,0,22,K,'Pink','',0,1,'assets/img/products/babachi-ladki.webp',KD],
['PV-KID-BLR','babanchi-ladki','Babanchi Ladki','kids',399,0,14,K,'Red','',0,1,'assets/img/products/babanchi-ladki.webp',KD],
['PV-KID-GGL','i-dont-need-google',"I Don't Need Google",'kids',399,0,12,K,'Yellow','Trending',1,1,'assets/img/products/i-dont-need-google.webp',KD],
['PV-KID-TWB','twinning-with-brother','Twinning With Brother','kids',399,0,10,K,'White','',0,1,'assets/img/products/twinning-with-brother.webp',KD],
['PV-KID-PKP','pasara-karnyat-patait','Pasara Karnyat Patait','kids',399,0,15,K,'Sky Blue','',0,1,'assets/img/products/pasara-karnyat-patait.webp',KD],
['PV-KID-GDA','gondas-aagau','Gondas Aagau','kids',399,0,19,K,'Navy Blue','',0,1,'assets/img/products/gondas-aagau.webp',KD],
['PV-KID-AAL','aaicha-ladoba','Aaicha Ladoba','kids',399,0,26,K,'Red','Bestseller',1,1,'assets/img/products/aaicha-ladoba.webp',KD],
['PV-KID-BCC','babachi-carbon-copy','Babachi Carbon Copy','kids',399,0,17,K,'Red','',0,1,'assets/img/products/babachi-carbon-copy.webp',KD],
['PV-KID-SKP','sakharech-pote','Sakharech Pote','kids',350,0,21,K,'Black','',0,1,'assets/img/products/sakharech-pote.webp',KD],
['PV-KID-HNM','hanumaan','Hanumaan','kids',370,0,13,K,'Orange','',1,1,'assets/img/products/hanumaan.webp',KD],
['PV-KID-ACC','aaichi-carbon-copy','Aaichi Carbon Copy','kids',399,0,20,K,'Yellow','New',1,1,'assets/img/products/aaichi-carbon-copy.webp',KD],
['PV-MEN-EKS','ekante-sukhmasyatam','Ekante Sukhmasyatam','men',450,0,14,M,'Black','',1,1,'assets/img/products/ekante-sukhmasyatam.webp',MD],
['PV-MEN-FTP','fukat-te-poshtik','Fukat Te Poshtik','men',450,0,16,M,'White','Trending',1,1,'assets/img/products/fukat-te-poshtik.webp',MD],
['PV-MEN-DPA','daughter-and-papa','Daughter and PAPA','men',450,0,12,M,'Navy Blue','Bestseller',1,1,'assets/img/products/daughter-and-papa.webp',MD],
['PV-WMN-AMK','allergic-to-morning','Allergic To Morning','women',450,0,15,W,'Kiwi Green','',1,1,'assets/img/products/allergic-to-morning.webp',WD],
['PV-WMN-CKR','chakra','Chakra','women',450,0,11,W,'Violet','New',1,1,'assets/img/products/chakra.webp',WD],
['PV-WMN-AML','allergic-to-morning-lavender','Allergic To Morning Lavender','women',450,0,18,W,'Lavender','Bestseller',1,1,'assets/img/products/allergic-to-morning-lavender.webp',WD],
['PV-TOT-CHF','chafa','Chafa','tote',350,0,30,'One Size','Black','',1,1,'assets/img/products/chafa.webp',TD],
['PV-TOT-JSW','jastwand','Jastwand','tote',350,0,28,'One Size','Black','',0,1,'assets/img/products/jastwand.webp',TD],
['PV-TOT-NGD','nishigandh','Nishigandh','tote',350,0,25,'One Size','Black','',0,1,'assets/img/products/nishigandh.webp',TD],
['PV-TOT-BRN','bharatnatyam','Bharatnatyam','tote',350,0,22,'One Size','Black','Trending',1,1,'assets/img/products/bharatnatyam.webp',TD],
['PV-TOT-KTH','kathak','Kathak','tote',350,0,24,'One Size','Black','',1,1,'assets/img/products/kathak.webp',TD],
['PV-TOT-PRJ','prajakta','Prajakta','tote',350,0,26,'One Size','Black','',0,1,'assets/img/products/prajakta.webp',TD],
['PV-TOT-TLP','tulips','Tulips','tote',330,0,27,'One Size','Off White','Bestseller',1,1,'assets/img/products/tulips.webp',TD],
['PV-YOG-KPC','keep-calm','Keep Calm','yoga',450,0,14,W,'White','New',1,1,'assets/img/products/keep-calm.webp',
  'Breathable, easy-moving cotton with a calm, minimal print. Made for the mat and everything after it.'],
['PV-INF-CRW','cute-romper','Cute Romper','infant',250,0,20,I,'White','',1,1,'assets/img/products/cute-romper.webp',
  'Ultra-soft skin-friendly cotton romper with easy press-button closure — gentle on newborn skin, easy on parents.'],
['PV-INF-CRP','cute-romper-pink','Cute Romper Pink','infant',300,0,18,I,'Pink','',1,1,'assets/img/products/cute-romper-pink.webp',
  'Ultra-soft skin-friendly cotton romper with easy press-button closure — gentle on newborn skin, easy on parents.']
];
