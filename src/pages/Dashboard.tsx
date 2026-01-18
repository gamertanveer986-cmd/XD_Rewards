import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import WatchAdModal from "@/components/WatchAdModal";
import AppLayout from "@/components/AppLayout";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import ProfileSetup from "@/components/ProfileSetup";
import DailyRewards from "@/components/DailyRewards";
import Disclaimer from "@/components/Disclaimer";
import XDCoin from "@/components/XDCoin";
import { Play, Users, Eye, Copy, Share2 } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAdModal, setShowAdModal] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    setProfile(data);
    
    // Check if profile setup is needed
    if (data && !data.profile_completed) {
      setShowProfileSetup(true);
    }
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
      setIsEmailVerified(session.user.email_confirmed_at != null);
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
        setIsEmailVerified(session.user.email_confirmed_at != null);
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

  const handleProfileSetupComplete = () => {
    setShowProfileSetup(false);
    if (user) {
      fetchProfile(user.id);
    }
  };

  const copyReferralCode = () => {
    if (profile?.referral_code) {
      navigator.clipboard.writeText(profile.referral_code);
      toast.success("Referral code copied!");
    }
  };

  const shareReferralCode = () => {
    if (profile?.referral_code) {
      const shareText = `Join XD Rewards and collect XD Coins! Use my referral code: ${profile.referral_code}`;
      if (navigator.share) {
        navigator.share({ text: shareText });
      } else {
        navigator.clipboard.writeText(shareText);
        toast.success("Share text copied!");
      }
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

  // Show profile setup for new users
  if (showProfileSetup && user) {
    return (
      <ProfileSetup 
        userId={user.id} 
        onComplete={handleProfileSetupComplete}
        existingProfile={profile}
      />
    );
  }

  // Convert to XD Coins (multiply by 100)
  const totalCoins = Math.floor((profile?.total_earnings || 0) * 100);
  const redeemableCoins = Math.floor((profile?.withdrawable_balance || 0) * 100);

  return (
    <AppLayout 
      title="XD REWARDS" 
      showAdmin={isAdmin}
      showLogout={true}
      onLogout={handleLogout}
    >
      {/* Email Verification Banner */}
      <EmailVerificationBanner />
      
      <div className="px-4 py-4 space-y-4">
        {/* Balance Card - Hero */}
        <Card className="p-6 bg-gradient-to-br from-primary/20 via-card to-card border-primary/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -mr-10 -mt-10" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <XDCoin size="lg" />
              <p className="text-sm text-muted-foreground">Total XD Coins</p>
            </div>
            <p className="text-4xl font-bold text-success mb-1">
              {totalCoins.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Entertainment coins • ≈ {(totalCoins / 100).toFixed(1)} value</p>
          </div>
        </Card>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 bg-card border-border/50">
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center mb-2">
                <XDCoin size="md" />
              </div>
              <p className="text-lg font-bold">{redeemableCoins}</p>
              <p className="text-[10px] text-muted-foreground">Redeemable</p>
            </div>
          </Card>
          
          <Card className="p-3 bg-card border-border/50">
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                <Eye className="w-5 h-5 text-primary" />
              </div>
              <p className="text-lg font-bold">{profile?.ads_watched || 0}</p>
              <p className="text-[10px] text-muted-foreground">Tasks Done</p>
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

        {/* Referral Code Card */}
        <Card className="p-4 bg-gradient-to-r from-accent/10 to-transparent border-accent/30">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs text-muted-foreground">Your Referral Code</p>
              <p className="text-xl font-bold tracking-widest text-accent">
                {profile?.referral_code || "—"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="icon" variant="outline" onClick={copyReferralCode} className="h-8 w-8">
                <Copy className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="default" onClick={shareReferralCode} className="h-8 w-8 bg-accent hover:bg-accent/90">
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Get 500 XD Coins (5 value) for each friend who joins!
          </p>
        </Card>

        {/* Daily Rewards */}
        {user && (
          <DailyRewards userId={user.id} onClaim={() => fetchProfile(user.id)} />
        )}

        {/* Fast Reward Task CTA */}
        <Card className="p-4 bg-gradient-to-r from-primary/10 to-transparent border-primary/30">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/30">
              <Play className="w-7 h-7 text-primary-foreground fill-current" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base">Fast Reward Task</h3>
              <p className="text-xs text-muted-foreground">Complete tasks to earn XD Coins</p>
            </div>
            <Button 
              size="sm"
              className="bg-primary hover:bg-primary/90 shrink-0 px-6"
              onClick={() => {
                if (!isEmailVerified) {
                  toast.error("Please verify your email to start collecting XD Coins");
                  return;
                }
                setShowAdModal(true);
              }}
              disabled={!isEmailVerified}
            >
              {isEmailVerified ? "Start" : "Verify Email"}
            </Button>
          </div>
        </Card>

        {/* Info Cards */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground px-1">How it works</h2>
          
          <Card className="p-4 bg-card border-border/50">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-sm">🎯</span>
              </div>
              <div>
                <h4 className="font-medium text-sm">Fast Reward Task</h4>
                <p className="text-xs text-muted-foreground mt-0.5">5-10 XD Coins per task</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-card border-border/50">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-sm">👥</span>
              </div>
              <div>
                <h4 className="font-medium text-sm">Invite Friends</h4>
                <p className="text-xs text-muted-foreground mt-0.5">500 XD Coins (5 value) per referral</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-card border-border/50">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-sm">🎁</span>
              </div>
              <div>
                <h4 className="font-medium text-sm">Daily Bonus</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Check in daily for streak rewards</p>
              </div>
            </div>
          </Card>

          {/* Value Info */}
          <Card className="p-4 bg-primary/10 border-primary/30">
            <h4 className="font-medium text-sm mb-2">XD Coin Value</h4>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>• 1000 XD Coins = 10 value</p>
              <p>• Sign-up bonus: 1000 XD Coins (10 value)</p>
              <p>• Referral bonus: 500 XD Coins (5 value)</p>
              <p>• Min. withdrawal: 5000 XD Coins (50 value)</p>
            </div>
          </Card>
        </div>

        {/* Disclaimer */}
        <Disclaimer />
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
