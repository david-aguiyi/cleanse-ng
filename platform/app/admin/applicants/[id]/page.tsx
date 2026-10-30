import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getAdminContext } from "@/auth/admin";
import { getApplication, ageFromDob } from "@/domain/applicant/applicant-service";
import { AppError } from "@/http/errors";
import { lagos, waDigits } from "../../format";
import { STATUS_PILL } from "../status";
import AdminBar from "../../AdminBar";
import ReviewActions from "./ReviewActions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const yesNo = (v: boolean | null) => (v === true ? "Yes" : v === false ? "No" : "—");
const list = (v: string[] | null) => (v && v.length ? v.join(", ") : "—");

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="kv">
      <span className="k">{k}</span>
      <span>{v || "—"}</span>
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

  return (
    <main className="admin-shell">
      <AdminBar who={`${admin.fullName} · ${admin.role}`} active="applicants" />
      <div className="admin-wrap">
        <p className="muted">
          <Link href="/admin/applicants">← Applicants</Link>
        </p>
        <h1 className="admin-h1">{a.full_name}</h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "6px 0" }}>
          <span className={`pill ${STATUS_PILL[a.status] ?? "neutral"}`}>{a.status}</span>
          <span className="pill neutral">Applied {lagos(a.created_at)}</span>
          <a
            className="pill ful-cleaner_assigned"
            href={`https://wa.me/${waDigits(a.whatsapp_e164)}`}
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp {a.whatsapp_e164}
          </a>
        </div>

        <div className="detail-grid">
          <div className="card">
            <h3>About them</h3>
            <Row k="Date of birth" v={`${a.date_of_birth} (age ${ageFromDob(a.date_of_birth)})`} />
            <Row k="Gender" v={a.gender} />
            <Row k="Children" v={a.has_children} />
            <Row k="Area" v={a.area} />
            <Row k="Nearest landmark" v={a.landmark} />
            <Row k="Languages" v={list(a.languages)} />
            <Row k="Heard about us" v={a.heard_from} />
          </div>

          <div className="card">
            <h3>Experience and practicalities</h3>
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
            <h3>Review</h3>
            <ReviewActions applicationId={a.id} initialStatus={a.status} initialNotes={a.admin_notes} />
            <p className="muted" style={{ fontSize: 13, marginTop: 14 }}>
              Hiring them? Mark as HIRED, then <Link href="/admin/cleaners/new">onboard them as a cleaner</Link>.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
