import { WHATSAPP_HELP } from "@app/book/catalog";

export const dynamic = "force-dynamic";

const REASONS: Record<string, string> = {
  missing_reference: "We couldn't find a payment reference. Please start your booking again.",
  verification_failed:
    "We couldn't verify your payment. If you were charged, contact us and we'll sort it out right away.",
};

export default function BookingErrorPage({
  searchParams,
}: {
  searchParams: { reason?: string };
}) {
  const message =
    (searchParams.reason && REASONS[searchParams.reason]) ??
    "Something went wrong with your payment. Please try again.";

  return (
    <main className="wizard">
      <div className="container" style={{ maxWidth: 520 }}>
        <div className="wizard-header">
          <a className="wizard-brand" href="/">
            CLEANSE.NG
          </a>
        </div>
        <div className="card" style={{ textAlign: "center" }}>
          <h1 className="step-title">Payment not completed</h1>
          <p className="step-hint">{message}</p>
          <div className="nav-row" style={{ justifyContent: "center", gap: 12 }}>
            <a className="btn-primary" href="/book">
              Try again
            </a>
            <a className="btn-ghost" href={WHATSAPP_HELP} target="_blank" rel="noreferrer">
              Chat with us
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
