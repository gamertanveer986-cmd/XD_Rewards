import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Award, Star, Users, Calendar, Trophy, Loader2 } from "lucide-react";
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

const BADGE_COLORS: Record<string, string> = {
  first_withdrawal: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  referral_master: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  login_streak: "bg-green-500/20 text-green-400 border-green-500/30",
  task_champion: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

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

        // Check for new badges
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

  if (badges.length === 0 && !showEmpty) {
    return null;
  }

  if (variant === "inline") {
    return (
      <div className="flex flex-wrap gap-1">
        <TooltipProvider>
          {badges.map((badge) => {
            const Icon = BADGE_ICONS[badge.badge_key] || Award;
            const colorClass = BADGE_COLORS[badge.badge_key] || "bg-primary/20 text-primary border-primary/30";

            return (
              <Tooltip key={badge.id}>
                <TooltipTrigger>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${colorClass} border`}>
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
          const colorClass = BADGE_COLORS[badge.badge_key] || "bg-primary/20 text-primary border-primary/30";

          return (
            <Badge key={badge.id} variant="outline" className={`${colorClass} px-2 py-0.5`}>
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

  // Full variant
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Award className="w-4 h-4 text-primary" />
        <h4 className="font-semibold text-sm">Achievements</h4>
        <span className="text-xs text-muted-foreground ml-auto">
          {badges.length} earned
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {badges.map((badge) => {
          const Icon = BADGE_ICONS[badge.badge_key] || Award;
          const colorClass = BADGE_COLORS[badge.badge_key] || "bg-primary/20 text-primary border-primary/30";

          return (
            <div
              key={badge.id}
              className={`p-3 rounded-lg border ${colorClass} transition-all hover:scale-105`}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-background/50 flex items-center justify-center">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{badge.badge_name}</p>
                  <p className="text-[10px] opacity-70 truncate">{badge.badge_description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {badges.length === 0 && showEmpty && (
        <div className="text-center py-4 text-muted-foreground">
          <Award className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-xs">Complete tasks to earn badges!</p>
        </div>
      )}
    </div>
  );
};

export default UserBadges;
