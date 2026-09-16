import { redirect, notFound } from "next/navigation";
import { getCleanerContext } from "@/auth/cleaner";
import { getCleanerJob } from "@/domain/job/job-service";
import { AppError } from "@/http/errors";
import CleanerBar from "../../CleanerBar";
import JobActions from "./JobActions";
import CompleteJobForm from "./CompleteJobForm";

function humanDuration(mins: number | null | undefined): string {
  if (!mins) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h} hr ${m} min` : `${m} min`;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STEPS = ["ASSIGNED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS", "COMPLETED"];
const STEP_LABEL: Record<string, string> = {
  ASSIGNED: "Assigned",
  ON_THE_WAY: "On the way",
  ARRIVED: "Arrived",
  IN_PROGRESS: "Cleaning",
  COMPLETED: "Complete",
};

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

export default async function CleanerJobPage({ params }: { params: { reference: string } }) {
  const ctx = await getCleanerContext();
  if (!ctx) redirect(`/cleaner/login?next=/cleaner/jobs/${params.reference}`);

  let job;
  try {
    job = await getCleanerJob(params.reference, ctx.cleanerId);
  } catch (err) {
    if (err instanceof AppError && err.code === "BOOKING_NOT_FOUND") notFound();
    if (err instanceof AppError && err.code === "FORBIDDEN") {
      return (
        <main className="cleaner-shell">
          <CleanerBar active="home" />
          <div className="cleaner-wrap">
            <div className="card">
              <h1 className="step-title" style={{ fontSize: 20 }}>
                Not your job
              </h1>
              <p className="muted">You are not assigned to this booking.</p>
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

  const currentIdx = STEPS.indexOf(job.assignment_status);
  const waDigits = job.customer_whatsapp.replace(/[^\d]/g, "");

  return (
    <main className="cleaner-shell">
      <CleanerBar active="home" />
      <div className="cleaner-wrap">
        <div className="card">
          <div className="pill ful-cleaner_assigned" style={{ marginBottom: 10 }}>
            {STEP_LABEL[job.assignment_status]}
          </div>
          <h1 className="step-title" style={{ fontSize: 20 }}>
            {job.service_name} · {job.property_bedrooms}BR
          </h1>

          <div className="steps" style={{ margin: "10px 0 18px" }}>
            {STEPS.map((s, i) => (
              <span key={s} className={`step-dot ${i < currentIdx ? "done" : ""} ${i === currentIdx ? "active" : ""}`} />
            ))}
          </div>

          <div className="kv">
            <span className="k">When</span>
            <span>{when(job.scheduled_start_at)}</span>
          </div>
          <div className="kv">
            <span className="k">Customer</span>
            <span>{job.customer_first_name}</span>
          </div>
          <div className="kv">
            <span className="k">Address</span>
            <span style={{ textAlign: "right" }}>
              {[job.address_line1, job.estate].filter(Boolean).join(", ")}
            </span>
          </div>
          {job.landmark && (
            <div className="kv">
              <span className="k">Landmark</span>
              <span style={{ textAlign: "right" }}>{job.landmark}</span>
            </div>
          )}
          {job.directions && (
            <div className="kv">
              <span className="k">Directions</span>
              <span style={{ textAlign: "right" }}>{job.directions}</span>
            </div>
          )}

          <div className="action-btns" style={{ marginTop: 12 }}>
            {waDigits && (
              <a className="wa" href={`https://wa.me/${waDigits}`} target="_blank" rel="noreferrer">
                Message customer
              </a>
            )}
            <a href="https://wa.me/2349130663739" target="_blank" rel="noreferrer">
              Contact Cleanse ops
            </a>
          </div>

          <div style={{ marginTop: 18 }}>
            {job.assignment_status === "COMPLETED" ? (
              <div className="readiness ready">
                <strong>Job complete — nice work!</strong>
                <div style={{ marginTop: 8 }}>
                  Time on site:{" "}
                  <strong>{humanDuration(job.completion_report?.duration_minutes)}</strong>
                </div>
                {job.completion_report?.complaints && (
                  <div style={{ marginTop: 6 }}>Customer complaints: {job.completion_report.complaints}</div>
                )}
                {job.completion_report?.notes && (
                  <div style={{ marginTop: 6 }}>You noticed: {job.completion_report.notes}</div>
                )}
                {job.completion_report?.positives && (
                  <div style={{ marginTop: 6 }}>Went well: {job.completion_report.positives}</div>
                )}
              </div>
            ) : job.assignment_status === "IN_PROGRESS" ? (
              <CompleteJobForm bookingId={job.booking_id} startedAt={job.started_at} />
            ) : (
              <JobActions bookingId={job.booking_id} status={job.assignment_status} />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
