import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface BotSettings {
  id: string;
  is_enabled: boolean;
  config_json: any;
  updated_at: string;
}

interface Alert {
  id: string;
  category: string;
  severity: string;
  title: string;
  details: string;
  ai_reasoning: string | null;
  user_id: string | null;
  action_taken: string;
  metadata: any;
  status: string;
  created_at: string;
}

interface Ban {
  id: string;
  user_id: string;
  reason: string;
  evidence: any;
  banned_by: string;
  is_active: boolean;
  created_at: string;
}

const severityColor = (s: string) =>
  s === "critical" ? "text-destructive" : s === "high" ? "text-primary" : s === "medium" ? "text-warning" : "text-muted-foreground";

const AdminAIBot = () => {
  const [settings, setSettings] = useState<BotSettings | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [bans, setBans] = useState<Ban[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [filter, setFilter] = useState<"all" | "fraud" | "bug" | "setting">("all");

  const load = async () => {
    const [{ data: s }, { data: a }, { data: b }] = await Promise.all([
      supabase.from("ai_bot_settings").select("*").eq("setting_key", "guardian").maybeSingle(),
      supabase.from("ai_bot_alerts").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("user_bans").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    setSettings(s as any);
    setAlerts((a as any) ?? []);
    setBans((b as any) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const cfg = settings?.config_json ?? {};

  const patchConfig = (patch: Record<string, unknown>) => {
    if (!settings) return;
    setSettings({ ...settings, config_json: { ...cfg, ...patch } });
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase
      .from("ai_bot_settings")
      .update({ is_enabled: settings.is_enabled, config_json: settings.config_json })
      .eq("id", settings.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("AI Guardian settings saved");
  };

  const runScan = async () => {
    setScanning(true);
    const { data, error } = await supabase.functions.invoke("ai-guardian", { body: {} });
    setScanning(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if ((data as any)?.error) {
      toast.error((data as any).error);
      return;
    }
    const r = data as any;
    toast.success(`Scan complete — ${r.scanned} users checked, ${r.findings} findings, ${r.bans} banned`);
    load();
  };

  const liftBan = async (banId: string) => {
    const { data, error } = await supabase.rpc("admin_lift_ban", { p_ban_id: banId });
    if (error || !(data as any)?.success) {
      toast.error(error?.message ?? (data as any)?.message ?? "Failed");
      return;
    }
    toast.success("Ban lifted");
    load();
  };

  const resolveAlert = async (id: string) => {
    await supabase.from("ai_bot_alerts").update({ status: "resolved" }).eq("id", id);
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status: "resolved" } : a)));
  };

  if (loading) return <p className="text-xs text-muted-foreground">Loading AI Guardian…</p>;
  if (!settings) return <p className="text-xs text-muted-foreground">AI Guardian is not configured.</p>;

  const rules: string[] = Array.isArray(cfg.rules) ? cfg.rules : [];
  const shown = alerts.filter((a) => filter === "all" || a.category === filter);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="border border-border rounded p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">AI Guardian Bot</p>
            <p className="text-[10px] text-muted-foreground">
              Monitors unfair earning, auto-bans cheaters and reports app bugs.
              {cfg.last_scan_at ? ` Last scan: ${new Date(cfg.last_scan_at).toLocaleString()}` : " Never scanned."}
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={settings.is_enabled}
              onChange={(e) => setSettings({ ...settings, is_enabled: e.target.checked })}
            />
            Enabled
          </label>
        </div>
        {cfg.last_summary && <p className="text-[11px] text-muted-foreground italic">{cfg.last_summary}</p>}
        <div className="flex gap-2">
          <button
            onClick={runScan}
            disabled={scanning}
            className="px-3 h-8 bg-primary text-primary-foreground text-xs rounded disabled:opacity-50"
          >
            {scanning ? "Scanning…" : "Run Scan Now"}
          </button>
          <button onClick={saveSettings} disabled={saving} className="px-3 h-8 border border-border text-xs rounded">
            {saving ? "Saving…" : "Save Settings"}
          </button>
        </div>
      </div>

      {/* Config */}
      <div className="border border-border rounded p-3 space-y-3">
        <p className="text-xs font-medium uppercase text-muted-foreground">Bot Configuration</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { key: "auto_ban", label: "Auto-ban cheaters" },
            { key: "detect_bugs", label: "Detect app bugs" },
            { key: "auto_fix_settings", label: "Suggest setting fixes" },
            { key: "notify_admin", label: "Notify admin" },
          ].map((t) => (
            <label key={t.key} className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={cfg[t.key] !== false}
                onChange={(e) => patchConfig({ [t.key]: e.target.checked })}
              />
              {t.label}
            </label>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">Min confidence to ban (%)</p>
            <Input
              type="number"
              className="h-8 text-xs"
              value={cfg.min_confidence_to_ban ?? 80}
              onChange={(e) => patchConfig({ min_confidence_to_ban: Number(e.target.value) })}
            />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">Scan window (hours)</p>
            <Input
              type="number"
              className="h-8 text-xs"
              value={cfg.scan_window_hours ?? 24}
              onChange={(e) => patchConfig({ scan_window_hours: Number(e.target.value) })}
            />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">Max users per scan</p>
            <Input
              type="number"
              className="h-8 text-xs"
              value={cfg.max_users_per_scan ?? 40}
              onChange={(e) => patchConfig({ max_users_per_scan: Number(e.target.value) })}
            />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">Sensitivity</p>
            <select
              className="w-full h-8 text-xs bg-background border border-border rounded px-2"
              value={cfg.sensitivity ?? "balanced"}
              onChange={(e) => patchConfig({ sensitivity: e.target.value })}
            >
              <option value="lenient">Lenient</option>
              <option value="balanced">Balanced</option>
              <option value="strict">Strict</option>
            </select>
          </div>
        </div>

        <div>
          <p className="text-[10px] text-muted-foreground mb-1">AI model</p>
          <select
            className="w-full h-8 text-xs bg-background border border-border rounded px-2"
            value={cfg.model ?? "google/gemini-3.5-flash"}
            onChange={(e) => patchConfig({ model: e.target.value })}
          >
            <option value="google/gemini-3.5-flash">Gemini 3.5 Flash (fast, default)</option>
            <option value="google/gemini-3.6-flash">Gemini 3.6 Flash</option>
            <option value="google/gemini-2.5-pro">Gemini 2.5 Pro (deepest analysis)</option>
            <option value="google/gemini-2.5-flash-lite">Gemini 2.5 Flash Lite (cheapest)</option>
          </select>
        </div>

        <div>
          <p className="text-[10px] text-muted-foreground mb-1">Fraud rules (one per line)</p>
          <Textarea
            className="text-xs min-h-[120px]"
            value={rules.join("\n")}
            onChange={(e) => patchConfig({ rules: e.target.value.split("\n").filter((r) => r.trim()) })}
          />
        </div>

        <div>
          <p className="text-[10px] text-muted-foreground mb-1">Custom instructions for the bot</p>
          <Textarea
            className="text-xs min-h-[70px]"
            placeholder="e.g. Never ban accounts older than 6 months without critical evidence."
            value={cfg.custom_instructions ?? ""}
            onChange={(e) => patchConfig({ custom_instructions: e.target.value })}
          />
        </div>
      </div>

      {/* Alerts */}
      <div className="border border-border rounded p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase text-muted-foreground">Bot Reports ({shown.length})</p>
          <div className="flex gap-2">
            {(["all", "fraud", "bug", "setting"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-[10px] capitalize ${filter === f ? "text-primary font-semibold" : "text-muted-foreground"}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        {shown.length === 0 ? (
          <p className="text-xs text-muted-foreground">No reports yet. Run a scan.</p>
        ) : (
          <div className="space-y-2">
            {shown.map((a) => (
              <div key={a.id} className={`border border-border rounded p-2 ${a.status === "resolved" ? "opacity-50" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold">
                      <span className={severityColor(a.severity)}>[{a.severity}]</span> {a.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{a.details}</p>
                    {a.ai_reasoning && <p className="text-[10px] text-muted-foreground mt-1 italic">{a.ai_reasoning}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {a.category} · {a.action_taken === "auto_banned" ? "AUTO-BANNED" : a.action_taken}
                      {a.user_id ? ` · user ${a.user_id.slice(0, 8)}` : ""}
                      {a.metadata?.confidence != null ? ` · ${a.metadata.confidence}% confidence` : ""}
                      {" · "}
                      {new Date(a.created_at).toLocaleString()}
                    </p>
                  </div>
                  {a.status !== "resolved" && (
                    <button onClick={() => resolveAlert(a.id)} className="text-[10px] text-primary hover:underline shrink-0">
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bans */}
      <div className="border border-border rounded p-3 space-y-2">
        <p className="text-xs font-medium uppercase text-muted-foreground">Banned Accounts ({bans.filter((b) => b.is_active).length} active)</p>
        {bans.length === 0 ? (
          <p className="text-xs text-muted-foreground">No bans.</p>
        ) : (
          <div className="space-y-1">
            {bans.map((b) => (
              <div key={b.id} className="flex items-start justify-between gap-2 border-b border-border pb-1">
                <div className="min-w-0">
                  <p className="text-xs">
                    {b.user_id.slice(0, 8)} — {b.reason}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    by {b.banned_by} · {new Date(b.created_at).toLocaleString()} · {b.is_active ? "ACTIVE" : "lifted"}
                  </p>
                </div>
                {b.is_active && (
                  <button onClick={() => liftBan(b.id)} className="text-[10px] text-primary hover:underline shrink-0">
                    Lift ban
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAIBot;
