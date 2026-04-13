import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import AppLayout from "@/components/AppLayout";
import DailyRewards from "@/components/DailyRewards";
import Disclaimer from "@/components/Disclaimer";

const DailyBonus = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      setUser(session.user);
      setLoading(false);
    };
    checkAuth();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AppLayout title="Daily Bonus">
      <div className="px-4 py-4 space-y-4">
        {user && (
          <DailyRewards userId={user.id} />
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
