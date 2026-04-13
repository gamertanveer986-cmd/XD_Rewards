import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import XDCoin from "@/components/XDCoin";
import { ArrowUpRight, ArrowDownRight, Gift, Zap, Users, Star, Clock } from "lucide-react";

interface Transaction {
  id: string;
  amount: number;
  transaction_type: string;
  description: string | null;
  created_at: string;
}

interface RecentActivityProps {
  userId: string;
}

const typeConfig: Record<string, { icon: typeof Zap; color: string; bg: string }> = {
  ad_earnings: { icon: Zap, color: "text-success", bg: "bg-success/20" },
  daily_reward: { icon: Gift, color: "text-warning", bg: "bg-warning/20" },
  referral_bonus: { icon: Users, color: "text-primary", bg: "bg-primary/20" },
  bonus: { icon: Star, color: "text-yellow-500", bg: "bg-yellow-500/20" },
  task_bonus: { icon: Star, color: "text-primary", bg: "bg-primary/20" },
  spin_reward: { icon: Zap, color: "text-accent", bg: "bg-accent/20" },
  gift_card_redemption: { icon: Gift, color: "text-success", bg: "bg-success/20" },
  redemption: { icon: ArrowDownRight, color: "text-destructive", bg: "bg-destructive/20" },
  withdrawal: { icon: ArrowDownRight, color: "text-destructive", bg: "bg-destructive/20" },
};

const RecentActivity = ({ userId }: RecentActivityProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);
      setTransactions(data || []);
      setLoading(false);
    };
    fetch();
  }, [userId]);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (loading) {
    return (
      <Card className="p-4 bg-card border-border/50">
        <div className="flex items-center justify-center py-6">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Card>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card className="p-6 bg-card border-border/50 text-center">
        <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No activity yet</p>
        <p className="text-xs text-muted-foreground mt-1">Complete tasks to start earning!</p>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border/50 divide-y divide-border/30 overflow-hidden">
      {transactions.map((tx) => {
        const config = typeConfig[tx.transaction_type] || typeConfig.ad_earnings;
        const Icon = config.icon;
        const coins = Math.abs(Math.floor(tx.amount * 100));
        const isPositive = tx.amount > 0;

        return (
          <div key={tx.id} className="flex items-center gap-3 p-3.5 hover:bg-muted/20 transition-colors">
            <div className={`w-9 h-9 rounded-xl ${config.bg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-4 h-4 ${config.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{tx.description || tx.transaction_type}</p>
              <p className="text-[10px] text-muted-foreground">{formatTime(tx.created_at!)}</p>
            </div>
            <div className="flex items-center gap-1">
              <span className={`text-sm font-bold ${isPositive ? "text-success" : "text-destructive"}`}>
                {isPositive ? "+" : "-"}{coins}
              </span>
              <XDCoin size="sm" />
            </div>
          </div>
        );
      })}
    </Card>
  );
};

export default RecentActivity;
