import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Award, Star, Users, Calendar, Trophy, Loader2, Lock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface UserBadge {
  id: string;
  badge_key: string;
  badge_name: string;
  badge_description: string | null;
  earned_at: string;
}

interface UserBadgesProps {
  userId: string;
  variant?: "full" | "compact" | "inline";
  showEmpty?: boolean;
}

const BADGE_ICONS: Record<string, typeof Award> = {
  first_withdrawal: Star,
  referral_master: Users,
  login_streak: Calendar,
  task_champion: Trophy,
};

// Full gallery catalog — locked entries render greyscale, unlocked render with crimson glow.
const BADGE_CATALOG: { key: string; name: string; description: string }[] = [
  { key: "first_withdrawal", name: "First Withdrawal", description: "Completed your first reward redemption" },
  { key: "referral_master", name: "Referral Master", description: "Invited 10+ friends to XD Rewards" },
  { key: "login_streak", name: "7-Day Streak", description: "Claimed daily bonus 7 days in a row" },
  { key: "task_champion", name: "Task Champion", description: "Completed 100 verified tasks" },
];

const UserBadges = ({ userId, variant = "full", showEmpty = false }: UserBadgesProps) => {
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBadges = async () => {
      try {
        const { data, error } = await supabase
          .from("user_badges")
          .select("*")
          .eq("user_id", userId)
          .order("earned_at", { ascending: false });

        if (error) throw error;
        setBadges(data || []);

        await supabase.rpc("check_and_award_badges", { p_user_id: userId });
      } catch (error) {
        console.error("Error fetching badges:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBadges();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-2">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const earnedKeys = new Set(badges.map((b) => b.badge_key));

  if (variant === "inline") {
    return (
      <div className="flex flex-wrap gap-1">
        <TooltipProvider>
          {badges.map((badge) => {
            const Icon = BADGE_ICONS[badge.badge_key] || Award;
            return (
              <Tooltip key={badge.id}>
                <TooltipTrigger>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center bg-primary/15 text-primary border border-primary/30 shadow-[0_0_10px_hsl(0_65%_51%/0.35)]">
                    <Icon className="w-3 h-3" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{badge.badge_name}</p>
                  {badge.badge_description && (
                    <p className="text-xs text-muted-foreground">{badge.badge_description}</p>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className="flex flex-wrap gap-1.5">
        {badges.map((badge) => {
          const Icon = BADGE_ICONS[badge.badge_key] || Award;
          return (
            <Badge
              key={badge.id}
              variant="outline"
              className="bg-primary/10 text-primary border-primary/30 px-2 py-0.5 shadow-[0_0_10px_hsl(0_65%_51%/0.3)]"
            >
              <Icon className="w-3 h-3 mr-1" />
              <span className="text-[10px]">{badge.badge_name}</span>
            </Badge>
          );
        })}
        {badges.length === 0 && showEmpty && (
          <span className="text-xs text-muted-foreground italic">No badges yet</span>
        )}
      </div>
    );
  }

  // Full gallery — every catalog entry rendered, locked ones in greyscale.
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Award className="w-4 h-4 text-primary" />
        <h4 className="font-semibold text-sm">Achievements</h4>
        <span className="text-xs text-muted-foreground ml-auto">
          {badges.length} / {BADGE_CATALOG.length} unlocked
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {BADGE_CATALOG.map((b) => {
          const unlocked = earnedKeys.has(b.key);
          const Icon = BADGE_ICONS[b.key] || Award;
          return (
            <div
              key={b.key}
              className={`relative p-3 rounded-xl border transition-all ${
                unlocked
                  ? "bg-primary/8 border-primary/40 shadow-[0_0_18px_hsl(0_65%_51%/0.35)]"
                  : "bg-card border-border grayscale-locked"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                  unlocked ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                }`}>
                  {unlocked ? <Icon className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{b.name}</p>
                  <p className="text-[10px] opacity-70 truncate">{b.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UserBadges;
