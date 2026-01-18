import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import AppLayout from "@/components/AppLayout";
import { Wallet as WalletIcon, Gift, Video, Users } from "lucide-react";
import Disclaimer from "@/components/Disclaimer";
import XDCoin from "@/components/XDCoin";

const Wallet = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      
      const { data } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .single();
      setProfile(data);
      setLoading(false);
    };
    checkAuth();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Convert balances to XD Coins (multiply by 100 for display)
  const totalCoins = Math.floor((profile?.total_earnings || 0) * 100);
  const redeemableCoins = Math.floor((profile?.withdrawable_balance || 0) * 100);
  const bonusCoins = Math.floor((profile?.non_withdrawable_balance || 0) * 100);
  const referralCoins = (profile?.referrals_count || 0) * 500;

  // Value conversion: 1000 XD Coins = 10 value
  const totalValue = (totalCoins / 100).toFixed(1);

  return (
    <AppLayout title="XD Coin Wallet">
      <div className="px-4 py-4 space-y-4">
        {/* Balance Card */}
        <Card className="p-6 bg-gradient-to-br from-primary/20 via-card to-card border-primary/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -mr-10 -mt-10" />
          <div className="relative z-10 text-center">
            <XDCoin size="xl" className="mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-1">Total XD Coins</p>
            <p className="text-5xl font-bold text-success mb-1">
              {totalCoins.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mb-2">
              ≈ {totalValue} value
            </p>
            <p className="text-xs text-muted-foreground">
              Redeemable: {redeemableCoins.toLocaleString()} XD Coins
            </p>
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

        {/* Coins Info */}
        <Card className="p-4 bg-card border-border/50">
          <h3 className="font-semibold text-sm mb-3">About XD Coins</h3>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>1000 XD Coins = 10 value</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>Minimum withdrawal: 50 value (5000 XD Coins)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>Sign-up bonus: 10 value (1000 XD Coins)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>Referral bonus: 5 value (500 XD Coins)</span>
            </div>
          </div>
        </Card>

        {/* Transaction History */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground px-1">Recent Activity</h2>
          <Card className="p-6 bg-card border-border/50">
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <WalletIcon className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No activity yet</p>
              <p className="text-xs text-muted-foreground mt-1">Start completing tasks to collect XD Coins!</p>
            </div>
          </Card>
        </div>

        {/* Disclaimer */}
        <Disclaimer />
      </div>
    </AppLayout>
  );
};

export default Wallet;
