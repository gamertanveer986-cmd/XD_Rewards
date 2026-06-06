import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Smartphone, Unlink, RefreshCw } from "lucide-react";

interface DeviceRegistration {
  id: string;
  user_id: string;
  device_id_hash: string;
  platform: string;
  created_at: string;
}

interface ProfileLite {
  user_id: string;
  display_name: string | null;
  username: string | null;
}

const AdminDeviceRegistrations = () => {
  const [rows, setRows] = useState<DeviceRegistration[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("device_registrations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    setRows(data || []);

    const ids = Array.from(new Set((data || []).map((r) => r.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("user_profiles")
        .select("user_id, display_name, username")
        .in("user_id", ids);
      const map: Record<string, ProfileLite> = {};
      (profs || []).forEach((p: any) => (map[p.user_id] = p));
      setProfiles(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const unlink = async (id: string) => {
    if (!confirm("Unlink this device? The phone will be able to register a new account, and the user will be able to sign in from a new device.")) return;
    const { data, error } = await supabase.rpc("admin_unlink_device", { p_registration_id: id });
    if (error) {
      toast.error(error.message);
      return;
    }
    const res = data as { success: boolean; message?: string };
    if (res?.success) {
      toast.success("Device unlinked");
      load();
    } else {
      toast.error(res?.message || "Failed to unlink");
    }
  };

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const p = profiles[r.user_id];
    return (
      r.user_id.toLowerCase().includes(q) ||
      r.device_id_hash.toLowerCase().includes(q) ||
      (p?.display_name || "").toLowerCase().includes(q) ||
      (p?.username || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">Device Registrations</h2>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        One device can register one account. Unlink a device to allow the phone to be used by a new account, or to let the user sign in from a different device.
      </p>

      <input
        type="text"
        placeholder="Search by user, name, or device hash..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-xs"
      />

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-2 py-2">User</th>
                <th className="px-2 py-2">Platform</th>
                <th className="px-2 py-2">Device ID (hash)</th>
                <th className="px-2 py-2">Registered</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-2 py-6 text-center text-muted-foreground">
                    {loading ? "Loading..." : "No device registrations yet."}
                  </td>
                </tr>
              )}
              {filtered.map((r) => {
                const p = profiles[r.user_id];
                return (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-2 py-2">
                      <div className="font-medium">{p?.display_name || p?.username || "—"}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{r.user_id.slice(0, 8)}...</div>
                    </td>
                    <td className="px-2 py-2 capitalize">{r.platform}</td>
                    <td className="px-2 py-2 font-mono text-[10px]">{r.device_id_hash.slice(0, 16)}...</td>
                    <td className="px-2 py-2 text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button
                        onClick={() => unlink(r.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-destructive/20 text-destructive hover:bg-destructive/30 text-[10px]"
                      >
                        <Unlink className="w-3 h-3" />
                        Unlink
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDeviceRegistrations;
