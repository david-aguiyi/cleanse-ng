import { redirect } from "next/navigation";
import { getAdminContext } from "@/auth/admin";
import { getSiteSettings } from "@/domain/settings/settings-service";
import AdminBar from "../AdminBar";
import SettingsForm from "./SettingsForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login?next=/admin/settings");

  const settings = await getSiteSettings();

  return (
    <main className="admin-shell">
      <AdminBar who={`${admin.fullName} · ${admin.role}`} active="settings" />
      <div className="admin-wrap">
        <h1 className="admin-h1">Website Settings</h1>
        <p className="muted" style={{ marginBottom: 24 }}>
          Manage global contact details and settings across Cleanse.ng.
        </p>

        <SettingsForm
          initialWhatsapp={settings.whatsapp}
          updatedAt={settings.updatedAt}
        />
      </div>
    </main>
  );
}
