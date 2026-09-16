"use client";

import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/auth/supabase-browser";

export default function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await createBrowserSupabase().auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }
  return (
    <button
      type="button"
      onClick={logout}
      style={{
        background: "transparent",
        border: "1px solid rgba(255,255,255,0.3)",
        color: "#fff",
        borderRadius: 8,
        padding: "6px 12px",
        cursor: "pointer",
        fontFamily: "var(--font-header)",
        fontSize: 13,
      }}
    >
      Sign out
    </button>
  );
}
