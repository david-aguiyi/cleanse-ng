"use client";

import { useMemo, useState } from "react";
import { SERVICES, ZONES, BEDROOMS, EXTRAS, WHATSAPP_HELP } from "./catalog";

interface QuoteLineItem {
  code: string;
  description: string;
  line_total_kobo: number;
  item_type: string;
}
interface QuoteData {
  quote_id: string;
  display_total: string;
  total_kobo: number;
  line_items: QuoteLineItem[];
  expires_at: string;
}

const STEPS = ["Service", "Home", "Schedule", "Location", "Contact", "Review"] as const;
const naira = (kobo: number) => `₦${Math.round(kobo / 100).toLocaleString("en-NG")}`;

export default function BookPage() {
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Selections
  const [serviceCode, setServiceCode] = useState("REGULAR");
  const [bedrooms, setBedrooms] = useState<number>(2);
  const [cleaners, setCleaners] = useState(1);
  const [extras, setExtras] = useState<string[]>([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [zone, setZone] = useState("BODIJA");
  const [addr, setAddr] = useState({ address_line1: "", estate: "", landmark: "", directions: "" });
  const [contact, setContact] = useState({
    full_name: "",
    email: "",
    phone_e164: "",
    whatsapp_e164: "",
    marketing_opt_in: false,
  });
  const [terms, setTerms] = useState(false);
  const [quote, setQuote] = useState<QuoteData | null>(null);

  const selectedService = useMemo(
    () => SERVICES.find((s) => s.code === serviceCode)!,
    [serviceCode]
  );

  const toggleExtra = (code: string) =>
    setExtras((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));

  // Build an Africa/Lagos (UTC+1, no DST) ISO timestamp with offset.
  const scheduledIso = useMemo(() => {
    if (!date || !time) return "";
    return `${date}T${time}:00+01:00`;
  }, [date, time]);

  function validateStep(): string | null {
    switch (step) {
      case 0:
        if (!selectedService.bookableOnline) {
          return "This service is quoted manually — tap “Get a manual quote” to reach us on WhatsApp.";
        }
        return null;
      case 2:
        if (!date || !time) return "Choose a date and time.";
        if (new Date(scheduledIso).getTime() <= Date.now()) return "Pick a time in the future.";
        return null;
      case 3:
        if (addr.address_line1.trim().length < 3) return "Enter your street address.";
        return null;
      case 4: {
        const e164 = /^\+[1-9]\d{7,14}$/;
        if (contact.full_name.trim().length < 2) return "Enter your full name.";
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact.email)) return "Enter a valid email.";
        if (!e164.test(contact.phone_e164)) return "Phone must be like +2348012345678.";
        if (!e164.test(contact.whatsapp_e164)) return "WhatsApp must be like +2348012345678.";
        return null;
      }
      default:
        return null;
    }
  }

  async function next() {
    const v = validateStep();
    if (v) {
      setError(v);
      return;
    }
    setError(null);

    // Entering Review: fetch the server-authoritative quote.
    if (step === 4) {
      setLoading(true);
      try {
        const res = await fetch("/api/v1/quotes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            service_code: serviceCode,
            zone_code: zone,
            property_bedrooms: bedrooms,
            requested_cleaner_count: cleaners,
            frequency_code: "ONE_TIME",
            extras,
          }),
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error?.message ?? "Could not calculate price.");
        setQuote(json.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not calculate price.");
        setLoading(false);
        return;
      }
      setLoading(false);
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function payNow() {
    if (!terms) {
      setError("Please accept the service and cancellation terms.");
      return;
    }
    if (!quote) {
      setError("Please recalculate your quote.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const bookingRes = await fetch("/api/v1/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quote_id: quote.quote_id,
          booking_mode: "SCHEDULED",
          scheduled_start_at: scheduledIso,
          customer: contact,
          address: { zone_code: zone, ...addr },
          terms_accepted: true,
        }),
      });
      const bookingJson = await bookingRes.json();
      if (!bookingJson.ok) throw new Error(bookingJson.error?.message ?? "Could not create booking.");
      const ref = bookingJson.data.booking_reference as string;

      const payRes = await fetch(`/api/v1/bookings/${encodeURIComponent(ref)}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const payJson = await payRes.json();
      if (!payJson.ok) throw new Error(payJson.error?.message ?? "Could not start payment.");

      // Hand off to Paystack. Do not re-enable the button — we are navigating away.
      window.location.href = payJson.data.authorization_url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start payment.");
      setLoading(false);
    }
  }

  return (
    <main className="wizard">
      <div className="container">
        <div className="wizard-header">
          <a className="wizard-brand" href="/">
            CLEANSE.NG
          </a>
        </div>

        <div className="steps" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`step-dot ${i === step ? "active" : ""} ${i < step ? "done" : ""}`}
            />
          ))}
        </div>

        <div className="card">
          {error && <div className="notice error">{error}</div>}

          {step === 0 && (
            <section>
              <h2 className="step-title">What do you need cleaned?</h2>
              <p className="step-hint">Choose a service to get started.</p>
              <div className="option-grid">
                {SERVICES.map((s) => (
                  <button
                    key={s.code}
                    type="button"
                    className={`option ${serviceCode === s.code ? "selected" : ""}`}
                    onClick={() => setServiceCode(s.code)}
                  >
                    <span className="opt-name">{s.name}</span>
                    <span className="opt-sub">{s.sub}</span>
                  </button>
                ))}
              </div>
              {!selectedService.bookableOnline && (
                <div className="notice info">
                  {selectedService.name} is priced per home. We&apos;ll give you a tailored quote.{" "}
                  <a href={WHATSAPP_HELP} target="_blank" rel="noreferrer">
                    Get a manual quote →
                  </a>
                </div>
              )}
            </section>
          )}

          {step === 1 && (
            <section>
              <h2 className="step-title">Tell us about your home</h2>
              <p className="step-hint">Pricing is a flat rate by bedroom count.</p>
              <label className="field-label">Bedrooms</label>
              <div className="chip-row">
                {BEDROOMS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    className={`chip ${bedrooms === b ? "selected" : ""}`}
                    onClick={() => setBedrooms(b)}
                  >
                    {b} bedroom{b > 1 ? "s" : ""}
                  </button>
                ))}
              </div>
              <div className="field">
                <label htmlFor="cleaners">Cleaners requested</label>
                <select
                  id="cleaners"
                  value={cleaners}
                  onChange={(e) => setCleaners(Number(e.target.value))}
                >
                  {[1, 2, 3].map((n) => (
                    <option key={n} value={n}>
                      {n} cleaner{n > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <label className="field-label">Add extras (optional)</label>
              <div className="chip-row">
                {EXTRAS.map((x) => (
                  <button
                    key={x.code}
                    type="button"
                    className={`chip ${extras.includes(x.code) ? "selected" : ""}`}
                    onClick={() => toggleExtra(x.code)}
                  >
                    {x.name}
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === 2 && (
            <section>
              <h2 className="step-title">When should we come?</h2>
              <p className="step-hint">Pick a date and a start time.</p>
              <div className="field">
                <label htmlFor="date">Date</label>
                <input
                  id="date"
                  type="date"
                  value={date}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="time">Start time</label>
                <input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </section>
          )}

          {step === 3 && (
            <section>
              <h2 className="step-title">Where are we cleaning?</h2>
              <p className="step-hint">Choose your area, then your address.</p>
              <div className="field">
                <label htmlFor="zone">Area</label>
                <select id="zone" value={zone} onChange={(e) => setZone(e.target.value)}>
                  {ZONES.map((z) => (
                    <option key={z.code} value={z.code}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="line1">Street address</label>
                <input
                  id="line1"
                  value={addr.address_line1}
                  onChange={(e) => setAddr({ ...addr, address_line1: e.target.value })}
                  placeholder="House number and street"
                />
              </div>
              <div className="field">
                <label htmlFor="estate">Estate / compound (optional)</label>
                <input
                  id="estate"
                  value={addr.estate}
                  onChange={(e) => setAddr({ ...addr, estate: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="landmark">Landmark (optional)</label>
                <input
                  id="landmark"
                  value={addr.landmark}
                  onChange={(e) => setAddr({ ...addr, landmark: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="directions">Directions (optional)</label>
                <textarea
                  id="directions"
                  rows={2}
                  value={addr.directions}
                  onChange={(e) => setAddr({ ...addr, directions: e.target.value })}
                />
              </div>
            </section>
          )}

          {step === 4 && (
            <section>
              <h2 className="step-title">How do we reach you?</h2>
              <p className="step-hint">
                We&apos;ll use your WhatsApp number to coordinate your booking.
              </p>
              <div className="field">
                <label htmlFor="name">Full name</label>
                <input
                  id="name"
                  value={contact.full_name}
                  onChange={(e) => setContact({ ...contact, full_name: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={contact.email}
                  onChange={(e) => setContact({ ...contact, email: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="phone">Phone</label>
                <input
                  id="phone"
                  inputMode="tel"
                  placeholder="+2348012345678"
                  value={contact.phone_e164}
                  onChange={(e) => setContact({ ...contact, phone_e164: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="wa">WhatsApp number</label>
                <input
                  id="wa"
                  inputMode="tel"
                  placeholder="+2348012345678"
                  value={contact.whatsapp_e164}
                  onChange={(e) => setContact({ ...contact, whatsapp_e164: e.target.value })}
                />
              </div>
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={contact.marketing_opt_in}
                  onChange={(e) => setContact({ ...contact, marketing_opt_in: e.target.checked })}
                  style={{ width: "auto" }}
                />
                Send me occasional offers and cleaning tips.
              </label>
            </section>
          )}

          {step === 5 && quote && (
            <section>
              <h2 className="step-title">Review your booking</h2>
              <p className="step-hint">Confirm the details below, then pay securely with Paystack.</p>

              <div className="summary-row">
                <span className="label">Service</span>
                <span>{selectedService.name} · {bedrooms}BR</span>
              </div>
              <div className="summary-row">
                <span className="label">When</span>
                <span>
                  {date} · {time}
                </span>
              </div>
              <div className="summary-row">
                <span className="label">Where</span>
                <span>
                  {addr.address_line1}, {ZONES.find((z) => z.code === zone)?.name}
                </span>
              </div>
              <div className="summary-row">
                <span className="label">Contact</span>
                <span>{contact.whatsapp_e164}</span>
              </div>

              <div style={{ marginTop: 18 }}>
                {quote.line_items.map((li, i) => (
                  <div className="summary-row" key={i}>
                    <span className="label">{li.description}</span>
                    <span>{naira(li.line_total_kobo)}</span>
                  </div>
                ))}
              </div>

              <div className="summary-total">
                <span>Total</span>
                <span className="amount">{quote.display_total}</span>
              </div>

              <label style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 18, fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={terms}
                  onChange={(e) => setTerms(e.target.checked)}
                  style={{ width: "auto", marginTop: 3 }}
                />
                <span>
                  I accept the <a href="/terms">service &amp; cancellation terms</a>.
                </span>
              </label>
            </section>
          )}

          <div className="nav-row">
            {step > 0 ? (
              <button type="button" className="btn-ghost" onClick={back} disabled={loading}>
                ← Back
              </button>
            ) : (
              <span />
            )}

            {step < STEPS.length - 1 ? (
              <button
                type="button"
                className="btn-primary"
                onClick={next}
                disabled={loading || (step === 0 && !selectedService.bookableOnline)}
              >
                {loading ? "Please wait…" : "Continue"}
              </button>
            ) : (
              <button type="button" className="btn-primary" onClick={payNow} disabled={loading || !terms}>
                {loading ? "Starting payment…" : `Pay ${quote?.display_total ?? ""}`}
              </button>
            )}
          </div>
        </div>

        <p className="muted" style={{ textAlign: "center", marginTop: 18 }}>
          Secure payment by Paystack · Prices are flat, no hidden fees
        </p>
      </div>
    </main>
  );
}
