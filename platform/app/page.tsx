import Link from "next/link";

export default function Home() {
  return (
    <main className="wizard">
      <div className="container" style={{ maxWidth: 560, textAlign: "center" }}>
        <div className="wizard-header">
          <span className="wizard-brand">CLEANSE.NG</span>
        </div>
        <div className="card">
          <h1 className="step-title">Professional cleaning, booked in minutes.</h1>
          <p className="step-hint">
            Flat pricing, vetted teams, secure Paystack checkout — for homes across Ibadan.
          </p>
          <Link className="btn-primary" href="/book">
            Book a Cleaning
          </Link>
        </div>
        <p className="muted" style={{ marginTop: 18 }}>
          This is the Cleanse.ng booking platform (Blueprint v2.0). The marketing site is served
          separately.
        </p>
      </div>
    </main>
  );
}
