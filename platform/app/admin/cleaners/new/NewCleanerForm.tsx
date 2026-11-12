"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ZONES, SERVICES } from "@app/book/catalog";

const PRESET_TAGS = ["TRAINEE", "UNDER_SUPERVISION", "PROBATION", "SENIOR", "RELIABLE"];

export default function NewCleanerForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const applicantId = searchParams.get("applicant_id");
  const initialName = searchParams.get("name") ?? "";
  const initialPhone = searchParams.get("phone") ?? "";
  const initialWa = searchParams.get("whatsapp") ?? initialPhone;

  const [form, setForm] = useState({
    full_name: initialName,
    email: "",
    password: "",
    phone_e164: initialPhone,
    whatsapp_e164: initialWa,
    bio: "",
  });
  const [tag, setTag] = useState("TRAINEE");
  const [zoneCodes, setZoneCodes] = useState<string[]>([]);
  const [serviceCodes, setServiceCodes] = useState<string[]>(["REGULAR"]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const toggle = (list: string[], set: (v: string[]) => void, code: string) =>
    set(list.includes(code) ? list.filter((c) => c !== code) : [...list, code]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/cleaners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          whatsapp_e164: form.whatsapp_e164 || undefined,
          bio: form.bio || undefined,
          work_rate_label: tag || undefined,
          zone_codes: zoneCodes,
          service_codes: serviceCodes,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? "Could not create Cleanse Pro.");

      if (applicantId) {
        await fetch(`/api/v1/admin/applicants/${applicantId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "HIRED",
            admin_notes: `Onboarded as Cleanse Pro (ID: ${json.data.id}, Code: ${json.data.cleaner_code})`,
          }),
        }).catch(() => undefined);
      }

      router.replace(`/admin/cleaners/${json.data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create Cleanse Pro.");
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 680 }}>
      {applicantId && (
        <div className="notice info" style={{ marginBottom: 16 }}>
          <strong>Converting Applicant:</strong> Form prefilled from their application. Submitting will
          create their Pro account and mark the applicant record as <strong>Hired</strong>.
        </div>
      )}
      {error && <div className="notice error">{error}</div>}
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="full_name">Full name</label>
          <input
            id="full_name"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="email">Login email</label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="password">Temporary password</label>
          <input
            id="password"
            type="text"
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="At least 8 characters"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="phone">Phone</label>
          <input
            id="phone"
            placeholder="+2348012345678"
            value={form.phone_e164}
            onChange={(e) => setForm({ ...form, phone_e164: e.target.value })}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="wa">WhatsApp (optional)</label>
          <input
            id="wa"
            placeholder="+2348012345678"
            value={form.whatsapp_e164}
            onChange={(e) => setForm({ ...form, whatsapp_e164: e.target.value })}
          />
        </div>

        <label className="field-label">Initial status tag</label>
        <div className="chip-row" style={{ marginBottom: 12 }}>
          {PRESET_TAGS.map((t) => (
            <button
              type="button"
              key={t}
              className={`chip ${tag === t ? "selected" : ""}`}
              onClick={() => setTag(tag === t ? "" : t)}
            >
              {t === "UNDER_SUPERVISION" ? "UNDER SUPERVISION" : t}
            </button>
          ))}
        </div>

        <div className="field">
          <label htmlFor="bio">Short bio / Intake notes (optional)</label>
          <textarea
            id="bio"
            rows={2}
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            placeholder="Experience background, equipment assigned, intake remarks..."
          />
        </div>

        <label className="field-label">Zones served</label>
        <div className="chip-row">
          {ZONES.map((z) => (
            <button
              type="button"
              key={z.code}
              className={`chip ${zoneCodes.includes(z.code) ? "selected" : ""}`}
              onClick={() => toggle(zoneCodes, setZoneCodes, z.code)}
            >
              {z.name}
            </button>
          ))}
        </div>

        <label className="field-label">Services qualified</label>
        <div className="chip-row">
          {SERVICES.map((s) => (
            <button
              type="button"
              key={s.code}
              className={`chip ${serviceCodes.includes(s.code) ? "selected" : ""}`}
              onClick={() => toggle(serviceCodes, setServiceCodes, s.code)}
            >
              {s.name}
            </button>
          ))}
        </div>

        <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: 8 }} disabled={loading}>
          {loading ? "Creating…" : "Create Cleanse Pro"}
        </button>
      </form>
    </div>
  );
}

