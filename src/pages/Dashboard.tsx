import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gradient-red glow-red">XD REWARDS</h1>
            <p className="text-muted-foreground">Welcome back, {user?.email}</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="p-6 card-glow border-primary/20 bg-card/90">
            <p className="text-sm text-muted-foreground mb-2">Total Earnings</p>
            <p className="text-3xl font-bold text-success">₹10.00</p>
            <p className="text-xs text-muted-foreground mt-1">Signup bonus</p>
          </Card>
          
          <Card className="p-6 card-glow border-primary/20 bg-card/90">
            <p className="text-sm text-muted-foreground mb-2">Withdrawable</p>
            <p className="text-3xl font-bold">₹0.00</p>
            <p className="text-xs text-muted-foreground mt-1">Min ₹50</p>
          </Card>
          
          <Card className="p-6 card-glow border-primary/20 bg-card/90">
            <p className="text-sm text-muted-foreground mb-2">Ads Watched</p>
            <p className="text-3xl font-bold">0</p>
            <p className="text-xs text-muted-foreground mt-1">Start earning</p>
          </Card>
          
          <Card className="p-6 card-glow border-primary/20 bg-card/90">
            <p className="text-sm text-muted-foreground mb-2">Referrals</p>
            <p className="text-3xl font-bold text-primary">0</p>
            <p className="text-xs text-muted-foreground mt-1">₹5 per referral</p>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="p-6 card-glow border-primary/20 bg-card/90 cursor-pointer hover:border-primary/40 transition-all">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
                <span className="text-3xl">🎬</span>
              </div>
              <h3 className="text-xl font-semibold">Watch Ads</h3>
              <p className="text-sm text-muted-foreground">Earn ₹0.05-₹0.10 per ad</p>
              <Button className="w-full bg-primary hover:bg-primary/90">Start Watching</Button>
            </div>
          </Card>

          <Card className="p-6 card-glow border-primary/20 bg-card/90 cursor-pointer hover:border-primary/40 transition-all" onClick={() => navigate("/wallet")}>
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
                <span className="text-3xl">💳</span>
              </div>
              <h3 className="text-xl font-semibold">My Wallet</h3>
              <p className="text-sm text-muted-foreground">View balance & withdraw</p>
              <Button className="w-full" variant="outline">View Wallet</Button>
            </div>
          </Card>

          <Card className="p-6 card-glow border-primary/20 bg-card/90 cursor-pointer hover:border-primary/40 transition-all" onClick={() => navigate("/leaderboard")}>
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
                <span className="text-3xl">🏆</span>
              </div>
              <h3 className="text-xl font-semibold">Leaderboard</h3>
              <p className="text-sm text-muted-foreground">Top earners this month</p>
              <Button className="w-full" variant="outline">View Rankings</Button>
            </div>
          </Card>
        </div>

        {/* Navigation */}
        <Card className="p-6 card-glow border-primary/20 bg-card/90">
          <div className="flex gap-4">
            <Button onClick={() => navigate("/dashboard")} variant="outline" className="flex-1">
              Dashboard
            </Button>
            <Button onClick={() => navigate("/wallet")} variant="outline" className="flex-1">
              Wallet
            </Button>
            <Button onClick={() => navigate("/leaderboard")} variant="outline" className="flex-1">
              Leaderboard
            </Button>
            <Button onClick={() => navigate("/support")} variant="outline" className="flex-1">
              Support
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
