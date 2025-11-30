import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const Leaderboard = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };
    checkAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gradient-red glow-red">Leaderboard</h1>
            <p className="text-muted-foreground">Top earners this month</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>

        <Card className="p-6 card-glow border-primary/20 bg-card/90">
          <div className="text-center py-12 text-muted-foreground space-y-4">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-xl font-semibold">Coming Soon</h3>
            <p>The leaderboard will show top earners once more users join the platform.</p>
            <p className="text-sm">Auto-refreshes every 24 hours</p>
          </div>
        </Card>

        <div className="grid md:grid-cols-3 gap-4">
          <Card className="p-6 card-glow border-primary/20 bg-card/90 text-center">
            <div className="text-4xl mb-2">🥇</div>
            <p className="text-sm text-muted-foreground">Top Earner</p>
            <p className="text-2xl font-bold text-primary mt-2">Coming Soon</p>
          </Card>
          
          <Card className="p-6 card-glow border-primary/20 bg-card/90 text-center">
            <div className="text-4xl mb-2">🎯</div>
            <p className="text-sm text-muted-foreground">Your Rank</p>
            <p className="text-2xl font-bold mt-2">-</p>
          </Card>
          
          <Card className="p-6 card-glow border-primary/20 bg-card/90 text-center">
            <div className="text-4xl mb-2">📊</div>
            <p className="text-sm text-muted-foreground">Total Users</p>
            <p className="text-2xl font-bold mt-2">Growing</p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
