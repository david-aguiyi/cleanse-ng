import { redirect } from "next/navigation";
import { getAdminContext } from "@/auth/admin";
import { getSiteSettings } from "@/domain/settings/settings-service";
import AdminShell from "../_components/AdminShell";
import SettingsForm from "./SettingsForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login?next=/admin/settings");

  const settings = await getSiteSettings();

  return (
    <AdminShell
      who={`${admin.fullName} · ${admin.role}`}
      active="settings"
      breadcrumbs={[{ label: "Website Settings" }]}
      title="Website Settings"
      subtitle="Manage the active Cleanse.ng WhatsApp contact number used across marketing pages, client messages, and invoices."
    >
      <SettingsForm
        initialWhatsapp={settings.whatsapp}
        updatedAt={settings.updatedAt}
      />
    </AdminShell>
  );
}
