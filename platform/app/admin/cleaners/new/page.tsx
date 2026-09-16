"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ZONES, SERVICES } from "@app/book/catalog";

export default function NewCleanerPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    phone_e164: "",
    whatsapp_e164: "",
    bio: "",
  });
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
          zone_codes: zoneCodes,
          service_codes: serviceCodes,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? "Could not create cleaner.");
      router.replace(`/admin/cleaners/${json.data.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create cleaner.");
      setLoading(false);
    }
  }

  return (
    <main className="admin-shell">
      <div className="admin-wrap" style={{ maxWidth: 640 }}>
        <p className="muted">
          <Link href="/admin/cleaners">← Cleaner network</Link>
        </p>
        <h1 className="admin-h1">Onboard a cleaner</h1>
        <p className="muted">
          Creates a sign-in account and profile. The cleaner starts in ONBOARDING and cannot go
          available until you verify and activate them.
        </p>

        <div className="card" style={{ marginTop: 16 }}>
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
            <div className="field">
              <label htmlFor="bio">Short bio (optional)</label>
              <textarea
                id="bio"
                rows={2}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
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
              {loading ? "Creating…" : "Create cleaner"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
