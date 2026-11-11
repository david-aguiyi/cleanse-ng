import { describe, it, expect, vi, beforeEach } from "vitest";
import { setCleanerPasswordSchema } from "../../src/validation/schemas";

vi.mock("server-only", () => ({}));

const { mockUpdateUserById, mockFrom, mockAuditInsert, state } = vi.hoisted(() => {
  const state = {
    queriedTables: [] as string[],
    auditPayloads: [] as unknown[],
    credentialRow: { temporary_password: "CleansePro#2026", updated_at: "2026-11-11T10:00:00Z" } as {
      temporary_password: string;
      updated_at: string;
    } | null,
    credentialReadError: null as { code?: string; message?: string } | null,
  };

  const mockUpdateUserById = vi.fn(async () => ({ data: { user: { id: "auth-1" } }, error: null }));
  const mockAuditInsert = vi.fn(async (payload: unknown) => {
    state.auditPayloads.push(payload);
    return { error: null };
  });

  const cleanerRow = {
    id: "cleaner-1",
    auth_user_id: "auth-1",
    cleaner_code: "CLN-1001",
    full_name: "Aguiyi Pro",
    email: "aguiyi.pro@cleanse.ng",
    phone_e164: "+2349130663739",
    whatsapp_e164: "+2349130663739",
    bio: "Cleanse Pro",
    photo_path: null,
    account_status: "ONBOARDING",
    availability: "UNAVAILABLE",
    verified: false,
    deployment_ready: false,
    rating: null,
    completed_jobs: 0,
    acceptance_rate: null,
    completion_rate: null,
    cancellation_rate: null,
    work_rate_label: "TRAINEE",
    joined_at: "2026-11-11T09:00:00Z",
    paused_at: null,
    blocked_at: null,
    block_reason: null,
  };

  const mockFrom = vi.fn((table: string) => {
    state.queriedTables.push(table);
    if (table === "cleaners") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: cleanerRow, error: null }),
          }),
        }),
      };
    }
    if (table === "cleaner_credentials") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: state.credentialReadError ? null : state.credentialRow,
              error: state.credentialReadError,
            }),
          }),
        }),
        upsert: async (row: { temporary_password: string; updated_at: string }) => {
          state.credentialRow = {
            temporary_password: row.temporary_password,
            updated_at: row.updated_at,
          };
          return { error: null };
        },
      };
    }
    if (table === "audit_logs") {
      return { insert: mockAuditInsert };
    }
    if (table === "job_assignments") {
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          }),
        }),
      };
    }
    return {
      select: () => ({
        eq: async () => ({ data: [], error: null }),
      }),
    };
  });

  return { mockUpdateUserById, mockFrom, mockAuditInsert, state };
});

vi.mock("@/db/service-client", () => ({
  serviceClient: () => ({
    from: mockFrom,
    auth: { admin: { updateUserById: mockUpdateUserById } },
  }),
}));

import { getMe, getCleanerAdmin, setCleanerPassword } from "../../src/domain/cleaner/cleaner-service";
import type { AdminContext } from "../../src/auth/admin";

const ADMIN_CTX: AdminContext = {
  authUserId: "admin-auth-1",
  adminId: "admin-1",
  fullName: "Ops Admin",
  role: "SUPER_ADMIN",
};

describe("Admin-Only Cleaner Credentials", () => {
  beforeEach(() => {
    state.queriedTables = [];
    state.auditPayloads = [];
    state.credentialReadError = null;
    state.credentialRow = {
      temporary_password: "CleansePro#2026",
      updated_at: "2026-11-11T10:00:00Z",
    };
    mockUpdateUserById.mockClear();
    mockFrom.mockClear();
    mockAuditInsert.mockClear();
  });

  it("validates temporary password strength (minimum 8 chars)", () => {
    expect(() => setCleanerPasswordSchema.parse({ password: "short" })).toThrow();
    expect(setCleanerPasswordSchema.parse({ password: "CleansePro#2026" }).password).toBe(
      "CleansePro#2026"
    );
  });

  it("never exposes temporary_password or queries cleaner_credentials in getMe (cleaner self-view)", async () => {
    const me = await getMe("cleaner-1");
    expect(me.email).toBe("aguiyi.pro@cleanse.ng");
    expect("temporary_password" in me).toBe(false);
    expect(state.queriedTables).not.toContain("cleaner_credentials");
  });

  it("returns temporary_password only in getCleanerAdmin when called with an AdminContext", async () => {
    await expect(
      // @ts-expect-error verifying runtime guard against missing admin context
      getCleanerAdmin("cleaner-1", null)
    ).rejects.toThrow(/Admin access required/);

    const detail = await getCleanerAdmin("cleaner-1", ADMIN_CTX);
    expect(detail.email).toBe("aguiyi.pro@cleanse.ng");
    expect(detail.temporary_password).toBe("CleansePro#2026");
    expect(detail.credentials_storage_ready).toBe(true);
  });

  it("degrades gracefully if migration 0014_cleaner_admin_credentials has not been applied yet", async () => {
    state.credentialReadError = { code: "42P01", message: 'relation "cleaner_credentials" does not exist' };
    const detail = await getCleanerAdmin("cleaner-1", ADMIN_CTX);
    expect(detail.temporary_password).toBeNull();
    expect(detail.credentials_storage_ready).toBe(false);
  });

  it("updates Supabase Auth password without writing plaintext password to audit logs", async () => {
    const res = await setCleanerPassword("cleaner-1", "NewPass#2026", ADMIN_CTX);
    expect(mockUpdateUserById).toHaveBeenCalledWith("auth-1", { password: "NewPass#2026" });
    expect(res.temporary_password).toBe("NewPass#2026");
    expect(state.credentialRow?.temporary_password).toBe("NewPass#2026");
    expect(JSON.stringify(state.auditPayloads)).not.toContain("NewPass#2026");
  });
});

