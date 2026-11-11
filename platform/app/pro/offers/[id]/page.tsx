import { redirect } from "next/navigation";
import { getCleanerContext } from "@/auth/cleaner";
import { getOfferForCleaner } from "@/domain/assignment/assignment-service";
import { AppError } from "@/http/errors";
import ProBar from "../../ProBar";
import OfferActions from "./OfferActions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function naira(kobo: number): string {
  return `₦${Math.round(kobo / 100).toLocaleString("en-NG")}`;
}
function planLabel(freq: string, visits: number): string | null {
  if (freq === "WEEKLY") return `Weekly plan · ${visits} visits/month`;
  if (freq === "MONTHLY") return `Monthly plan · ${visits} visits/month`;
  return null;
}
function when(iso: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: "Africa/Lagos",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function ProOfferDetailPage({ params }: { params: { id: string } }) {
  const ctx = await getCleanerContext();
  if (!ctx) redirect(`/pro/login?next=/pro/offers/${params.id}`);

  let offer;
  try {
    offer = await getOfferForCleaner(params.id, ctx.cleanerId);
  } catch (err) {
    if (err instanceof AppError) {
      return (
        <main className="cleaner-shell">
          <ProBar active="home" />
          <div className="cleaner-wrap">
            <div className="card">
              <h1 className="step-title" style={{ fontSize: 20 }}>
                Offer unavailable
              </h1>
              <p className="muted">This job has already been taken or the offer has expired.</p>
              <a className="btn-primary" href="/pro/home" style={{ marginTop: 12 }}>
                Back home
              </a>
            </div>
          </div>
        </main>
      );
    }
    throw err;
  }

  return (
    <main className="cleaner-shell">
      <ProBar active="home" />
      <div className="cleaner-wrap">
        {offer.won ? (
          <div className="card">
            <div className="pill ful-cleaner_assigned" style={{ marginBottom: 10 }}>
              You won this job
            </div>
            <h1 className="step-title" style={{ fontSize: 20 }}>
              {offer.service_name} · {offer.property_bedrooms}BR
            </h1>
            <div className="kv">
              <span className="k">When</span>
              <span>{when(offer.scheduled_start_at)}</span>
            </div>
            {offer.full_details && (
              <>
                <div className="kv">
                  <span className="k">Customer</span>
                  <span>{offer.full_details.customer_first_name}</span>
                </div>
                <div className="kv">
                  <span className="k">Area</span>
                  <span>{offer.zone_name ?? "—"}</span>
                </div>
                {offer.full_details.address_unlocked ? (
                  <>
                    <div className="kv">
                      <span className="k">House Address</span>
                      <span style={{ textAlign: "right" }}>
                        {[offer.full_details.address_line1, offer.full_details.estate]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </div>
                    {offer.full_details.landmark && (
                      <div className="kv">
                        <span className="k">Landmark</span>
                        <span style={{ textAlign: "right" }}>{offer.full_details.landmark}</span>
                      </div>
                    )}
                    {offer.full_details.directions && (
                      <div className="kv">
                        <span className="k">Directions</span>
                        <span style={{ textAlign: "right" }}>{offer.full_details.directions}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="kv">
                    <span className="k">House Details</span>
                    <span className="muted" style={{ textAlign: "right" }}>
                      Unlocks {offer.full_details.address_unlock_label} (1 hr before job)
                    </span>
                  </div>
                )}
              </>
            )}
            <a
              className="btn-primary"
              style={{ width: "100%", marginTop: 14 }}
              href={`/pro/jobs/${offer.booking_reference}`}
            >
              Go to job
            </a>
          </div>
        ) : (
          <div className="card">
            <h1 className="step-title" style={{ fontSize: 20 }}>
              {offer.service_name} · {offer.property_bedrooms}BR
            </h1>
            <p className="muted">Broad area — exact address is shared only when you win.</p>
            <div className="kv">
              <span className="k">Area</span>
              <span>{offer.zone_name ?? "—"}</span>
            </div>
            <div className="kv">
              <span className="k">When</span>
              <span>{when(offer.scheduled_start_at)}</span>
            </div>
            {planLabel(offer.plan_frequency, offer.plan_visits) && (
              <div className="kv">
                <span className="k">Plan</span>
                <span>{planLabel(offer.plan_frequency, offer.plan_visits)}</span>
              </div>
            )}
            <div className="kv">
              <span className="k">You earn (est.)</span>
              <span>
                <strong>{naira(offer.payout_kobo)}</strong>
                {offer.plan_frequency !== "ONE_TIME" && (
                  <span className="muted" style={{ display: "block", fontSize: 12, textAlign: "right" }}>
                    for the {offer.plan_visits}-visit plan
                  </span>
                )}
              </span>
            </div>

            <div style={{ marginTop: 18 }}>
              {offer.is_active ? (
                <OfferActions offerId={offer.id} />
              ) : (
                <div className="notice info">This job is no longer available.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

