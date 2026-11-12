import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getAdminContext } from "@/auth/admin";
import { getApplication, ageFromDob } from "@/domain/applicant/applicant-service";
import { getOnboardingByApplicant } from "@/domain/cleaner/onboarding-service";
import { AppError } from "@/http/errors";
import { humanApplicantStatus, humanOnboardingStatus, lagos } from "../../format";
import { buildApplicantWhatsAppUrl } from "../applicant-message";
import AdminShell from "../../_components/AdminShell";
import StatusBadge from "../../_components/StatusBadge";
import ReviewActions from "./ReviewActions";
import ApplicantWhatsAppAction from "./ApplicantWhatsAppAction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const yesNo = (v: boolean | null) => (v === true ? "Yes" : v === false ? "No" : "—");
const list = (v: string[] | null) => (v && v.length ? v.join(", ") : "—");

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="kv">
      <span className="k">{k}</span>
      <span style={{ textAlign: "right" }}>{v || "—"}</span>
    </div>
  );
}

function Answer({ q, a }: { q: string; a: string | null }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>
        {q}
      </div>
      <div style={{ whiteSpace: "pre-wrap" }}>{a || "—"}</div>
    </div>
  );
}

export default async function ApplicantDetail({ params }: { params: { id: string } }) {
  const admin = await getAdminContext();
  if (!admin) redirect(`/admin/login?next=/admin/applicants/${params.id}`);

  let a: Record<string, any>;
  try {
    a = await getApplication(params.id);
  } catch (err) {
    if (err instanceof AppError && err.code === "APPLICATION_NOT_FOUND") notFound();
    throw err;
  }

  let onboarding: Record<string, any> | null = null;
  try {
    onboarding = await getOnboardingByApplicant(a.id);
  } catch {
    onboarding = null;
  }

  return (
    <AdminShell
      who={`${admin.fullName} · ${admin.role}`}
      active="applicants"
      breadcrumbs={[
        { label: "Applicants", href: "/admin/applicants" },
        { label: a.full_name },
      ]}
      title={a.full_name}
      subtitle={`Applied ${lagos(a.created_at)} · WhatsApp ${a.whatsapp_e164}`}
      actions={<StatusBadge status={humanApplicantStatus(a.status)} />}
    >
      <div className={`ops-action-banner ${onboarding ? "tone-green" : "tone-purple"}`}>
        <div>
          <div className="ops-action-title">
            {onboarding
              ? `Onboarding Submitted (${humanOnboardingStatus(onboarding.status).label})`
              : "Hiring Next Step: Review Fit & Send Selection Message"}
          </div>
          <div className="ops-action-desc">
            {onboarding
              ? "Candidate already submitted full NIN, photo & guarantor info. Finish approval inside Onboarding & NIN."
              : "If accepted, send the WhatsApp invitation to /pro/onboard or convert directly to a Cleanse Pro account."}
          </div>
        </div>
        <div className="ops-action-ctas">
          {onboarding && (
            <Link className="ops-quick-btn is-primary" href={`/admin/onboardings/${onboarding.id}`}>
              Open Onboarding Review →
            </Link>
          )}
          <a
            className="ops-quick-btn"
            href={buildApplicantWhatsAppUrl(a.whatsapp_e164, a.full_name)}
            target="_blank"
            rel="noreferrer"
          >
            Message on WhatsApp ↗
          </a>
          <Link
            className="ops-quick-btn"
            href={`/admin/cleaners/new?applicant_id=${a.id}&name=${encodeURIComponent(
              a.full_name
            )}&phone=${encodeURIComponent(a.phone_e164 || a.whatsapp_e164 || "")}&whatsapp=${encodeURIComponent(
              a.whatsapp_e164 || ""
            )}`}
          >
            Convert Manually →
          </Link>
        </div>
      </div>

      <div className="detail-grid">
        <div className="card">
          <h3>About them</h3>
          <Row k="Date of birth" v={`${a.date_of_birth} (age ${ageFromDob(a.date_of_birth)})`} />
          <Row k="Gender" v={a.gender} />
          <Row k="Children" v={a.has_children} />
          <Row k="Home address" v={a.area} />
          <Row k="Nearest landmark" v={a.landmark} />
          <Row k="Languages" v={list(a.languages)} />
          <Row k="Heard about us" v={a.heard_from} />
        </div>

        <div className="card">
          <h3>Experience and practicalities</h3>
          <Row k="Education" v={a.education} />
          <Row k="Experience" v={a.experience} />
          <Row k="Cleaned before at" v={list(a.experience_places)} />
          <Row k="Days available" v={list(a.available_days)} />
          <Row k="Can start" v={a.start_when} />
          <Row k="Transport" v={a.transport} />
          <Row k="Smartphone with WhatsApp" v={yesNo(a.has_smartphone)} />
          <Row k="Valid ID" v={yesNo(a.has_valid_id)} />
          <Row k="Guarantor if accepted" v={yesNo(a.willing_guarantor)} />
          <Row k="2 references" v={yesNo(a.can_give_references)} />
          <Row k="Willing to train" v={yesNo(a.willing_training)} />
        </div>

        <div className="card">
          <h3>Their answers</h3>
          <Answer q="Why do you want to work with Cleanse?" a={a.why_cleanse} />
          <Answer q="A job starts at 8:00am. What time would you arrive?" a={a.arrival_time} />
          <Answer q="While cleaning, you find money under the bed. What do you do?" a={a.found_money} />
          <Answer q="How many days a week can you commit for the next 3 months?" a={a.days_per_week} />
          <Answer q='Attention check (asked to type "CLEAN")' a={a.attention_check} />
        </div>

        <div className="card">
          <h3>Review &amp; Decision</h3>
          <ApplicantWhatsAppAction phone={a.whatsapp_e164} fullName={a.full_name} applicantId={a.id} />
          <div style={{ margin: "18px 0 16px", borderTop: "1px solid var(--border)" }} />
          <ReviewActions applicationId={a.id} initialStatus={a.status} initialNotes={a.admin_notes} />
        </div>
      </div>
    </AdminShell>
  );
}
