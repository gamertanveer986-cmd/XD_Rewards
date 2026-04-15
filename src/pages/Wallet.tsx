import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import AppLayout from "@/components/AppLayout";
import { Wallet as WalletIcon, Gift, Video, Users, ArrowUpRight, ArrowDownRight } from "lucide-react";
import Disclaimer from "@/components/Disclaimer";
import XDCoin from "@/components/XDCoin";

interface Transaction {
  id: string;
  amount: number;
  transaction_type: string;
  description: string | null;
  created_at: string;
}

const Wallet = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      
      const [profileRes, txRes] = await Promise.all([
        supabase.from("user_profiles").select("*").eq("user_id", session.user.id).single(),
        supabase.from("transactions").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(20),
      ]);
      setProfile(profileRes.data);
      setTransactions(txRes.data || []);
      setLoading(false);
    };
    checkAuth();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalCoins = Math.floor((profile?.total_earnings || 0) * 100);
  const redeemableCoins = Math.floor((profile?.withdrawable_balance || 0) * 100);
  const bonusCoins = Math.floor((profile?.non_withdrawable_balance || 0) * 100);
  const referralCoins = (profile?.referrals_count || 0) * 500;

  return (
    <AppLayout title="XD Coin Wallet">
      <div className="px-4 py-4 space-y-4">
        {/* Balance Card */}
        <Card className="p-6 bg-gradient-to-br from-primary/20 via-card to-card border-primary/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -mr-10 -mt-10" />
          <div className="relative z-10 text-center">
            <XDCoin size="xl" className="mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-1">Total XD Coins</p>
            <p className="text-5xl font-bold text-success mb-1">{totalCoins.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mb-2">Entertainment coins (in-app reward value only)</p>
            <p className="text-xs text-muted-foreground">Redeemable: {redeemableCoins.toLocaleString()} XD Coins</p>
          </div>
        </Card>

        {/* Coin Value Info */}
        <Card className="p-3 bg-primary/10 border-primary/30">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Conversion Rate:</span>
            <span className="font-bold">1000 XD Coins = 10 value</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-muted-foreground">Min. Withdrawal:</span>
            <span className="font-bold">5000 XD Coins (50 value)</span>
          </div>
        </Card>

        {/* Coins Breakdown */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground px-1">XD Coins Breakdown</h2>
          <Card className="divide-y divide-border/50">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Gift className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Welcome Bonus</p>
                  <p className="text-xs text-muted-foreground">10 value bonus</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <XDCoin size="sm" />
                <p className="font-semibold text-primary">{bonusCoins.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                  <Video className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="font-medium text-sm">Task Rewards</p>
                  <p className="text-xs text-muted-foreground">From completing tasks</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <XDCoin size="sm" />
                <p className="font-semibold text-success">{redeemableCoins.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="font-medium text-sm">Referral Bonus</p>
                  <p className="text-xs text-muted-foreground">{profile?.referrals_count || 0} friends (5 value each)</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <XDCoin size="sm" />
                <p className="font-semibold text-accent">{referralCoins.toLocaleString()}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground px-1">Recent Activity</h2>
          {transactions.length === 0 ? (
            <Card className="p-6 bg-card border-border/50">
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <WalletIcon className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No activity yet</p>
                <p className="text-xs text-muted-foreground mt-1">Start completing tasks to collect XD Coins!</p>
              </div>
            </Card>
          ) : (
            <Card className="divide-y divide-border/50">
              {transactions.map((tx) => {
                const isPositive = tx.amount > 0;
                return (
                  <div key={tx.id} className="flex items-center gap-3 p-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isPositive ? "bg-success/20" : "bg-destructive/20"}`}>
                      {isPositive ? (
                        <ArrowDownRight className="w-4 h-4 text-success" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4 text-destructive" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{tx.description || tx.transaction_type}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <XDCoin size="sm" />
                      <span className={`text-xs font-bold ${isPositive ? "text-success" : "text-destructive"}`}>
                        {isPositive ? "+" : ""}{Math.floor(Math.abs(tx.amount) * 100)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </Card>
          )}
        </div>

        <Disclaimer />
      </div>
    </AppLayout>
  );
};

export default Wallet;
