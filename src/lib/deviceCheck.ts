import { Capacitor } from "@capacitor/core";
import { Device } from "@capacitor/device";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hash a string using SHA-256 (browser/native WebCrypto).
 */
async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface DeviceCheckResult {
  success: boolean;
  code?: string;
  message?: string;
  skipped?: boolean;
}

/**
 * Enforce one-device-one-account on native mobile (Capacitor).
 * On web it is a no-op (returns success: true, skipped: true).
 *
 * Call this AFTER a successful signIn/signUp while the session is active.
 * If it returns success=false, sign the user out immediately.
 */
export async function checkAndRegisterDevice(): Promise<DeviceCheckResult> {
  // Web is allowed freely
  if (!Capacitor.isNativePlatform()) {
    return { success: true, skipped: true };
  }

  try {
    const info = await Device.getId();
    // identifier is the stable hardware/install ID
    const rawId = (info as any).identifier ?? (info as any).uuid ?? "";
    if (!rawId) {
      return { success: false, message: "Could not read device identifier." };
    }

    const platform = Capacitor.getPlatform();
    // Salt the hash so it's not a globally-predictable value
    const hash = await sha256(`xd-rewards:${platform}:${rawId}`);

    const { data, error } = await supabase.rpc("check_and_register_device", {
      p_device_id_hash: hash,
      p_platform: platform,
    });

    if (error) {
      return { success: false, message: error.message };
    }

    const result = data as { success: boolean; code?: string; message?: string };
    return result;
  } catch (e: any) {
    return { success: false, message: e?.message ?? "Device verification failed" };
  }
}
