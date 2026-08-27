import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import ProfileSetup from "@/components/ProfileSetup";
import XDCoin from "@/components/XDCoin";
import NotificationPermission from "@/components/NotificationPermission";
import UserLevelBadge from "@/components/UserLevelBadge";
import GuestBanner from "@/components/GuestBanner";
import { useGuest } from "@/contexts/GuestContext";
import { Zap, Gift, Users, Award, ChevronRight, TrendingUp } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const { isGuest } = useGuest();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    setProfile(data);
    if (data && !data.profile_completed) setShowProfileSetup(true);
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
      if (!session && !isGuest) { navigate("/auth"); return; }
      if (isGuest) { setLoading(false); return; }
      setUser(session.user);
      await Promise.all([fetchProfile(session.user.id), checkAdminRole(session.user.id)]);
      setLoading(false);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && !isGuest) { navigate("/auth"); }
      else if (session) {
        setUser(session.user);
        fetchProfile(session.user.id);
        checkAdminRole(session.user.id);
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate, isGuest]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (showProfileSetup && user) {
    return (
      <ProfileSetup
        userId={user.id}
        onComplete={() => { setShowProfileSetup(false); fetchProfile(user.id); }}
        existingProfile={profile}
      />
    );
  }

  const totalCoins = Math.floor((profile?.total_earnings || 0) * 100);
  const redeemableCoins = Math.floor((profile?.withdrawable_balance || 0) * 100);
  const tasksCompleted = profile?.ads_watched || 0;

  const featureCards = [
    { title: "Earn", desc: "Watch & earn", icon: Zap, path: "/earn", color: "text-primary", bg: "from-primary/20 to-primary/5", border: "border-primary/20" },
    { title: "Daily Bonus", desc: "Claim streak", icon: Gift, path: "/daily-bonus", color: "text-warning", bg: "from-warning/20 to-warning/5", border: "border-warning/20" },
    { title: "Referrals", desc: "Invite friends", icon: Users, path: "/referral", color: "text-success", bg: "from-success/20 to-success/5", border: "border-success/20" },
    { title: "Redeem", desc: "Get rewards", icon: Award, path: "/gift-cards", color: "text-accent", bg: "from-accent/20 to-accent/5", border: "border-accent/20" },
  ];


  return (
    <AppLayout title="XD REWARDS" showAdmin={isAdmin} showLogout={!isGuest} onLogout={handleLogout}>
      <GuestBanner />



      <div className="px-4 py-4 space-y-4">
        {/* Hero Balance Card */}
        <Card className="p-5 bg-gradient-to-br from-primary/15 via-card to-card border-primary/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -ml-8 -mb-8" />
          
          <div className="relative z-10">
            {/* Top row: greeting + level */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Welcome back,</p>
                <p className="text-lg font-bold">{profile?.display_name || (isGuest ? "Guest" : "User")}</p>
              </div>
              <UserLevelBadge totalCoins={totalCoins} tasksCompleted={tasksCompleted} />
            </div>

            {/* Balance */}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total XD Coins</p>
                <div className="flex items-center gap-2">
                  <XDCoin size="xl" />
                  <span className="text-4xl font-black text-success tabular-nums animate-slide-up">
                    {totalCoins.toLocaleString()}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">1000 XD Coins = ₹10 INR</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground">Redeemable</p>
                <p className="text-lg font-bold text-primary">{redeemableCoins}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-3 gap-2.5">
          <Card className="p-2.5 bg-card border-border/40 text-center">
            <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center mx-auto mb-1">
              <TrendingUp className="w-4 h-4 text-success" />
            </div>
            <p className="text-base font-bold">{tasksCompleted}</p>
            <p className="text-[9px] text-muted-foreground">Tasks Done</p>
          </Card>
          <Card className="p-2.5 bg-card border-border/40 text-center">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center mx-auto mb-1">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <p className="text-base font-bold">{profile?.referrals_count || 0}</p>
            <p className="text-[9px] text-muted-foreground">Referrals</p>
          </Card>
          <Card className="p-2.5 bg-card border-border/40 text-center">
            <div className="w-8 h-8 rounded-lg bg-warning/20 flex items-center justify-center mx-auto mb-1">
              <Gift className="w-4 h-4 text-warning" />
            </div>
            <p className="text-base font-bold">{redeemableCoins.toLocaleString()}</p>
            <p className="text-[9px] text-muted-foreground">Redeemable</p>
          </Card>
        </div>

        {/* Feature Cards Grid — compact rows */}
        <div className="grid grid-cols-2 gap-2.5">
          {featureCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.title}
                className={`p-3 bg-gradient-to-br ${card.bg} ${card.border} cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]`}
                onClick={() => navigate(card.path)}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-background/50 flex items-center justify-center shrink-0">
                    <Icon className={`w-4 h-4 ${card.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[13px] leading-tight truncate">{card.title}</h3>
                    <p className="text-[10px] text-muted-foreground truncate">{card.desc}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {user && <NotificationPermission userId={user.id} />}
    </AppLayout>

  );
};

export default Dashboard;
