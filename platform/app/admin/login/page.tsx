"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabase } from "@/auth/supabase-browser";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/admin/bookings";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createBrowserSupabase();
      const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
      if (authErr) {
        setError(authErr.message);
        setLoading(false);
        return;
      }
      // Middleware + page-level requireAdmin enforce the operator role.
      router.replace(next);
      router.refresh();
    } catch {
      setError("Could not sign in. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="wizard-header">
        <span className="wizard-brand">CLEANSE.NG · OPS</span>
      </div>
      <div className="card">
        <h1 className="step-title">Operator sign in</h1>
        <p className="step-hint">Authorised Cleanse operations staff only.</p>
        {error && <div className="notice error">{error}</div>}
        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary" style={{ width: "100%" }} disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="muted" style={{ marginTop: 14 }}>
          MFA enrolment is a production hardening step (Blueprint §6.1).
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <main className="admin-shell">
      <div className="admin-wrap">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
