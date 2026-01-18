import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Gift, Check, Loader2, Clock } from "lucide-react";
import XDCoin from "@/components/XDCoin";

interface DailyRewardsProps {
  userId: string;
  onClaim?: () => void;
}

const REWARDS = [
  { day: 1, coins: 10 },
  { day: 2, coins: 20 },
  { day: 3, coins: 30 },
  { day: 4, coins: 40 },
  { day: 5, coins: 50 },
  { day: 6, coins: 60 },
  { day: 7, coins: 70 },
];

const DailyRewards = ({ userId, onClaim }: DailyRewardsProps) => {
  const [currentStreak, setCurrentStreak] = useState(0);
  const [lastClaimDate, setLastClaimDate] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [canClaim, setCanClaim] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeUntilReset, setTimeUntilReset] = useState("");

  useEffect(() => {
    fetchDailyRewardStatus();
  }, [userId]);

  // Timer for next claim
  useEffect(() => {
    if (!canClaim && lastClaimDate) {
      const interval = setInterval(() => {
        const now = new Date();
        const tomorrow = new Date();
        tomorrow.setHours(24, 0, 0, 0);
        const diff = tomorrow.getTime() - now.getTime();
        
        if (diff <= 0) {
          setCanClaim(true);
          setTimeUntilReset("");
          clearInterval(interval);
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          setTimeUntilReset(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [canClaim, lastClaimDate]);

  const fetchDailyRewardStatus = async () => {
    try {
      const { data, error } = await supabase
        .from("daily_rewards")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setCurrentStreak(data.current_streak);
        setLastClaimDate(data.last_claim_date);
        
        // Check if can claim today
        const today = new Date().toISOString().split("T")[0];
        setCanClaim(data.last_claim_date !== today);
      } else {
        // No record means user can claim
        setCanClaim(true);
        setCurrentStreak(0);
      }
    } catch (error) {
      console.error("Error fetching daily reward status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    try {
      setClaiming(true);
      
      const { data, error } = await supabase.rpc("claim_daily_reward", {
        p_user_id: userId,
      });

      if (error) throw error;

      const result = data as { success: boolean; reward?: number; day?: number; message: string };
      
      if (result.success) {
        const coinsEarned = REWARDS[(result.day || 1) - 1]?.coins || 10;
        toast.success(`You earned ${coinsEarned} XD Coins!`);
        setCurrentStreak(result.day || 0);
        setLastClaimDate(new Date().toISOString().split("T")[0]);
        setCanClaim(false);
        onClaim?.();
      } else {
        toast.info(result.message);
        setCanClaim(false);
      }
    } catch (error) {
      console.error("Error claiming daily reward:", error);
      toast.error("Failed to claim daily bonus");
    } finally {
      setClaiming(false);
    }
  };

  // Calculate next day for display (after day 7, it resets to day 1)
  const nextDay = currentStreak >= 7 ? 1 : currentStreak + 1;

  if (loading) {
    return (
      <Card className="p-4 bg-gradient-to-r from-warning/10 to-transparent border-warning/30">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-warning" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-gradient-to-br from-warning/10 via-card to-card border-warning/30 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-warning/10 rounded-full blur-2xl -mr-8 -mt-8" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-warning/20 flex items-center justify-center shadow-lg">
              <Gift className="w-6 h-6 text-warning" />
            </div>
            <div>
              <h3 className="font-bold text-base">Daily Bonus</h3>
              <p className="text-xs text-muted-foreground">
                {canClaim ? `Day ${nextDay} ready!` : "Come back tomorrow"}
              </p>
            </div>
          </div>
          
          {/* Timer */}
          {!canClaim && timeUntilReset && (
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg px-2 py-1">
              <Clock className="w-3 h-3 text-warning" />
              <span className="text-xs font-mono text-warning">{timeUntilReset}</span>
            </div>
          )}
        </div>

        {/* Reward Days Grid */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {REWARDS.map((reward) => {
            const isCompleted = reward.day <= currentStreak;
            const isNext = reward.day === nextDay && canClaim;
            const isCurrent = reward.day === nextDay && !canClaim;
            
            return (
              <div
                key={reward.day}
                className={`relative rounded-xl p-2 text-center transition-all ${
                  isCompleted
                    ? "bg-success/20 border-2 border-success/50"
                    : isNext
                    ? "bg-warning/20 border-2 border-warning animate-pulse shadow-lg shadow-warning/20"
                    : isCurrent
                    ? "bg-primary/20 border-2 border-primary/40"
                    : "bg-muted/30 border border-border/30"
                }`}
              >
                <p className="text-[9px] text-muted-foreground mb-0.5">Day {reward.day}</p>
                <div className="flex items-center justify-center gap-0.5">
                  <XDCoin size="sm" />
                  <span className={`text-[10px] font-bold ${
                    isCompleted ? "text-success" : isNext ? "text-warning" : "text-foreground"
                  }`}>
                    {reward.coins}
                  </span>
                </div>
                {isCompleted && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-success rounded-full flex items-center justify-center shadow-md">
                    <Check className="w-2.5 h-2.5 text-success-foreground" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Info text */}
        <p className="text-[10px] text-muted-foreground text-center mb-3">
          Bonus XD Coins for active users • Streak resets if you miss a day
        </p>

        {/* Claim Button */}
        <Button
          className={`w-full h-12 text-base font-bold ${canClaim ? "bg-warning hover:bg-warning/90 text-warning-foreground shadow-lg shadow-warning/30" : ""}`}
          variant={canClaim ? "default" : "secondary"}
          disabled={!canClaim || claiming}
          onClick={handleClaim}
        >
          {claiming ? (
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
          ) : canClaim ? (
            <>
              <XDCoin size="sm" className="mr-2" />
              Claim {REWARDS[nextDay - 1].coins} XD Coins
            </>
          ) : (
            <>
              <Clock className="w-4 h-4 mr-2" />
              Claimed Today
            </>
          )}
        </Button>
      </div>
    </Card>
  );
};

export default DailyRewards;
