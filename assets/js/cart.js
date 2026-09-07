/* ============ PIRANHA VIBES — Full bag page ============ */
(async function () {
  const { $, esc, money, Store, Cart, bySlug, cardHTML, ICON, toast, totals, observe } =
    window.PV;

  await Store.ready;
  window.PV.mountChrome("");
  Cart.sync();

  let coupon = sessionStorage.getItem("pv_coupon") || "";

  function render() {
    const root = $("#cartRoot");
    if (!Cart.items.length) {
      root.innerHTML = `<div class="empty" style="padding:80px 20px">${ICON.bag}
        <h2 class="d3" style="margin-bottom:8px">Your bag is empty</h2>
        <p class="muted" style="margin-bottom:22px">Let's find something you'll love wearing.</p>
        <a class="btn" href="shop.html">Shop the collection</a></div>`;
      $("#suggestSec").style.display = "";
      $("#suggest").innerHTML = Store.products
        .filter((p) => p.active && p.featured && p.stock > 0)
        .slice(0, 4)
        .map(cardHTML)
        .join("");
      observe();
      return;
    }

    const t = totals(coupon, "");
    root.innerHTML = `
<div class="co-grid">
  <div>
    <div class="card" style="padding:0 clamp(16px,2.4vw,26px)">
      ${Cart.items
        .map((i) => {
          const p = bySlug(i.slug);
          const cap = p && p.stock > 0 && p.stock <= 5;
          return `
      <div class="ci" style="grid-template-columns:96px 1fr auto">
        <a href="product.html?p=${i.slug}"><img src="${i.image}" alt="${esc(
            i.name
          )}" style="width:96px;height:112px" onerror="this.src='assets/img/brand/hero-main.webp'"></a>
        <div>
          <a href="product.html?p=${i.slug}" class="nm" style="font-size:1.02rem">${esc(i.name)}</a>
          <div class="vr">${[i.size, i.color].filter(Boolean).join(" · ") || "—"}</div>
          <div class="vr" style="font-family:var(--mono);font-size:.72rem">${esc(i.sku || "")}</div>
          ${cap ? `<div class="pc-stock">Only ${p.stock} left</div>` : ""}
          <span class="ci-rm" data-rm="${i.key}">Remove</span>
        </div>
        <div style="text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:12px;justify-content:center">
          <div class="pr" style="font-size:1.05rem">${money(i.price * i.qty)}</div>
          <div class="qty">
            <button data-dec="${i.key}" aria-label="Decrease">−</button>
            <span>${i.qty}</span>
            <button data-inc="${i.key}" aria-label="Increase">+</button>
          </div>
        </div>
      </div>`;
        })
        .join("")}
    </div>
    <div style="display:flex;justify-content:space-between;gap:14px;margin-top:18px;flex-wrap:wrap">
      <a class="link-u" href="shop.html">← Continue shopping</a>
      <button class="link-u" id="clearCart" style="color:var(--tx-3)">Clear bag</button>
    </div>
  </div>

  <aside class="co-side">
    <div class="card">
      <h3 class="d3" style="font-size:1.25rem;margin-bottom:18px">Order summary</h3>

      <div class="field" style="margin-bottom:8px">
        <label for="couponInp">Discount code</label>
        <div style="display:flex;gap:8px">
          <input id="couponInp" placeholder="Enter code" value="${esc(coupon)}" style="text-transform:uppercase">
          <button class="btn btn-sm" id="couponBtn" style="flex-shrink:0">Apply</button>
        </div>
        <p class="tiny" id="couponMsg" style="margin-top:7px"></p>
      </div>

      <div style="border-top:1px solid var(--line);margin:16px 0 6px"></div>
      <div class="sum-row"><span>Subtotal</span><span>${money(t.sub)}</span></div>
      ${
        t.discount
          ? `<div class="sum-row" style="color:var(--green)"><span>Discount (${esc(
              coupon.toUpperCase()
            )})</span><span>− ${money(t.discount)}</span></div>`
          : ""
      }
      <div class="sum-row"><span>Delivery Fee</span><span>${money(t.baseShip)}</span></div>
      <div class="sum-row" style="color:var(--green);font-weight:600"><span>Online Delivery Discount</span><span>− ${money(t.shipDiscount)}</span></div>
      ${t.tax ? `<div class="sum-row"><span>Tax</span><span>${money(t.tax)}</span></div>` : ""}
      <div class="sum-row total" style="margin-top:6px;padding-top:10px;border-top:1px dashed var(--line)"><span>Total (Online)</span><span>${money(t.total)}</span></div>
      <p class="tiny muted" style="margin:8px 0 0">⚡ Free Delivery applies when paying online with UPI. COD delivery is ${money(t.baseShip)}.</p>

      <a class="btn btn-red btn-block btn-lg" href="checkout.html" style="margin-top:16px">Proceed to checkout</a>
      <div class="trust-row" style="margin-top:16px">
        <div>${ICON.truck}48h dispatch</div>
        <div>${ICON.refresh}7-day returns</div>
        <div>${ICON.shield}COD available</div>
      </div>
    </div>
  </aside>
</div>`;

    $("#clearCart").onclick = () => {
      if (confirm("Remove all items from your bag?")) {
        Cart.clear();
        toast("Bag cleared");
      }
    };
    $("#couponBtn").onclick = () => {
      const v = $("#couponInp").value.trim().toUpperCase();
      const c = window.PV.findCoupon(v);
      const msg = $("#couponMsg");
      if (!v) {
        coupon = "";
        sessionStorage.removeItem("pv_coupon");
        return render();
      }
      if (!c) {
        msg.style.color = "var(--red)";
        msg.textContent = "That code isn't valid.";
        return;
      }
      if (Cart.subtotal() < Number(c.minOrder || 0)) {
        msg.style.color = "var(--red)";
        msg.textContent = `Spend ${money(c.minOrder)} or more to use this code.`;
        return;
      }
      coupon = v;
      sessionStorage.setItem("pv_coupon", v);
      toast("Discount applied");
      render();
    };

    const suggest = Store.products
      .filter(
        (p) =>
          p.active && p.stock > 0 && !Cart.items.some((i) => i.slug === p.slug)
      )
      .sort((a, b) => b.featured - a.featured)
      .slice(0, 4);
    if (suggest.length) {
      $("#suggestSec").style.display = "";
      $("#suggest").innerHTML = suggest.map(cardHTML).join("");
    }
    observe();
  }

  render();
  document.addEventListener("pv:cart", render);
})();
