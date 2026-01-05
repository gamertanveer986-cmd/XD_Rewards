import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Gift, Check, Loader2 } from "lucide-react";

interface DailyRewardsProps {
  userId: string;
  onClaim?: () => void;
}

const REWARDS = [
  { day: 1, amount: 0.10 },
  { day: 2, amount: 0.20 },
  { day: 3, amount: 0.30 },
  { day: 4, amount: 0.40 },
  { day: 5, amount: 0.50 },
  { day: 6, amount: 0.60 },
  { day: 7, amount: 0.70 },
];

const DailyRewards = ({ userId, onClaim }: DailyRewardsProps) => {
  const [currentStreak, setCurrentStreak] = useState(0);
  const [lastClaimDate, setLastClaimDate] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [canClaim, setCanClaim] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDailyRewardStatus();
  }, [userId]);

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
        toast.success(result.message);
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
      toast.error("Failed to claim daily reward");
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
    <Card className="p-4 bg-gradient-to-r from-warning/10 to-transparent border-warning/30">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
          <Gift className="w-5 h-5 text-warning" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Daily Rewards</h3>
          <p className="text-xs text-muted-foreground">
            {canClaim ? `Claim Day ${nextDay} reward!` : "Come back tomorrow!"}
          </p>
        </div>
      </div>

      {/* Reward Days Grid */}
      <div className="grid grid-cols-7 gap-1.5 mb-4">
        {REWARDS.map((reward) => {
          const isCompleted = reward.day <= currentStreak;
          const isNext = reward.day === nextDay && canClaim;
          const isCurrent = reward.day === nextDay && !canClaim;
          
          return (
            <div
              key={reward.day}
              className={`relative rounded-lg p-1.5 text-center transition-all ${
                isCompleted
                  ? "bg-success/20 border border-success/40"
                  : isNext
                  ? "bg-warning/20 border-2 border-warning animate-pulse"
                  : isCurrent
                  ? "bg-primary/20 border border-primary/40"
                  : "bg-muted/30 border border-border/30"
              }`}
            >
              <p className="text-[10px] text-muted-foreground mb-0.5">Day {reward.day}</p>
              <p className={`text-xs font-bold ${
                isCompleted ? "text-success" : isNext ? "text-warning" : "text-foreground"
              }`}>
                ₹{reward.amount.toFixed(2)}
              </p>
              {isCompleted && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-success rounded-full flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-success-foreground" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Claim Button */}
      <Button
        className={`w-full ${canClaim ? "bg-warning hover:bg-warning/90 text-warning-foreground" : ""}`}
        variant={canClaim ? "default" : "secondary"}
        disabled={!canClaim || claiming}
        onClick={handleClaim}
      >
        {claiming ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : canClaim ? (
          <>
            <Gift className="w-4 h-4 mr-2" />
            Claim ₹{REWARDS[nextDay - 1].amount.toFixed(2)}
          </>
        ) : (
          "Already Claimed Today"
        )}
      </Button>
    </Card>
  );
};

export default DailyRewards;
