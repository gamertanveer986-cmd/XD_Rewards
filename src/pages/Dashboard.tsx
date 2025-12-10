import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import WatchAdModal from "@/components/WatchAdModal";
import AppLayout from "@/components/AppLayout";
import { Play, TrendingUp, Users, Eye } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAdModal, setShowAdModal] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    setProfile(data);
  };

  const checkAdminRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(!!data);
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      await fetchProfile(session.user.id);
      await checkAdminRole(session.user.id);
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchProfile(session.user.id);
        checkAdminRole(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  const handleAdComplete = () => {
    if (user) {
      fetchProfile(user.id);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout 
      title="XD REWARDS" 
      showAdmin={isAdmin}
      showLogout={true}
      onLogout={handleLogout}
    >
      <div className="px-4 py-4 space-y-4">
        {/* Balance Card - Hero */}
        <Card className="p-6 bg-gradient-to-br from-primary/20 via-card to-card border-primary/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -mr-10 -mt-10" />
          <div className="relative z-10">
            <p className="text-sm text-muted-foreground mb-1">Total Earnings</p>
            <p className="text-4xl font-bold text-success mb-1">
              ₹{profile?.total_earnings?.toFixed(2) || "0.00"}
            </p>
            <p className="text-xs text-muted-foreground">Lifetime earnings</p>
          </div>
        </Card>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 bg-card border-border/50">
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center mb-2">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <p className="text-lg font-bold">₹{profile?.withdrawable_balance?.toFixed(0) || "0"}</p>
              <p className="text-[10px] text-muted-foreground">Withdrawable</p>
            </div>
          </Card>
          
          <Card className="p-3 bg-card border-border/50">
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                <Eye className="w-5 h-5 text-primary" />
              </div>
              <p className="text-lg font-bold">{profile?.ads_watched || 0}</p>
              <p className="text-[10px] text-muted-foreground">Ads Watched</p>
            </div>
          </Card>
          
          <Card className="p-3 bg-card border-border/50">
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center mb-2">
                <Users className="w-5 h-5 text-accent" />
              </div>
              <p className="text-lg font-bold">{profile?.referrals_count || 0}</p>
              <p className="text-[10px] text-muted-foreground">Referrals</p>
            </div>
          </Card>
        </div>

        {/* Watch Ads CTA */}
        <Card className="p-4 bg-gradient-to-r from-primary/10 to-transparent border-primary/30">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/30">
              <Play className="w-7 h-7 text-primary-foreground fill-current" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base">Watch & Earn</h3>
              <p className="text-xs text-muted-foreground">₹0.05-₹0.10 per ad</p>
            </div>
            <Button 
              size="sm"
              className="bg-primary hover:bg-primary/90 shrink-0 px-6"
              onClick={() => setShowAdModal(true)}
            >
              Start
            </Button>
          </div>
        </Card>

        {/* Info Cards */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground px-1">How it works</h2>
          
          <Card className="p-4 bg-card border-border/50">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-sm">💰</span>
              </div>
              <div>
                <h4 className="font-medium text-sm">Earn per ad</h4>
                <p className="text-xs text-muted-foreground mt-0.5">₹0.05-₹0.10 instantly credited</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-card border-border/50">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-sm">👥</span>
              </div>
              <div>
                <h4 className="font-medium text-sm">Refer & Earn</h4>
                <p className="text-xs text-muted-foreground mt-0.5">₹5 for every friend you refer</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-card border-border/50">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-sm">⚡</span>
              </div>
              <div>
                <h4 className="font-medium text-sm">Instant Withdrawal</h4>
                <p className="text-xs text-muted-foreground mt-0.5">UPI payout in 1-5 minutes</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Ad Modal */}
      {user && (
        <WatchAdModal
          isOpen={showAdModal}
          onClose={() => setShowAdModal(false)}
          userId={user.id}
          onAdComplete={handleAdComplete}
        />
      )}
    </AppLayout>
  );
};

export default Dashboard;
