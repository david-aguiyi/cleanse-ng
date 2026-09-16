import { getShareCardByToken } from "@/domain/admin/share-card-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public customer-safe cleaner card (Blueprint §12.1). Shows only allow-listed
 * fields; no phone, address, internal notes or complaint data. A revoked or
 * expired token shows a friendly gone page.
 */
export default async function CleanerCardPage({ params }: { params: { token: string } }) {
  const card = await getShareCardByToken(params.token);

  if (!card) {
    return (
      <main className="wizard">
        <div className="container" style={{ maxWidth: 480 }}>
          <div className="wizard-header">
            <span className="wizard-brand">CLEANSE.NG</span>
          </div>
          <div className="card" style={{ textAlign: "center" }}>
            <h1 className="step-title">Link expired</h1>
            <p className="step-hint">
              This cleaner profile link is no longer available. Please contact us on WhatsApp if you
              need anything.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="wizard">
      <div className="container" style={{ maxWidth: 480 }}>
        <div className="wizard-header">
          <span className="wizard-brand">CLEANSE.NG</span>
        </div>
        <div className="card" style={{ textAlign: "center" }}>
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: "50%",
              margin: "0 auto 14px",
              background: "var(--off-white-dark)",
              display: "grid",
              placeItems: "center",
              fontFamily: "var(--font-header)",
              fontSize: 30,
              fontWeight: 700,
              color: "var(--primary-purple)",
              overflow: "hidden",
            }}
          >
            {card.photo_path ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={card.photo_path} alt={card.full_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              card.full_name.charAt(0)
            )}
          </div>

          <h1 className="step-title" style={{ marginBottom: 2 }}>
            {card.full_name}
          </h1>
          <p className="muted" style={{ marginTop: 0 }}>
            Cleaner ID {card.cleaner_code}
          </p>

          {card.verified && (
            <div className="pill ful-cleaner_assigned" style={{ marginBottom: 12 }}>
              ✓ Cleanse verified
            </div>
          )}

          {card.bio && <p>{card.bio}</p>}

          <div className="cleaner-stats" style={{ maxWidth: 280, margin: "16px auto 0" }}>
            <div className="stat-box">
              <div className="num">{card.completed_jobs}</div>
              <div className="cap">Homes served</div>
            </div>
            <div className="stat-box">
              <div className="num">{card.rating ?? "—"}</div>
              <div className="cap">Rating</div>
            </div>
          </div>
        </div>
        <p className="muted" style={{ textAlign: "center", marginTop: 16 }}>
          Your Cleanse professional for this booking.
        </p>
      </div>
    </main>
  );
}
