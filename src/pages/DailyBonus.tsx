import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import DailyRewards from "@/components/DailyRewards";
import Disclaimer from "@/components/Disclaimer";
import GuestBanner from "@/components/GuestBanner";
import { useGuest } from "@/contexts/GuestContext";

const DailyBonus = () => {
  const navigate = useNavigate();
  const { isGuest } = useGuest();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session && !isGuest) { navigate("/auth"); return; }
      if (isGuest) { setLoading(false); return; }
      setUser(session.user);
      setLoading(false);
    };
    checkAuth();
  }, [navigate, isGuest]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AppLayout title="Daily Bonus">
      <GuestBanner />
      <div className="px-4 py-4 space-y-4">
        {user ? (
          <DailyRewards userId={user.id} />
        ) : (
          <Card className="p-5 bg-card border-border/50 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
              <Gift className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Login to claim your daily bonus</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Build a 7-day streak and earn up to 70 XD Coins every day.
              </p>
            </div>
            <Button onClick={() => navigate("/auth")} className="w-full font-semibold">
              Login / Sign Up
            </Button>
          </Card>
        )}

        
        {/* How Streaks Work */}
        <Card className="p-4 bg-card border-border/50">
          <h3 className="text-sm font-semibold mb-3">How Streaks Work</h3>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-success" />
              <span>Claim your daily bonus every 24 hours</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-warning" />
              <span>Each consecutive day increases your reward</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>Day 7 gives the maximum bonus of 70 XD Coins</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
              <span>Missing a day resets your streak to Day 1</span>
            </div>
          </div>
        </Card>

        <Disclaimer variant="compact" />
      </div>
    </AppLayout>
  );
};

export default DailyBonus;
