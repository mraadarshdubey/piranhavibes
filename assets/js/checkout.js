/* ============ PIRANHA VIBES — Checkout ============ */
(async function () {
  const { $, $$, esc, money, Store, Cart, ICON, toast, totals, placeOrder, CFG, write, read } =
    window.PV;

  await Store.ready;
  window.PV.mountChrome("");
  Cart.sync();

  const root = $("#coRoot");
  if (!Cart.items.length) {
    root.innerHTML = `<div class="empty" style="padding:70px 20px">${ICON.bag}
      <h2 class="d3" style="margin-bottom:8px">Your bag is empty</h2>
      <p class="muted" style="margin-bottom:22px">Add something you love before checking out.</p>
      <a class="btn" href="shop.html">Shop the collection</a></div>`;
    return;
  }

  const coupon = sessionStorage.getItem("pv_coupon") || "";
  const saved = read("pv_addr_v1", {});
  let method = Store.settings.codEnabled ? "COD" : "UPI";

  function summary(t) {
    return `
<div class="card">
  <h3 class="d3" style="font-size:1.2rem;margin-bottom:16px">Order summary</h3>
  ${Cart.items
    .map(
      (i) => `<div class="mini-item">
      <img src="${i.image}" alt="${esc(i.name)}" onerror="this.src='assets/img/brand/hero-main.webp'">
      <div style="flex:1">
        <b>${esc(i.name)}</b>
        <div class="tiny muted">${[i.size, i.color].filter(Boolean).join(" · ")} · Qty ${i.qty}</div>
      </div>
      <div style="font-weight:600">${money(i.price * i.qty)}</div>
    </div>`
    )
    .join("")}
  <div class="sum-row" style="margin-top:14px"><span>Subtotal</span><span>${money(t.sub)}</span></div>
  ${
    t.discount
      ? `<div class="sum-row" style="color:var(--green)"><span>Discount (${esc(
          coupon.toUpperCase()
        )})</span><span>− ${money(t.discount)}</span></div>`
      : ""
  }
  <div class="sum-row"><span>Delivery Fee</span><span>${money(t.baseShip)}</span></div>
  ${
    t.shipDiscount > 0
      ? `<div class="sum-row" style="color:var(--green);font-weight:600"><span>Online Payment Discount</span><span>− ${money(
          t.shipDiscount
        )}</span></div>`
      : ""
  }
  ${t.codFee ? `<div class="sum-row"><span>COD handling</span><span>${money(t.codFee)}</span></div>` : ""}
  ${t.tax ? `<div class="sum-row"><span>Tax</span><span>${money(t.tax)}</span></div>` : ""}
  <div class="sum-row total" style="margin-top:6px;padding-top:10px;border-top:1px dashed var(--line)"><span>To pay</span><span id="grandTotal">${money(t.total)}</span></div>
  <div class="trust-row" style="margin-top:16px">
    <div>${ICON.truck}48h dispatch</div>
    <div>${ICON.refresh}7-day returns</div>
    <div>${ICON.shield}Verified seller</div>
  </div>
</div>`;
  }

  function paint() {
    const t = totals(coupon, method);
    root.innerHTML = `
<div class="co-grid">
  <div>
    <form id="coForm" novalidate>
      <div class="card" style="margin-bottom:18px">
        <h3 class="d3" style="font-size:1.2rem;margin-bottom:18px">Contact</h3>
        <div class="grid2">
          <div class="field"><label for="name">Full name *</label><input id="name" name="name" autocomplete="name" value="${esc(saved.name || "")}"><span class="msg">Please enter your full name</span></div>
          <div class="field"><label for="phone">Mobile number *</label><input id="phone" name="phone" inputmode="numeric" maxlength="10" autocomplete="tel" value="${esc(saved.phone || "")}"><span class="msg">Enter a valid 10-digit Indian mobile number</span></div>
        </div>
        <div class="field"><label for="email">Email *</label><input id="email" name="email" type="email" autocomplete="email" value="${esc(saved.email || "")}"><span class="msg">Enter a valid email — we send your order confirmation here</span></div>
      </div>

      <div class="card" style="margin-bottom:18px">
        <h3 class="d3" style="font-size:1.2rem;margin-bottom:18px">Delivery address</h3>
        <div class="field"><label for="addr1">Address line 1 *</label><input id="addr1" name="addr1" autocomplete="address-line1" placeholder="Flat / house no., building, street" value="${esc(saved.addr1 || "")}"><span class="msg">Please enter your address</span></div>
        <div class="field"><label for="addr2">Address line 2</label><input id="addr2" name="addr2" autocomplete="address-line2" placeholder="Area, landmark (optional)" value="${esc(saved.addr2 || "")}"></div>
        <div class="grid2">
          <div class="field"><label for="city">City *</label><input id="city" name="city" autocomplete="address-level2" value="${esc(saved.city || "")}"><span class="msg">Enter your city</span></div>
          <div class="field"><label for="pincode">PIN code *</label><input id="pincode" name="pincode" inputmode="numeric" maxlength="6" autocomplete="postal-code" value="${esc(saved.pincode || "")}"><span class="msg">Enter a valid 6-digit PIN code</span></div>
        </div>
        <div class="grid2">
          <div class="field"><label for="state">State *</label>
            <select id="state" name="state">
              <option value="">Select state</option>
              ${[
                "Maharashtra","Andhra Pradesh","Assam","Bihar","Chhattisgarh","Delhi","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Manipur","Meghalaya","Odisha","Punjab","Rajasthan","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Jammu & Kashmir","Chandigarh","Puducherry"
              ]
                .map(
                  (s) =>
                    `<option${saved.state === s ? " selected" : ""}>${s}</option>`
                )
                .join("")}
            </select><span class="msg">Select your state</span></div>
          <div class="field"><label for="landmark">Landmark</label><input id="landmark" name="landmark" placeholder="Optional" value="${esc(saved.landmark || "")}"></div>
        </div>
        <label class="fopt" style="margin-top:6px"><input type="checkbox" id="saveAddr" checked> Save these details for next time</label>
      </div>

      <div class="card" style="margin-bottom:18px">
        <h3 class="d3" style="font-size:1.2rem;margin-bottom:18px">Payment method</h3>
        ${
          Store.settings.codEnabled
            ? `<label class="radio-card${method === "COD" ? " on" : ""}" data-m="COD">
                <input type="radio" name="pay" value="COD" ${method === "COD" ? "checked" : ""}>
                <span><b>Cash on Delivery</b><small>Pay courier in cash on delivery. Standard ${money(
                  Store.settings.shippingFee || 60
                )} delivery fee applies.${
                  Number(Store.settings.codFee) ? ` Plus ${money(Store.settings.codFee)} COD handling fee.` : ""
                }</small></span>
              </label>`
            : ""
        }
        <label class="radio-card${method === "UPI" ? " on" : ""}" data-m="UPI">
          <input type="radio" name="pay" value="UPI" ${method === "UPI" ? "checked" : ""}>
          <span><b>Pay Online (Razorpay — UPI, Cards, NetBanking)</b> <span class="badge" style="background:#e6f4ea;color:#137333;font-weight:700;font-size:0.75rem;padding:2px 8px;border-radius:4px;margin-left:6px">FREE Delivery (Save ₹60)</span><small style="display:block;margin-top:2px">Instant &amp; secure checkout via UPI (GPay, PhonePe, Paytm, CRED), Cards &amp; NetBanking. Free delivery discount applied!</small></span>
        </label>
        <div id="upiBox" class="${method === "UPI" ? "" : "hidden"}" style="margin-top:12px">
          <div class="upi-pay-card" style="background:var(--paper-2);border:1px solid var(--line);border-radius:12px;padding:16px">
            <div class="upi-badge-row" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:10px">
              <span class="upi-pill" style="font-weight:700;font-size:0.76rem;letter-spacing:0.04em;color:var(--ink)">🔒 SECURE RAZORPAY PAYMENT</span>
              <div class="upi-apps-icons" style="display:flex;gap:6px;flex-wrap:wrap">
                <span class="app-tag">UPI</span>
                <span class="app-tag">GPay</span>
                <span class="app-tag">PhonePe</span>
                <span class="app-tag">Paytm</span>
                <span class="app-tag">Cards</span>
                <span class="app-tag">NetBanking</span>
              </div>
            </div>
            <p style="font-size:0.86rem;line-height:1.55;color:var(--tx-2);margin:0">
              When you click <b>Place order &amp; Pay</b> below, your order will be safely registered in our database and you will proceed to the official Razorpay gateway to complete your payment.
            </p>
          </div>
        </div>
      </div>

      <div class="card" style="margin-bottom:18px">
        <div class="field" style="margin:0"><label for="notes">Order notes</label>
          <textarea id="notes" name="notes" rows="3" placeholder="Delivery instructions, gift message, size preferences…"></textarea></div>
      </div>

      <label class="fopt" style="margin-bottom:16px"><input type="checkbox" id="agree"> I agree to the shipping &amp; 7-day return policy *</label>
      <p class="tiny" id="agreeErr" style="color:var(--red);display:none;margin:-10px 0 14px">Please accept the policy to continue</p>

      <button class="btn btn-red btn-lg btn-block" type="submit" id="placeBtn">${method === "UPI" ? "Place order & Pay · " : "Place order · "}<span id="btnTotal">${money(
        t.total
      )}</span></button>
      <p class="tiny muted" style="text-align:center;margin-top:12px">You'll receive an order ID immediately. No account needed.</p>
    </form>
  </div>

  <aside class="co-side">${summary(t)}</aside>
</div>`;

    /* payment switching */
    $$(".radio-card").forEach((rc) => {
      rc.onclick = () => {
        method = rc.dataset.m;
        $$(".radio-card").forEach((x) => x.classList.toggle("on", x === rc));
        rc.querySelector("input").checked = true;
        $("#upiBox").classList.toggle("hidden", method !== "UPI");
        const nt = totals(coupon, method);
        const side = $(".co-side");
        if (side) side.innerHTML = summary(nt);
        const placeBtn = $("#placeBtn");
        if (placeBtn) {
          placeBtn.innerHTML = (method === "UPI" ? "Place order & Pay · " : "Place order · ") + `<span id="btnTotal">${money(nt.total)}</span>`;
        }
      };
    });

    /* numeric guards */
    ["phone", "pincode"].forEach((id) => {
      $("#" + id).addEventListener("input", (e) => {
        e.target.value = e.target.value.replace(/\D/g, "");
      });
    });

    $("#coForm").addEventListener("submit", onSubmit);
  }

  function validate(f) {
    let ok = true;
    const set = (id, bad) => {
      const w = $("#" + id).closest(".field");
      w.classList.toggle("err", bad);
      if (bad) ok = false;
    };
    set("name", f.name.value.trim().length < 2);
    set("phone", !/^[6-9]\d{9}$/.test(f.phone.value.trim()));
    set("email", !/^\S+@\S+\.\S+$/.test(f.email.value.trim()));
    set("addr1", f.addr1.value.trim().length < 5);
    set("city", f.city.value.trim().length < 2);
    set("pincode", !/^\d{6}$/.test(f.pincode.value.trim()));
    set("state", !f.state.value);
    const agreed = $("#agree").checked;
    $("#agreeErr").style.display = agreed ? "none" : "block";
    if (!agreed) ok = false;
    if (!ok) {
      const first = $(".field.err");
      if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return ok;
  }

  async function onSubmit(e) {
    e.preventDefault();
    const f = e.target;
    if (!validate(f)) return;

    const btn = $("#placeBtn");
    btn.classList.add("btn-loading");
    btn.disabled = true;

    const t = totals(coupon, method);
    const order = {
      name: f.name.value.trim(),
      phone: f.phone.value.trim(),
      email: f.email.value.trim(),
      addr1: f.addr1.value.trim(),
      addr2: f.addr2.value.trim(),
      city: f.city.value.trim(),
      state: f.state.value,
      pincode: f.pincode.value.trim(),
      landmark: f.landmark.value.trim(),
      notes: f.notes.value.trim(),
      paymentMethod: method === "UPI" ? "Online (Razorpay)" : "COD",
      txnRef: "Razorpay Checkout",
      coupon: t.discount ? coupon.toUpperCase() : "",
      subtotal: t.sub,
      discount: t.discount,
      shipping: t.ship,
      codFee: t.codFee,
      tax: t.tax,
      total: t.total,
      itemCount: Cart.count(),
      items: Cart.items.map((i) => ({
        sku: i.sku,
        slug: i.slug,
        name: i.name,
        size: i.size,
        color: i.color,
        qty: i.qty,
        price: i.price,
        lineTotal: i.price * i.qty,
      })),
      source: location.hostname || "local",
    };

    if ($("#saveAddr").checked) {
      write("pv_addr_v1", {
        name: order.name, phone: order.phone, email: order.email,
        addr1: order.addr1, addr2: order.addr2, city: order.city,
        state: order.state, pincode: order.pincode, landmark: order.landmark,
      });
    }

    let res;
    try {
      res = await placeOrder(order);
    } catch (err) {
      btn.classList.remove("btn-loading");
      btn.disabled = false;
      toast("Could not place the order. Please try again.", "err");
      return;
    }

    sessionStorage.setItem(
      "pv_last_order",
      JSON.stringify({ ...order, id: res.orderId, offline: !!res.offline })
    );
    sessionStorage.removeItem("pv_coupon");
    Cart.clear();

    const rzpUrl = Store.settings.razorpayLink || CFG.RAZORPAY_LINK;
    if (method === "UPI" && rzpUrl) {
      location.href = rzpUrl;
    } else {
      location.href = "order-success.html?id=" + encodeURIComponent(res.orderId);
    }
  }

  paint();
})();
