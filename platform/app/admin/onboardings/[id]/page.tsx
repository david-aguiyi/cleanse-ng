import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getAdminContext } from "@/auth/admin";
import { getOnboarding } from "@/domain/cleaner/onboarding-service";
import { AppError } from "@/http/errors";
import { lagos } from "../../format";
import { AGREEMENT_CLAUSES } from "@app/pro/onboard/clauses";
import AdminBar from "../../AdminBar";
import ReviewOnboarding from "./ReviewOnboarding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="kv">
      <span className="k">{k}</span>
      <span style={{ textAlign: "right" }}>{v || "—"}</span>
    </div>
  );
}

const list = (v: string[] | null) => (v && v.length ? v.join(", ") : "—");

export default async function OnboardingDetailPage({ params }: { params: { id: string } }) {
  const admin = await getAdminContext();
  if (!admin) redirect(`/admin/login?next=/admin/onboardings/${params.id}`);

  let ob: Record<string, any>;
  try {
    ob = await getOnboarding(params.id);
  } catch (err) {
    if (err instanceof AppError && err.code === "ONBOARDING_NOT_FOUND") notFound();
    throw err;
  }

  const agreedIds: number[] = Array.isArray(ob.agreed_clauses) ? ob.agreed_clauses : [];

  return (
    <main className="admin-shell">
      <AdminBar who={`${admin.fullName} · ${admin.role}`} active="onboardings" />
      <div className="admin-wrap">
        <p className="muted">
          <Link href="/admin/onboardings">← Pro onboardings</Link>
        </p>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 className="admin-h1">{ob.full_name}</h1>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "6px 0" }}>
              <span className={`pill ${ob.status === "APPROVED" ? "ful-cleaner_assigned" : "neutral"}`}>
                {ob.status}
              </span>
              <span className="pill neutral">Submitted {lagos(ob.created_at)}</span>
              {ob.nin_verified && (
                <span className="pill" style={{ background: "#d1fae5", color: "#065f46" }}>
                  ✓ NIN Verified
                </span>
              )}
              {ob.guarantor_called && (
                <span className="pill" style={{ background: "#d1fae5", color: "#065f46" }}>
                  ✓ Guarantor Called
                </span>
              )}
            </div>
          </div>
          {ob.applicant_id && (
            <Link href={`/admin/applicants/${ob.applicant_id}`} className="btn-ghost">
              View Original Application ↗
            </Link>
          )}
        </div>

        {/* PHOTOS ROW */}
        <div className="detail-grid" style={{ marginTop: 16 }}>
          <div className="card">
            <h3>Identity Photos (Confidential)</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 12 }}>
              <div>
                <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Clear Candidate Photo</div>
                {ob.photo_url ? (
                  <img
                    src={ob.photo_url}
                    alt={ob.full_name}
                    style={{ width: "100%", borderRadius: 10, maxHeight: 240, objectFit: "cover", border: "1px solid var(--border)" }}
                  />
                ) : (
                  <p className="muted">No photo</p>
                )}
              </div>
              <div>
                <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
                  NIN Document ({ob.nin_digits})
                </div>
                {ob.nin_document_url ? (
                  <img
                    src={ob.nin_document_url}
                    alt="NIN Document"
                    style={{ width: "100%", borderRadius: 10, maxHeight: 240, objectFit: "cover", border: "1px solid var(--border)" }}
                  />
                ) : (
                  <p className="muted">No document</p>
                )}
              </div>
            </div>

            <h3 style={{ marginTop: 20 }}>1. Personal &amp; Identity</h3>
            <Row k="Full Name (NIN)" v={ob.full_name} />
            <Row k="NIN (11 digits)" v={<code style={{ fontWeight: 700 }}>{ob.nin_digits}</code>} />
            <Row k="WhatsApp Phone" v={ob.whatsapp_e164} />
            <Row k="Date of birth" v={ob.date_of_birth} />
            <Row k="Gender" v={ob.gender} />

            <h3 style={{ marginTop: 20 }}>2. Residential Address</h3>
            <Row k="Street Address" v={ob.street_address} />
            <Row k="Landmark / Bus stop" v={ob.landmark} />
            <Row k="Neighbourhood" v={ob.neighbourhood} />
            <Row k="LGA" v={ob.lga} />
            <Row k="City & State" v={ob.city_state} />
            <Row k="Directions" v={ob.directions} />
            <Row k="Closest Cleanse Zone" v={<strong>{ob.closest_zone}</strong>} />
            <Row k="Transport Mode" v={ob.transport_mode} />
            <Row k="Travel Time to Hub" v={ob.travel_time_hub} />
          </div>

          <div className="card">
            <h3>Operator Review &amp; Provisioning</h3>
            <ReviewOnboarding
              id={ob.id}
              fullName={ob.full_name}
              initialStatus={ob.status}
              initialNinVerified={Boolean(ob.nin_verified)}
              initialGuarantorCalled={Boolean(ob.guarantor_called)}
              initialNotes={ob.admin_notes}
              cleanerId={ob.cleaner_id}
              closestZone={ob.closest_zone}
            />

            <h3 style={{ marginTop: 24 }}>5. Trust &amp; Safety Contacts</h3>
            <Row k="Guarantor Name" v={ob.guarantor_name} />
            <Row k="Guarantor Phone" v={ob.guarantor_phone} />
            <Row k="Relationship" v={ob.guarantor_relationship} />
            <Row k="Occupation" v={ob.guarantor_occupation} />
            <div style={{ margin: "8px 0", borderTop: "1px dashed var(--border)" }} />
            <Row k="Emergency Contact" v={ob.emergency_name} />
            <Row k="Emergency Phone" v={ob.emergency_phone} />
            <Row k="Relationship" v={ob.emergency_relationship} />
            <Row k="Allergies" v={ob.allergies} />
          </div>

          <div className="card">
            <h3>3 &amp; 4. Background &amp; Availability</h3>
            <Row k="Education" v={ob.education_level} />
            <Row k="Religion" v={ob.religion} />
            <Row k="Languages" v={list(ob.languages)} />
            <Row k="Days Available" v={list(ob.available_days)} />
            <Row k="Early Morning (7:30–8am)" v={ob.early_morning_ok ? "Yes" : "No"} />
            <Row k="Comfortable Working in Pairs" v={ob.pair_work_ok ? "Yes" : "No"} />
            <Row k="Can Start" v={ob.start_readiness} />
            <Row k="Products Used" v={list(ob.products_used)} />
            <Row k="Equipment Used" v={list(ob.equipment_used)} />
            {ob.experience_details && (
              <div style={{ marginTop: 12 }}>
                <div className="muted" style={{ fontSize: 12 }}>Previous Experience Details</div>
                <p style={{ margin: "4px 0", whiteSpace: "pre-wrap" }}>{ob.experience_details}</p>
              </div>
            )}

            <h3 style={{ marginTop: 20 }}>6. Cleanse Fit Questions</h3>
            <div style={{ marginBottom: 10 }}>
              <div className="muted" style={{ fontSize: 12 }}>Why Cleanse Pro?</div>
              <div>{ob.why_cleanse || "—"}</div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <div className="muted" style={{ fontSize: 12 }}>1-Year Goal</div>
              <div>{ob.one_year_goal || "—"}</div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <div className="muted" style={{ fontSize: 12 }}>If something breaks accidentally</div>
              <div>{ob.accidental_breakage_response || "—"}</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 12 }}>Referral Source</div>
              <div>{ob.referral_source || "—"}</div>
            </div>
          </div>

          <div className="card">
            <h3>7. Signed Cleanse Pro Agreement ({agreedIds.length}/19 Clauses)</h3>
            <div className="notice info" style={{ marginBottom: 12, fontSize: 13 }}>
              <strong>Version:</strong> {ob.agreement_version} · <strong>Signed at:</strong>{" "}
              {lagos(ob.agreed_at)} · <strong>IP:</strong> {ob.source_ip || "—"}
            </div>
            <div style={{ maxHeight: 380, overflowY: "auto", paddingRight: 6 }}>
              {AGREEMENT_CLAUSES.map((c) => {
                const isAgreed = agreedIds.includes(c.id);
                return (
                  <div
                    key={c.id}
                    style={{
                      display: "flex",
                      gap: 8,
                      fontSize: 12.5,
                      padding: "6px 0",
                      borderBottom: "1px solid var(--border)",
                      color: isAgreed ? "inherit" : "#b3261e",
                    }}
                  >
                    <span>{isAgreed ? "✅" : "❌"}</span>
                    <span>
                      <strong>{c.id}.</strong> {c.text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

