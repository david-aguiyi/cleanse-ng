/*
 * Cleanse.ng — Paystack booking override.
 * Keeps the existing static booking modal (index.js) fully intact, but replaces
 * the final "book" action: instead of opening WhatsApp, it creates a
 * server-priced booking and sends the customer to Paystack checkout.
 * One-time Regular Cleaning, priced by bedroom.
 */
(function () {
  "use strict";

  var ZONE_LABELS = {
    BODIJA: "Bodija", AKOBO: "Akobo", JERICHO: "Jericho",
    OLUYOLE: "Oluyole", IYAGANKU: "Iyaganku"
  };

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    // All plans are bookable: per-visit, weekly (4 visits/mo) and monthly
    // (8 visits/mo). The frequency cards are built by index.js from the
    // canonical price matrix; we simply read the selected frequency at submit
    // time and send it so Paystack charges exactly what the summary shows.
    var form = document.getElementById("booking-plan-form");
    if (form) form.addEventListener("submit", onSubmit, true); // capture: runs before index.js

    // Repoint "Book" nav/hero CTAs (which index.js wires to WhatsApp) to open the
    // booking modal instead, so every "Book" entry point uses the new flow.
    Array.prototype.slice.call(document.querySelectorAll("[data-wa-link]")).forEach(function (a) {
      if (/\bbook\b/i.test(a.textContent || "")) {
        a.addEventListener("click", function (ev) {
          ev.preventDefault();
          ev.stopImmediatePropagation();
          if (typeof window.openBookingModal === "function") window.openBookingModal();
        }, true);
      }
    });
  });

  function setMsg(text, isError) {
    var el = document.getElementById("step4-validation-msg") ||
      document.getElementById("step3-validation-msg");
    if (el) { el.textContent = text || ""; el.style.color = isError ? "#b3261e" : ""; }
  }

  function val(id) { var el = document.getElementById(id); return el ? String(el.value || "").trim() : ""; }

  function bedroomsFrom(v) { var m = (v || "").match(/(\d+)/); return m ? parseInt(m[1], 10) : null; }

  // Map the selected frequency (a canonical code, or any legacy label) to the
  // server frequency_code. Defaults to ONE_TIME.
  function frequencyCode() {
    var raw = val("booking-visits");
    if (raw === "ONE_TIME" || raw === "WEEKLY" || raw === "MONTHLY") return raw;
    var t = raw.toLowerCase();
    if (t.indexOf("twice a week") > -1 || t.indexOf("8 visit") > -1 ||
        t.indexOf("monthly subscription") > -1) return "MONTHLY";
    if (t.indexOf("weekly") > -1 || t.indexOf("4 visit") > -1) return "WEEKLY";
    return "ONE_TIME";
  }

  function normPhone(raw) {
    var d = (raw || "").replace(/[^\d+]/g, "");
    if (d.charAt(0) === "+") return d;
    if (/^234\d{7,}$/.test(d)) return "+" + d;
    if (/^0\d{10}$/.test(d)) return "+234" + d.slice(1);
    if (/^[789]\d{9}$/.test(d)) return "+234" + d;
    return d ? "+" + d : "";
  }

  function slotToHour(slot) {
    var m = (slot || "").match(/(\d{1,2})\s*(am|pm)/i);
    if (!m) return "10";
    var h = parseInt(m[1], 10), ap = m[2].toLowerCase();
    if (ap === "pm" && h < 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
    return (h < 10 ? "0" : "") + h;
  }

  function submitBtn() {
    var form = document.getElementById("booking-plan-form");
    return form ? form.querySelector('button[type="submit"]') : null;
  }

  // Inject a tiny button spinner once, so the confirm button shows an obvious
  // "working" state during the (multi-step) booking + payment round-trips.
  var _spinInjected = false;
  function ensureSpinnerCss() {
    if (_spinInjected) return;
    _spinInjected = true;
    var s = document.createElement("style");
    s.textContent =
      "@keyframes cl-spin{to{transform:rotate(360deg)}}" +
      ".cl-spin{display:inline-block;width:14px;height:14px;margin-right:8px;" +
      "border:2px solid rgba(255,255,255,.45);border-top-color:#fff;border-radius:50%;" +
      "animation:cl-spin .7s linear infinite;vertical-align:-2px}" +
      "button[type=submit].is-loading{opacity:.92;cursor:progress}";
    document.head.appendChild(s);
  }
  function setBtnLoading(btn, text) {
    if (!btn) return;
    ensureSpinnerCss();
    btn.disabled = true;
    btn.classList.add("is-loading");
    btn.innerHTML = '<span class="cl-spin" aria-hidden="true"></span>' + text;
  }

  async function postJSON(url, body) {
    try {
      var res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      return await res.json();
    } catch (_) {
      return { ok: false, error: { message: "Network error. Please check your connection." } };
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    e.stopImmediatePropagation();

    // Honeypot (bot) — silently ignore.
    var hp = document.getElementById("booking-website");
    if (hp && hp.value) return;

    var size = val("booking-apartment-size") || val("booking-selected-plan");
    var bedrooms = bedroomsFrom(size);
    var area = val("booking-area");
    var date = val("booking-date");
    var slot = val("booking-schedule");
    var name = val("booking-name");
    var email = val("booking-email");
    var phone = normPhone(val("booking-phone"));
    var location = val("booking-location");
    var prefs = val("booking-preferences");
    var agree = document.getElementById("booking-agree-policy");

    if (!bedrooms) { setMsg("Please choose your apartment size.", true); return; }
    if (!area) { setMsg("Please select your area.", true); return; }
    if (!date || !slot) { setMsg("Please pick a date and time.", true); return; }
    if (name.length < 2) { setMsg("Please enter your full name.", true); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setMsg("Please enter a valid email.", true); return; }
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) { setMsg("Enter a valid phone, e.g. 08012345678.", true); return; }
    if (location.length < 3) { setMsg("Please enter your home address.", true); return; }
    if (agree && !agree.checked) { setMsg("Please agree to the Customer Policy.", true); return; }

    var startAt = date + "T" + slotToHour(slot) + ":00:00+01:00";
    var btn = submitBtn();
    var original = btn ? btn.innerHTML : "";
    setBtnLoading(btn, "Creating your booking…");
    setMsg("Creating your booking… this takes a few seconds.", false);

    try {
      var q = await postJSON("/api/v1/quotes", {
        service_code: "REGULAR", zone_code: area, property_bedrooms: bedrooms,
        requested_cleaner_count: 1, frequency_code: frequencyCode(), extras: []
      });
      if (!q.ok) throw new Error((q.error && q.error.message) || "Could not price your booking.");

      var b = await postJSON("/api/v1/bookings", {
        quote_id: q.data.quote_id,
        booking_mode: "SCHEDULED",
        scheduled_start_at: startAt,
        customer: { full_name: name, email: email, phone_e164: phone, whatsapp_e164: phone },
        address: { zone_code: area, address_line1: location },
        customer_notes: prefs || undefined,
        terms_accepted: true
      });
      if (!b.ok) throw new Error((b.error && b.error.message) || "Could not create your booking.");

      var ref = b.data.booking_reference;
      setBtnLoading(btn, "Redirecting to payment…");
      setMsg("Booking confirmed — taking you to secure payment…", false);
      var p = await postJSON("/api/v1/bookings/" + encodeURIComponent(ref) + "/payments", {});
      if (!p.ok) throw new Error((p.error && p.error.message) || "Could not start payment.");

      try { sessionStorage.removeItem("cleanse_booking_state"); } catch (_) {}
      window.location.href = p.data.authorization_url;
    } catch (err) {
      setMsg((err && err.message) || "Something went wrong. Please try again.", true);
      if (btn) { btn.disabled = false; btn.classList.remove("is-loading"); btn.innerHTML = original; }
    }
  }
})();
