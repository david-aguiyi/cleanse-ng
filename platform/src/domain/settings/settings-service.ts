import "server-only";
import { serviceClient } from "@/db/service-client";
import { AppError } from "@/http/errors";
import {
  DEFAULT_WHATSAPP_NUMBER,
  parseNigerianPhone,
  type FormattedPhone,
} from "./phone-format";

export interface SiteSettings {
  whatsapp: FormattedPhone;
  updatedAt?: string;
  updatedBy?: string | null;
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const fallback = parseNigerianPhone(DEFAULT_WHATSAPP_NUMBER)!;

  try {
    const { data, error } = await serviceClient()
      .from("site_settings")
      .select("key, value, updated_at, updated_by")
      .eq("key", "whatsapp_number")
      .maybeSingle();

    if (error || !data || !data.value) {
      return { whatsapp: fallback };
    }

    const rawVal = typeof data.value === "string" ? data.value : JSON.stringify(data.value).replace(/"/g, "");
    const parsed = parseNigerianPhone(rawVal);
    return {
      whatsapp: parsed ?? fallback,
      updatedAt: data.updated_at,
      updatedBy: data.updated_by,
    };
  } catch {
    return { whatsapp: fallback };
  }
}

export async function updateWhatsappSetting(
  inputNumber: string,
  adminUserId?: string
): Promise<SiteSettings> {
  const parsed = parseNigerianPhone(inputNumber);
  if (!parsed) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Please enter a valid Nigerian phone number (e.g. 09130663739 or +234 913 066 3739).",
      400
    );
  }

  const { error } = await serviceClient()
    .from("site_settings")
    .upsert(
      {
        key: "whatsapp_number",
        value: parsed.raw,
        updated_at: new Date().toISOString(),
        updated_by: adminUserId ?? null,
      },
      { onConflict: "key" }
    );

  if (error) {
    throw new AppError("INTERNAL_ERROR", `Failed to save setting: ${error.message}`, 500);
  }

  return {
    whatsapp: parsed,
    updatedAt: new Date().toISOString(),
    updatedBy: adminUserId ?? null,
  };
}
