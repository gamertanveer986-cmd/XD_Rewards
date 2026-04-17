import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import XDCoin from "@/components/XDCoin";

interface ProofEntry {
  id: string;
  name: string;
  reward: string;
  value: number;
  date: string;
}

const maskName = (name?: string | null, fallbackEmail?: string | null) => {
  const raw = (name || fallbackEmail?.split("@")[0] || "User").trim();
  if (raw.length <= 2) return raw[0] + "***";
  return raw.slice(0, 2) + "***" + raw.slice(-1);
};

const WithdrawProof = () => {
  const [proofs, setProofs] = useState<ProofEntry[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [recentRes, allRes] = await Promise.all([
        supabase
          .from("gift_card_purchases")
          .select("id, amount_paid, status, processed_at, created_at, email, product:gift_card_products(name)")
          .eq("status", "completed")
          .order("processed_at", { ascending: false, nullsFirst: false })
          .limit(8),
        supabase
          .from("gift_card_purchases")
          .select("amount_paid", { count: "exact" })
          .eq("status", "completed"),
      ]);

      const list: ProofEntry[] = (recentRes.data || []).map((p: any) => ({
        id: p.id,
        name: maskName(null, p.email),
        reward: p.product?.name || "Reward",
        value: Math.floor((p.amount_paid || 0)),
        date: p.processed_at || p.created_at,
      }));
      setProofs(list);

      const sum = (allRes.data || []).reduce((acc: number, r: any) => acc + Number(r.amount_paid || 0), 0);
      setTotalPaid(sum);
      setTotalCount(allRes.count || 0);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-success" />
          Withdraw Proof
        </h3>
        <span className="text-[10px] text-muted-foreground">Recently approved</span>
      </div>

      {/* Total Paid Out Counter */}
      <Card className="p-4 bg-gradient-to-br from-success/15 via-card to-card border-success/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-success/10 rounded-full blur-2xl -mr-8 -mt-8" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total Paid Out</p>
            <div className="flex items-center gap-1.5 mt-1">
              <XDCoin size="sm" />
              <p className="text-2xl font-bold text-success">
                {loading ? "—" : (totalPaid * 100).toLocaleString()}
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {loading ? "Loading…" : `${totalCount.toLocaleString()} approved redemption${totalCount === 1 ? "" : "s"} to date`}
            </p>
          </div>
          <div className="w-12 h-12 rounded-full bg-success/15 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6 text-success" />
          </div>
        </div>
      </Card>

      {loading ? (
        <Card className="p-6 text-center bg-card border-border/50">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        </Card>
      ) : proofs.length === 0 ? (
        <Card className="p-5 bg-card border-border/50 text-center">
          <p className="text-xs text-muted-foreground">
            No approved withdrawals to show yet. Be one of the first!
          </p>
        </Card>
      ) : (
        <Card className="divide-y divide-border/50 bg-card border-border/50 overflow-hidden">
          {proofs.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-3">
              <div className="w-9 h-9 rounded-full bg-success/15 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-success" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">
                  {p.name} <span className="text-muted-foreground font-normal">redeemed</span> {p.reward}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(p.date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <XDCoin size="sm" />
                <span className="text-xs font-bold text-success">{(p.value * 100).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </Card>
      )}

      <p className="text-[10px] text-muted-foreground text-center px-2">
        Names are partially masked for privacy. Proof entries are real approved redemptions from our database.
      </p>
    </div>
  );
};

export default WithdrawProof;
