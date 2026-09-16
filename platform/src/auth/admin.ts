/**
 * Admin authorization. The signed-in Supabase Auth user is mapped to an
 * admin_users row and role; every admin API/page checks this server-side —
 * client route visibility is never authorization (Blueprint §6, §14).
 */
import "server-only";
import { createServerSupabase } from "./supabase-server";
import { serviceClient } from "@/db/service-client";
import { AppError } from "@/http/errors";

export type AdminRole =
  | "SUPER_ADMIN"
  | "OPERATIONS"
  | "DISPATCHER"
  | "CUSTOMER_SUPPORT"
  | "FINANCE";

export interface AdminContext {
  authUserId: string;
  adminId: string;
  fullName: string;
  role: AdminRole;
}

/** Returns the current admin context or null if not signed in / not an admin. */
export async function getAdminContext(): Promise<AdminContext | null> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: admin } = await serviceClient()
    .from("admin_users")
    .select("id, full_name, role, active")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!admin || !admin.active) return null;
  return {
    authUserId: user.id,
    adminId: admin.id,
    fullName: admin.full_name,
    role: admin.role as AdminRole,
  };
}

/** Throws UNAUTHORIZED/FORBIDDEN if the caller is not an active admin. */
export async function requireAdmin(allowedRoles?: AdminRole[]): Promise<AdminContext> {
  const ctx = await getAdminContext();
  if (!ctx) throw new AppError("UNAUTHORIZED", "Please sign in as an operator.");
  if (allowedRoles && !allowedRoles.includes(ctx.role)) {
    throw new AppError("FORBIDDEN", "Your role does not permit this action.");
  }
  return ctx;
}
