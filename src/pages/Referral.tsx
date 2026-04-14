import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/AppLayout";
import XDCoin from "@/components/XDCoin";
import Disclaimer from "@/components/Disclaimer";
import GuestBanner from "@/components/GuestBanner";
import { useGuest } from "@/contexts/GuestContext";
import { toast } from "sonner";
import { Copy, Share2, Users, TrendingUp, Gift } from "lucide-react";

const Referral = () => {
  const navigate = useNavigate();
  const { isGuest } = useGuest();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session && !isGuest) { navigate("/auth"); return; }
      if (isGuest) { setLoading(false); return; }
      const { data } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .single();
      setProfile(data);
      setLoading(false);
    };
    checkAuth();
  }, [navigate, isGuest]);

  const copyCode = () => {
    if (profile?.referral_code) {
      navigator.clipboard.writeText(profile.referral_code);
      toast.success("Referral code copied!");
    }
  };

  const shareCode = () => {
    if (profile?.referral_code) {
      const text = `Join XD Rewards and collect XD Coins! Use my referral code: ${profile.referral_code}`;
      if (navigator.share) {
        navigator.share({ text });
      } else {
        navigator.clipboard.writeText(text);
        toast.success("Share text copied!");
      }
    }
  };

  const referralEarnings = (profile?.referrals_count || 0) * 500;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AppLayout title="Referral Program">
      <div className="px-4 py-4 space-y-4">
        {/* Referral Code Card */}
        <Card className="p-6 bg-gradient-to-br from-primary/20 via-card to-card border-primary/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -mr-10 -mt-10" />
          <div className="relative z-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground mb-2">Your Referral Code</p>
            <p className="text-3xl font-black tracking-[0.3em] text-primary mb-4">
              {profile?.referral_code || "—"}
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={copyCode} className="gap-2">
                <Copy className="w-4 h-4" />
                Copy Code
              </Button>
              <Button onClick={shareCode} className="gap-2 bg-primary hover:bg-primary/90">
                <Share2 className="w-4 h-4" />
                Share
              </Button>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 bg-card border-border/50 text-center">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center mx-auto mb-2">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <p className="text-2xl font-bold">{profile?.referrals_count || 0}</p>
            <p className="text-[10px] text-muted-foreground">Total Referrals</p>
          </Card>
          <Card className="p-4 bg-card border-border/50 text-center">
            <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center mx-auto mb-2">
              <XDCoin size="md" />
            </div>
            <p className="text-2xl font-bold text-success">{referralEarnings}</p>
            <p className="text-[10px] text-muted-foreground">XD Coins Earned</p>
          </Card>
        </div>

        {/* How it works */}
        <Card className="p-4 bg-card border-border/50">
          <h3 className="text-sm font-semibold mb-3">How Referrals Work</h3>
          <div className="space-y-3">
            {[
              { step: "1", text: "Share your code with friends", icon: Share2 },
              { step: "2", text: "Friend signs up using your code", icon: Users },
              { step: "3", text: "You get 500 XD Coins (5 value)", icon: Gift },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">{item.step}</span>
                </div>
                <p className="text-sm text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Referral Bonus */}
        <Card className="p-4 bg-gradient-to-r from-success/10 to-transparent border-success/20">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-success" />
            <div>
              <p className="text-sm font-semibold">Unlimited Referrals</p>
              <p className="text-xs text-muted-foreground">No cap on referral earnings. Keep sharing!</p>
            </div>
          </div>
        </Card>

        <Disclaimer variant="compact" />
      </div>
    </AppLayout>
  );
};

export default Referral;
