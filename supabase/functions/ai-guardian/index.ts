import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { generateText, Output, NoObjectGeneratedError } from "npm:ai";
import { z } from "npm:zod";
import { createLovableAiGatewayProvider } from "../_shared/ai-gateway.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const findingsSchema = z.object({
  findings: z.array(
    z.object({
      category: z.string().describe("one of: fraud, bug, setting"),
      severity: z.string().describe("one of: low, medium, high, critical"),
      user_id: z.string().describe("affected user id, or empty string for app-wide findings"),
      title: z.string(),
      details: z.string().describe("plain explanation an admin can read"),
      reasoning: z.string().describe("evidence and numbers that led to this conclusion"),
      confidence: z.number().describe("0-100"),
      recommend_ban: z.boolean(),
      suggested_setting_fix: z.string().describe("empty string if none"),
    }),
  ),
  summary: z.string(),
});

async function isAdminRequest(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return false;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return false;
  const { data: role } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id)
    .eq("role", "admin")
    .maybeSingle();
  return !!role;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const cronSecret = (body as { cron_secret?: string }).cron_secret;

    // --- Load bot configuration -------------------------------------------
    const { data: settings } = await admin
      .from("ai_bot_settings")
      .select("*")
      .eq("setting_key", "guardian")
      .maybeSingle();

    const storedCronSecret = String((settings?.config_json ?? {}).cron_secret ?? "");
    const authorized =
      (!!cronSecret && (cronSecret === SERVICE_ROLE || (!!storedCronSecret && cronSecret === storedCronSecret))) ||
      (await isAdminRequest(req));
    if (!authorized) return json({ error: "Unauthorized" }, 401);

    if (!settings || !settings.is_enabled) {
      return json({ success: false, message: "AI Guardian is disabled" });
    }


    const cfg = (settings.config_json ?? {}) as Record<string, unknown>;
    const autoBan = cfg.auto_ban !== false;
    const minConfidence = Number(cfg.min_confidence_to_ban ?? 80);
    const windowHours = Number(cfg.scan_window_hours ?? 24);
    const maxUsers = Number(cfg.max_users_per_scan ?? 40);
    const model = String(cfg.model ?? "google/gemini-3.5-flash");
    const rules = Array.isArray(cfg.rules) ? (cfg.rules as string[]) : [];
    const customInstructions = String(cfg.custom_instructions ?? "");
    const detectBugs = cfg.detect_bugs !== false;
    const notifyAdmin = cfg.notify_admin !== false;

    const since = new Date(Date.now() - windowHours * 3600_000).toISOString();

    // --- Gather activity evidence -----------------------------------------
    const [{ data: adViews }, { data: profiles }, { data: txs }, { data: spins }, { data: devices }, { data: activeBans }] =
      await Promise.all([
        admin.from("ad_views").select("user_id, ad_duration, earnings, completed, watched_at").gte("watched_at", since).limit(4000),
        admin.from("user_profiles").select("user_id, display_name, total_earnings, withdrawable_balance, non_withdrawable_balance, ads_watched, referrals_count, created_at").limit(1000),
        admin.from("transactions").select("user_id, transaction_type, amount, created_at").gte("created_at", since).limit(4000),
        admin.from("spin_history").select("user_id, reward_amount, spun_at").gte("spun_at", since).limit(2000),
        admin.from("device_registrations").select("user_id, device_id_hash, platform").limit(2000),
        admin.from("user_bans").select("user_id").eq("is_active", true),
      ]);

    const bannedSet = new Set((activeBans ?? []).map((b) => b.user_id));
    const deviceCounts = new Map<string, string[]>();
    for (const d of devices ?? []) {
      const list = deviceCounts.get(d.device_id_hash) ?? [];
      list.push(d.user_id);
      deviceCounts.set(d.device_id_hash, list);
    }

    type Row = {
      user_id: string;
      display_name: string | null;
      ads_in_window: number;
      avg_ad_duration: number;
      min_gap_seconds: number | null;
      earnings_in_window: number;
      spins_in_window: number;
      total_earnings: number;
      referrals_count: number;
      account_age_hours: number;
      shared_device_accounts: number;
    };

    const byUser = new Map<string, Row>();
    for (const p of profiles ?? []) {
      if (bannedSet.has(p.user_id)) continue;
      const shared = (devices ?? [])
        .filter((d) => d.user_id === p.user_id)
        .reduce((acc, d) => Math.max(acc, (deviceCounts.get(d.device_id_hash) ?? []).length), 1);
      byUser.set(p.user_id, {
        user_id: p.user_id,
        display_name: p.display_name,
        ads_in_window: 0,
        avg_ad_duration: 0,
        min_gap_seconds: null,
        earnings_in_window: 0,
        spins_in_window: 0,
        total_earnings: Number(p.total_earnings ?? 0),
        referrals_count: Number(p.referrals_count ?? 0),
        account_age_hours: Math.round((Date.now() - new Date(p.created_at ?? Date.now()).getTime()) / 3600_000),
        shared_device_accounts: shared,
      });
    }

    const adsByUser = new Map<string, { durations: number[]; times: number[] }>();
    for (const a of adViews ?? []) {
      const entry = adsByUser.get(a.user_id) ?? { durations: [], times: [] };
      entry.durations.push(Number(a.ad_duration ?? 0));
      entry.times.push(new Date(a.watched_at as string).getTime());
      adsByUser.set(a.user_id, entry);
    }
    for (const [userId, entry] of adsByUser) {
      const row = byUser.get(userId);
      if (!row) continue;
      row.ads_in_window = entry.durations.length;
      row.avg_ad_duration = Math.round(entry.durations.reduce((a, b) => a + b, 0) / entry.durations.length);
      const sorted = [...entry.times].sort((a, b) => a - b);
      let minGap: number | null = null;
      for (let i = 1; i < sorted.length; i++) {
        const gap = (sorted[i] - sorted[i - 1]) / 1000;
        if (minGap === null || gap < minGap) minGap = gap;
      }
      row.min_gap_seconds = minGap === null ? null : Math.round(minGap);
    }
    for (const t of txs ?? []) {
      const row = byUser.get(t.user_id);
      if (row) row.earnings_in_window += Number(t.amount ?? 0);
    }
    for (const s of spins ?? []) {
      const row = byUser.get(s.user_id);
      if (row) row.spins_in_window += 1;
    }

    // Only send the most suspicious-looking users to the model.
    const candidates = [...byUser.values()]
      .filter((r) => r.ads_in_window > 0 || r.earnings_in_window > 0 || r.shared_device_accounts > 1)
      .sort((a, b) => b.ads_in_window + b.earnings_in_window * 10 - (a.ads_in_window + a.earnings_in_window * 10))
      .slice(0, maxUsers);

    if (candidates.length === 0) {
      return json({ success: true, scanned: 0, findings: 0, message: "No activity to analyse" });
    }

    // --- Ask the AI --------------------------------------------------------
    const gateway = createLovableAiGatewayProvider(LOVABLE_API_KEY);
    const system = [
      "You are the AI Guardian of XD Rewards, a rewards app where users earn XD Coins by watching ads, daily streaks, spins and referrals.",
      "Economy: 1 ad = 0.10 value (10 XD Coins). 1000 XD Coins = 10 INR. Ads must be watched fully (about 15 seconds).",
      "Your job: detect users earning unfairly (bots, scripts, ad skipping, multi-accounting, fake referrals, impossible volumes) and, when confident, recommend an immediate ban.",
      detectBugs ? "Also report app or economy BUGS you can infer from the data (impossible balances, negative values, reward mismatches, broken streak/milestone data) with category 'bug'." : "",
      "You may also propose safe configuration fixes with category 'setting'.",
      "Fraud rules configured by the admin:",
      ...rules.map((r) => `- ${r}`),
      customInstructions ? `Extra admin instructions: ${customInstructions}` : "",
      "Be fair: normal active users are not fraudsters. Only set recommend_ban true when the evidence is strong, and always explain the exact numbers in reasoning. Keep confidence honest (0-100). Return an empty findings array when everything looks fine.",
    ]
      .filter(Boolean)
      .join("\n");

    let parsed: z.infer<typeof findingsSchema> = { findings: [], summary: "" };
    try {
      const { output } = await generateText({
        model: gateway(model),
        system,
        output: Output.object({ schema: findingsSchema }),
        prompt: `Analyse this activity from the last ${windowHours} hours and report findings as JSON.\n\n${JSON.stringify(candidates)}`,
      });
      parsed = output as z.infer<typeof findingsSchema>;
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        try {
          parsed = JSON.parse((error as { text?: string }).text ?? "{}");
        } catch {
          return json({ error: "AI returned malformed output" }, 502);
        }
      } else {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("429")) return json({ error: "AI rate limit reached, try again shortly" }, 429);
        if (message.includes("402")) return json({ error: "AI credits exhausted. Please add credits." }, 402);
        return json({ error: message }, 500);
      }
    }

    const findings = Array.isArray(parsed.findings) ? parsed.findings : [];

    // --- Act on findings ---------------------------------------------------
    let bans = 0;
    const alerts: Record<string, unknown>[] = [];

    for (const f of findings) {
      const confidence = Math.max(0, Math.min(100, Number(f.confidence ?? 0)));
      const userId = f.user_id && f.user_id.length === 36 ? f.user_id : null;
      let action = "reported";

      if (
        f.category === "fraud" &&
        f.recommend_ban &&
        autoBan &&
        userId &&
        confidence >= minConfidence &&
        !bannedSet.has(userId)
      ) {
        const { error: banError } = await admin.from("user_bans").insert({
          user_id: userId,
          reason: f.title,
          evidence: { details: f.details, reasoning: f.reasoning, confidence },
          banned_by: "ai_bot",
        });
        if (!banError) {
          bans += 1;
          bannedSet.add(userId);
          action = "auto_banned";
          await admin.from("user_profiles").update({ payment_status: "suspended" }).eq("user_id", userId);
        }
      }

      alerts.push({
        category: ["fraud", "bug", "setting"].includes(f.category) ? f.category : "fraud",
        severity: ["low", "medium", "high", "critical"].includes(f.severity) ? f.severity : "medium",
        title: f.title,
        details: f.details,
        ai_reasoning: f.reasoning,
        user_id: userId,
        action_taken: action,
        metadata: { confidence, suggested_setting_fix: f.suggested_setting_fix ?? "" },
      });
    }

    if (alerts.length > 0) {
      await admin.from("ai_bot_alerts").insert(alerts);
    }

    // --- Notify admins -----------------------------------------------------
    if (notifyAdmin && alerts.length > 0) {
      const { data: adminRoles } = await admin.from("user_roles").select("user_id").eq("role", "admin");
      const adminIds = (adminRoles ?? []).map((r) => r.user_id);
      if (adminIds.length > 0) {
        const { data: notif } = await admin
          .from("notifications")
          .insert({
            title: bans > 0 ? `AI Guardian banned ${bans} account(s)` : "AI Guardian report",
            message:
              (bans > 0
                ? `${bans} account(s) were automatically banned for unfair earning. `
                : "") + `${alerts.length} new finding(s) are waiting in the AI Bot panel.`,
          })
          .select("id")
          .maybeSingle();
        if (notif?.id) {
          await admin
            .from("user_notifications")
            .insert(adminIds.map((id) => ({ user_id: id, notification_id: notif.id })));
        }
      }
    }

    await admin
      .from("ai_bot_settings")
      .update({ config_json: { ...cfg, last_scan_at: new Date().toISOString(), last_summary: parsed.summary ?? "" } })
      .eq("setting_key", "guardian");

    return json({ success: true, scanned: candidates.length, findings: alerts.length, bans, summary: parsed.summary ?? "" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json({ error: message }, 500);
  }
});
