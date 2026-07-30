import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShieldX } from "lucide-react";

/**
 * Blocks banned accounts from using the app.
 * The ban itself is decided server-side by the AI Guardian or an admin.
 */
const BannedGate = ({ children }: { children: React.ReactNode }) => {
  const [ban, setBan] = useState<{ reason: string; since: string } | null>(null);

  const check = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setBan(null); return; }
    const { data } = await supabase.rpc("is_current_user_banned");
    const result = data as any;
    if (result?.banned) setBan({ reason: result.reason, since: result.since });
    else setBan(null);
  };

  useEffect(() => {
    check();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => check());
    return () => subscription.unsubscribe();
  }, []);

  if (!ban) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-destructive/15 flex items-center justify-center mx-auto">
          <ShieldX className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-xl font-bold">Account Suspended</h1>
        <p className="text-sm text-muted-foreground">
          Our automated fairness system detected activity that breaks the earning rules, so this account has been suspended.
        </p>
        <div className="border border-border rounded p-3 text-left">
          <p className="text-[10px] uppercase text-muted-foreground">Reason</p>
          <p className="text-sm">{ban.reason}</p>
          <p className="text-[10px] text-muted-foreground mt-2">
            Suspended on {new Date(ban.since).toLocaleString()}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          If you believe this is a mistake, contact{" "}
          <a href="mailto:dxreward@gmail.com" className="text-primary-readable underline">dxreward@gmail.com</a>.
        </p>
        <button
          onClick={async () => { await supabase.auth.signOut(); window.location.href = "/auth"; }}
          className="w-full h-10 rounded bg-primary text-primary-foreground text-sm font-medium"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default BannedGate;
