import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import AppLayout from "@/components/AppLayout";
import { Trophy, Medal, Crown, Users, Share2, Copy } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Disclaimer from "@/components/Disclaimer";
import XDCoin from "@/components/XDCoin";
import UserBadges from "@/components/UserBadges";

interface LeaderboardUser {
  rank_position: number;
  display_name: string | null;
  avatar_url: string | null;
  referrals_count: number;
  total_earnings: number;
  ads_watched: number;
  is_current_user: boolean;
}

const Leaderboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myProfile, setMyProfile] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setCurrentUser(session.user);
      await fetchLeaderboard(session.user.id);
      setLoading(false);
    };
    checkAuth();
  }, [navigate]);

  const fetchLeaderboard = async (userId: string) => {
    // Use the secure RPC function that doesn't expose user_id
    const { data: topUsers, error } = await supabase
      .rpc("get_public_leaderboard", { limit_count: 50 });

    if (topUsers && !error) {
      setLeaderboard(topUsers as LeaderboardUser[]);
      
      // Find current user's position using the is_current_user flag
      const userEntry = topUsers.find((u: LeaderboardUser) => u.is_current_user);
      if (userEntry) {
        setMyRank(userEntry.rank_position);
      }
    }

    // Get user's own profile data
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("referral_code, referrals_count, display_name, total_earnings")
      .eq("user_id", userId)
      .single();
    
    if (profile) {
      setMyProfile(profile);
      
      // If user wasn't in top 50, calculate their rank
      if (!topUsers?.find((u: LeaderboardUser) => u.is_current_user)) {
        const { count } = await supabase
          .from("user_profiles")
          .select("*", { count: "exact", head: true })
          .gt("total_earnings", profile.total_earnings);
        
        setMyRank((count || 0) + 1);
      }
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const copyReferralCode = () => {
    if (myProfile?.referral_code) {
      navigator.clipboard.writeText(myProfile.referral_code);
      toast.success("Referral code copied!");
    }
  };

  const shareReferralCode = () => {
    if (myProfile?.referral_code) {
      const shareText = `Join XD Rewards and collect XD Coins! Use my referral code: ${myProfile.referral_code}`;
      if (navigator.share) {
        navigator.share({ text: shareText });
      } else {
        navigator.clipboard.writeText(shareText);
        toast.success("Share text copied!");
      }
    }
  };

  const toCoins = (earnings: number) => Math.floor(earnings * 100);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const topThree = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <AppLayout title="Top XD Coin Collectors">
      <div className="px-4 py-4 space-y-4">
        {/* My Referral Card */}
        <Card className="p-4 bg-gradient-to-br from-primary/20 via-card to-card border-primary/30">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-muted-foreground">Your Referral Code</p>
              <p className="text-2xl font-bold tracking-widest text-primary">
                {myProfile?.referral_code || "—"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="icon" variant="outline" onClick={copyReferralCode} className="h-9 w-9">
                <Copy className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="default" onClick={shareReferralCode} className="h-9 w-9">
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-background/50 rounded-lg p-2 text-center">
              <p className="text-lg font-bold">{myProfile?.referrals_count || 0}</p>
              <p className="text-[10px] text-muted-foreground">Referrals</p>
            </div>
            <div className="bg-background/50 rounded-lg p-2 text-center">
              <p className="text-lg font-bold">#{myRank || "—"}</p>
              <p className="text-[10px] text-muted-foreground">Your Rank</p>
            </div>
          </div>
        </Card>

        <Tabs defaultValue="coins" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="coins">Top XD Coins</TabsTrigger>
            <TabsTrigger value="referrals">Top Referrers</TabsTrigger>
          </TabsList>

          <TabsContent value="coins" className="space-y-4 mt-4">
            {topThree.length >= 3 && (
              <div className="flex justify-center items-end gap-2 py-4">
                {/* 2nd Place */}
                <div className="flex flex-col items-center">
                  <Avatar className="w-14 h-14 border-2 border-gray-400">
                    <AvatarImage src={topThree[1]?.avatar_url || ""} />
                    <AvatarFallback className="bg-gray-400/20">
                      {getInitials(topThree[1]?.display_name)}
                    </AvatarFallback>
                  </Avatar>
                  <Medal className="w-5 h-5 text-gray-400 -mt-2" />
                  <p className="text-xs font-medium mt-1 truncate max-w-[70px]">
                    {topThree[1]?.display_name || "User"}
                  </p>
                  <div className="flex items-center gap-0.5">
                    <XDCoin size="sm" />
                    <p className="text-[10px] text-muted-foreground">{toCoins(topThree[1]?.total_earnings || 0)}</p>
                  </div>
                  <div className="w-16 h-16 bg-gray-400/20 rounded-t-lg mt-1"></div>
                </div>

                {/* 1st Place */}
                <div className="flex flex-col items-center">
                  <Avatar className="w-18 h-18 border-2 border-yellow-500">
                    <AvatarImage src={topThree[0]?.avatar_url || ""} />
                    <AvatarFallback className="bg-yellow-500/20">
                      {getInitials(topThree[0]?.display_name)}
                    </AvatarFallback>
                  </Avatar>
                  <Crown className="w-6 h-6 text-yellow-500 -mt-2" />
                  <p className="text-sm font-bold mt-1 truncate max-w-[80px]">
                    {topThree[0]?.display_name || "User"}
                  </p>
                  <div className="flex items-center gap-0.5">
                    <XDCoin size="sm" />
                    <p className="text-xs text-muted-foreground">{toCoins(topThree[0]?.total_earnings || 0)}</p>
                  </div>
                  <div className="w-18 h-24 bg-yellow-500/20 rounded-t-lg mt-1"></div>
                </div>

                {/* 3rd Place */}
                <div className="flex flex-col items-center">
                  <Avatar className="w-12 h-12 border-2 border-amber-700">
                    <AvatarImage src={topThree[2]?.avatar_url || ""} />
                    <AvatarFallback className="bg-amber-700/20">
                      {getInitials(topThree[2]?.display_name)}
                    </AvatarFallback>
                  </Avatar>
                  <Medal className="w-5 h-5 text-amber-700 -mt-2" />
                  <p className="text-xs font-medium mt-1 truncate max-w-[70px]">
                    {topThree[2]?.display_name || "User"}
                  </p>
                  <div className="flex items-center gap-0.5">
                    <XDCoin size="sm" />
                    <p className="text-[10px] text-muted-foreground">{toCoins(topThree[2]?.total_earnings || 0)}</p>
                  </div>
                  <div className="w-14 h-12 bg-amber-700/20 rounded-t-lg mt-1"></div>
                </div>
              </div>
            )}

            {/* Rest of leaderboard */}
            <div className="space-y-2">
              {rest.map((user, index) => (
                <Card 
                  key={`rank-${user.rank_position}`} 
                  className={`p-3 bg-card border-border/50 ${user.is_current_user ? "border-primary/50 bg-primary/5" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                      {user.rank_position}
                    </div>
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={user.avatar_url || ""} />
                      <AvatarFallback className="bg-primary/20">
                        {getInitials(user.display_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {user.display_name || "User"}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <XDCoin size="sm" />
                        <p className="font-bold text-sm text-success">{toCoins(user.total_earnings)}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground">XD Coins</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {leaderboard.length === 0 && (
              <Card className="p-8 bg-card border-border/50">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                    <XDCoin size="xl" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-1">Be the first!</h3>
                    <p className="text-sm text-muted-foreground">
                      Start collecting XD Coins to climb the leaderboard
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="referrals" className="space-y-2 mt-4">
            {[...leaderboard]
              .sort((a, b) => b.referrals_count - a.referrals_count)
              .slice(0, 20)
              .map((user, index) => (
                <Card 
                  key={`referral-${user.rank_position}`} 
                  className={`p-3 bg-card border-border/50 ${user.is_current_user ? "border-primary/50 bg-primary/5" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 ? "bg-yellow-500/20 text-yellow-500" :
                      index === 1 ? "bg-gray-400/20 text-gray-400" :
                      index === 2 ? "bg-amber-700/20 text-amber-700" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {index === 0 && <Crown className="w-4 h-4" />}
                      {index === 1 && <Medal className="w-4 h-4" />}
                      {index === 2 && <Medal className="w-4 h-4" />}
                      {index > 2 && index + 1}
                    </div>
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={user.avatar_url || ""} />
                      <AvatarFallback className="bg-primary/20">
                        {getInitials(user.display_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {user.display_name || "User"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">{user.referrals_count}</p>
                      <p className="text-[10px] text-muted-foreground">referrals</p>
                    </div>
                  </div>
                </Card>
              ))}
          </TabsContent>
        </Tabs>

        {/* Info Card */}
        <Card className="p-4 bg-primary/10 border-primary/20">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
              <Trophy className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h4 className="font-medium text-sm">500 XD Coins per referral!</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Share your code and earn when friends join (5 value each)
              </p>
            </div>
          </div>
        </Card>

        {/* Leaderboard Disclaimer */}
        <Card className="p-3 bg-muted/30 border-border/50">
          <p className="text-[10px] text-muted-foreground text-center">
            Rankings are for engagement display only. They do not guarantee or affect reward eligibility.
            Leaderboard rewards are promotional and verified. No guaranteed rewards.
          </p>
        </Card>

        {/* Disclaimer */}
        <Disclaimer variant="compact" />
      </div>
    </AppLayout>
  );
};

export default Leaderboard;
