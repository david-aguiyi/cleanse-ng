import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/auth/admin";
import AdminShell from "../../_components/AdminShell";
import CleanseProTabs from "../CleanseProTabs";
import NewCleanerForm from "./NewCleanerForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function NewCleanerPage() {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login?next=/admin/cleaners/new");

  return (
    <AdminShell
      who={`${admin.fullName} · ${admin.role}`}
      active="cleaners"
      breadcrumbs={[
        { label: "Cleanse Pros", href: "/admin/cleaners" },
        { label: "Add Pro Manually" },
      ]}
      title="Add Cleanse Pro Manually"
      subtitle="Creates a /pro login account and roster profile. Candidates who used /pro/onboard should be approved in Onboarding & NIN instead."
    >
      <CleanseProTabs active="new" />

      <Suspense fallback={<div className="card">Loading form…</div>}>
        <NewCleanerForm />
      </Suspense>
    </AdminShell>
  );
}
