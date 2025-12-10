import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import AppLayout from "@/components/AppLayout";
import { Trophy, Medal, Crown, TrendingUp, Users, Target } from "lucide-react";

const Leaderboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
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

  return (
    <AppLayout title="Leaderboard">
      <div className="px-4 py-4 space-y-4">
        {/* Header Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 bg-gradient-to-br from-yellow-500/20 to-card border-yellow-500/30">
            <div className="flex flex-col items-center text-center">
              <Crown className="w-6 h-6 text-yellow-500 mb-1" />
              <p className="text-xs text-muted-foreground">Top Earner</p>
              <p className="text-sm font-bold text-yellow-500 mt-1">Soon</p>
            </div>
          </Card>
          
          <Card className="p-3 bg-card border-border/50">
            <div className="flex flex-col items-center text-center">
              <Target className="w-6 h-6 text-primary mb-1" />
              <p className="text-xs text-muted-foreground">Your Rank</p>
              <p className="text-sm font-bold mt-1">—</p>
            </div>
          </Card>
          
          <Card className="p-3 bg-card border-border/50">
            <div className="flex flex-col items-center text-center">
              <Users className="w-6 h-6 text-success mb-1" />
              <p className="text-xs text-muted-foreground">Total Users</p>
              <p className="text-sm font-bold mt-1">Growing</p>
            </div>
          </Card>
        </div>

        {/* Coming Soon Card */}
        <Card className="p-8 bg-card border-border/50">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
              <Trophy className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Coming Soon</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                The leaderboard will show top earners once more users join the platform.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
              <span>Auto-refreshes every 24 hours</span>
            </div>
          </div>
        </Card>

        {/* Placeholder Rankings */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground px-1">Top Earners</h2>
          
          {[1, 2, 3].map((rank) => (
            <Card key={rank} className="p-4 bg-card border-border/50 opacity-50">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  rank === 1 ? "bg-yellow-500/20" : 
                  rank === 2 ? "bg-gray-400/20" : 
                  "bg-amber-700/20"
                }`}>
                  {rank === 1 && <Crown className="w-5 h-5 text-yellow-500" />}
                  {rank === 2 && <Medal className="w-5 h-5 text-gray-400" />}
                  {rank === 3 && <Medal className="w-5 h-5 text-amber-700" />}
                </div>
                <div className="flex-1">
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-16 bg-muted rounded mt-1.5 animate-pulse" />
                </div>
                <div className="h-5 w-14 bg-muted rounded animate-pulse" />
              </div>
            </Card>
          ))}
        </div>

        {/* Info Card */}
        <Card className="p-4 bg-primary/10 border-primary/20">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
              <Trophy className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h4 className="font-medium text-sm">Climb the ranks!</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Watch more ads and refer friends to appear on the leaderboard
              </p>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Leaderboard;
