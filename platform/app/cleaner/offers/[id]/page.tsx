import { redirect } from "next/navigation";
import { getCleanerContext } from "@/auth/cleaner";
import { getOfferForCleaner } from "@/domain/assignment/assignment-service";
import { AppError } from "@/http/errors";
import CleanerBar from "../../CleanerBar";
import OfferActions from "./OfferActions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function naira(kobo: number): string {
  return `₦${Math.round(kobo / 100).toLocaleString("en-NG")}`;
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

export default async function OfferDetailPage({ params }: { params: { id: string } }) {
  const ctx = await getCleanerContext();
  if (!ctx) redirect(`/cleaner/login?next=/cleaner/offers/${params.id}`);

  let offer;
  try {
    offer = await getOfferForCleaner(params.id, ctx.cleanerId);
  } catch (err) {
    if (err instanceof AppError) {
      return (
        <main className="cleaner-shell">
          <CleanerBar active="home" />
          <div className="cleaner-wrap">
            <div className="card">
              <h1 className="step-title" style={{ fontSize: 20 }}>
                Offer unavailable
              </h1>
              <p className="muted">This job has already been taken or the offer has expired.</p>
              <a className="btn-primary" href="/cleaner/home" style={{ marginTop: 12 }}>
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
      <CleanerBar active="home" />
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
                  <span className="k">Address</span>
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
            )}
            <a
              className="btn-primary"
              style={{ width: "100%", marginTop: 14 }}
              href={`/cleaner/jobs/${offer.booking_reference}`}
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
            <div className="kv">
              <span className="k">You earn (est.)</span>
              <span>
                <strong>{naira(offer.payout_kobo)}</strong>
              </span>
            </div>

            <div style={{ marginTop: 18 }}>
              {offer.is_active ? (
                <OfferActions offerId={offer.id} />
              ) : (
                <div className="notice info">This job has already been taken.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
