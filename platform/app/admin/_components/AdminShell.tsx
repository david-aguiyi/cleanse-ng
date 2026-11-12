import type { ReactNode } from "react";
import { getAdminNavCounts, type AdminNavCounts } from "@/domain/admin/overview-service";
import SidebarClient, { type AdminNavKey, type BreadcrumbItem } from "./SidebarClient";

export type { AdminNavKey, BreadcrumbItem };

export default async function AdminShell({
  who,
  active,
  breadcrumbs,
  title,
  subtitle,
  actions,
  navCounts,
  children,
}: {
  who: string;
  active?: AdminNavKey;
  breadcrumbs: BreadcrumbItem[];
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  navCounts?: AdminNavCounts;
  children: ReactNode;
}) {
  const counts = navCounts ?? (await getAdminNavCounts());

  return (
    <SidebarClient who={who} active={active} counts={counts} breadcrumbs={breadcrumbs}>
      {(title || actions) && (
        <div className="ops-page-head">
          <div>
            {title && <h1 className="admin-h1">{title}</h1>}
            {subtitle && <p className="ops-page-sub">{subtitle}</p>}
          </div>
          {actions && <div className="ops-head-actions">{actions}</div>}
        </div>
      )}
      {children}
    </SidebarClient>
  );
}

