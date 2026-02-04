import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import AppLayout from "@/components/AppLayout";
import { User, Calendar, Hash, Award, Shield, Clock, AlertCircle, Instagram, Star, MessageSquare, Bell, BellOff } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import XDCoin from "@/components/XDCoin";
import Disclaimer from "@/components/Disclaimer";
import UserBadges from "@/components/UserBadges";
import { toast } from "sonner";

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [followingInstagram, setFollowingInstagram] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      
      const { data } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .single();
      setProfile(data);
      
      // Get notification preferences
      const { data: notifPref } = await supabase
        .from("notification_preferences")
        .select("notifications_enabled")
        .eq("user_id", session.user.id)
        .single();
      
      if (notifPref) {
        setNotificationsEnabled(notifPref.notifications_enabled);
      }
      
      setLoading(false);
    };
    checkAuth();
  }, [navigate]);

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const handleInstagramFollow = () => {
    window.open("https://www.instagram.com/xd_rewards_official", "_blank");
    toast.info("Follow verified? Reward will be credited after admin verification within 24 hours.");
    setFollowingInstagram(true);
  };

  const handleSendFeedback = () => {
    window.location.href = "mailto:dxreward@gmail.com?subject=XD%20Rewards%20Feedback";
  };

  // Convert to XD Coins
  const totalCoins = Math.floor((profile?.total_earnings || 0) * 100);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isSuspended = profile?.payment_status === "suspended";

  return (
    <AppLayout title="Profile">
      <div className="px-4 py-4 space-y-4">
        {/* Suspension Banner */}
        {isSuspended && (
          <Card className="p-4 bg-destructive/10 border-destructive/30">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm text-destructive">Account Suspended</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Your account has been suspended due to policy violations.
                  For review or unban requests, contact: dxreward@gmail.com
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Profile Header */}
        <Card className="p-6 bg-gradient-to-br from-primary/20 via-card to-card border-primary/30">
          <div className="flex items-center gap-4">
            <Avatar className="w-20 h-20 border-2 border-primary">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback className="bg-primary/20 text-xl font-bold">
                {getInitials(profile?.display_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{profile?.display_name || "User"}</h2>
              <p className="text-xs text-muted-foreground">@{profile?.username || "user"}</p>
              <div className="flex items-center gap-1 mt-2">
                <div className={`w-2 h-2 rounded-full ${isSuspended ? "bg-destructive" : "bg-success"}`} />
                <span className={`text-xs ${isSuspended ? "text-destructive" : "text-success"}`}>
                  {isSuspended ? "Suspended" : "Active"}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 bg-card border-border/50 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <XDCoin size="sm" />
              <p className="text-lg font-bold">{totalCoins}</p>
            </div>
            <p className="text-[10px] text-muted-foreground">XD Coins</p>
          </Card>
          <Card className="p-3 bg-card border-border/50 text-center">
            <p className="text-lg font-bold">{profile?.ads_watched || 0}</p>
            <p className="text-[10px] text-muted-foreground">Tasks Done</p>
          </Card>
          <Card className="p-3 bg-card border-border/50 text-center">
            <p className="text-lg font-bold">{profile?.referrals_count || 0}</p>
            <p className="text-[10px] text-muted-foreground">Referrals</p>
          </Card>
        </div>

        {/* Badges Section */}
        {user && (
          <Card className="p-4 bg-card border-border/50">
            <UserBadges userId={user.id} variant="full" showEmpty />
          </Card>
        )}

        {/* Profile Details */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground px-1">Profile Information</h3>
          
          <Card className="divide-y divide-border/50">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Display Name</span>
              </div>
              <span className="text-sm font-medium">{profile?.display_name || "—"}</span>
            </div>
            
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Hash className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Username</span>
              </div>
              <span className="text-sm font-medium">@{profile?.username || "—"}</span>
            </div>
            
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Date of Birth</span>
              </div>
              <span className="text-sm font-medium">{formatDate(profile?.birthday)}</span>
            </div>
            
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Hash className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">User ID</span>
              </div>
              <span className="text-xs font-mono text-muted-foreground truncate max-w-[120px]">
                {profile?.user_id?.slice(0, 8)}...
              </span>
            </div>
            
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Joined</span>
              </div>
              <span className="text-sm font-medium">{formatDate(profile?.created_at)}</span>
            </div>
            
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Award className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Total Coins Earned</span>
              </div>
              <div className="flex items-center gap-1">
                <XDCoin size="sm" />
                <span className="text-sm font-medium text-success">{totalCoins}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Account Status</span>
              </div>
              <span className={`text-sm font-medium ${isSuspended ? "text-destructive" : "text-success"}`}>
                {isSuspended ? "Suspended" : "Active"}
              </span>
            </div>
          </Card>
        </div>

        {/* Instagram Follow Section */}
        <Card className="p-4 bg-gradient-to-r from-pink-500/10 to-purple-500/10 border-pink-500/30">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shrink-0">
              <Instagram className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm">Follow Us on Instagram</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Get 50 in-app coins (entertainment value only) after verified follow
              </p>
              <Button 
                size="sm" 
                className="mt-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white"
                onClick={handleInstagramFollow}
              >
                <Instagram className="w-4 h-4 mr-1" />
                {followingInstagram ? "Verification Pending" : "Follow @xd_rewards_official"}
              </Button>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-3">
            Social media rewards are optional and subject to verification. Rewards may change or be removed at any time.
          </p>
        </Card>

        {/* Feedback Section */}
        <Card className="p-4 bg-card border-border/50">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
              <Star className="w-5 h-5 text-warning" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm">Rate & Feedback</h4>
              <p className="text-xs text-muted-foreground mt-1">
                If you like the app and share your honest feedback or rating, you may receive bonus in-app coins (entertainment value only).
              </p>
              <Button 
                size="sm" 
                variant="outline"
                className="mt-2"
                onClick={handleSendFeedback}
              >
                <MessageSquare className="w-4 h-4 mr-1" />
                Send Feedback
              </Button>
            </div>
          </div>
        </Card>

        {/* Anti-Fraud Notice */}
        <Card className="p-4 bg-destructive/5 border-destructive/20">
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-sm">Anti-Fraud & Safety Notice</h4>
              <p className="text-xs text-muted-foreground mt-1">
                XD Rewards uses automated and manual systems to detect bots, auto-clickers, and unfair activity. 
                Violations may lead to account suspension without prior notice.
              </p>
            </div>
          </div>
        </Card>

        {/* Limits Notice */}
        <Card className="p-4 bg-muted/30 border-border/50">
          <h4 className="font-medium text-sm mb-2">Usage Limits</h4>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>• Maximum withdrawals per day: 3</p>
            <p>• Maximum value per day: 20 value</p>
            <p>• Maximum tasks per day: 200</p>
            <p>• Limits may change based on activity</p>
          </div>
        </Card>

        {/* Single Device Notice */}
        <Card className="p-3 bg-muted/30 border-border/50">
          <p className="text-xs text-muted-foreground text-center">
            One mobile device can register only ONE account. Multiple sign-ups from the same device are blocked for abuse prevention.
          </p>
        </Card>

        {/* Notification Settings */}
        <Card className="p-4 bg-card border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {notificationsEnabled ? (
                <Bell className="w-5 h-5 text-success" />
              ) : (
                <BellOff className="w-5 h-5 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium">Push Notifications</p>
                <p className="text-xs text-muted-foreground">
                  {notificationsEnabled ? "Enabled" : "Disabled"}
                </p>
              </div>
            </div>
            <Switch
              checked={notificationsEnabled}
              onCheckedChange={async (checked) => {
                if (user) {
                  await supabase
                    .from("notification_preferences")
                    .upsert({
                      user_id: user.id,
                      notifications_enabled: checked,
                      updated_at: new Date().toISOString(),
                    }, { onConflict: "user_id" });
                  setNotificationsEnabled(checked);
                  toast.success(checked ? "Notifications enabled" : "Notifications disabled");
                }
              }}
            />
          </div>
        </Card>

        {/* Disclaimer */}
        <Disclaimer variant="compact" />
      </div>
    </AppLayout>
  );
};

export default Profile;
