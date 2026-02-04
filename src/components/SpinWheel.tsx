import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import XDCoin from "./XDCoin";
import { Loader2, RotateCw } from "lucide-react";

interface SpinWheelProps {
  userId: string;
  onSpin?: () => void;
}

const SpinWheel = ({ userId, onSpin }: SpinWheelProps) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [reward, setReward] = useState<number | null>(null);
  const [spinsRemaining, setSpinsRemaining] = useState<number | null>(null);
  const [nextSpinAt, setNextSpinAt] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const wheelRef = useRef<HTMLDivElement>(null);

  // Wheel segments with colors
  const segments = [
    { value: 100, color: "from-red-600 to-red-700" },
    { value: 150, color: "from-red-700 to-red-800" },
    { value: 200, color: "from-red-500 to-red-600" },
    { value: 250, color: "from-red-800 to-red-900" },
    { value: 300, color: "from-red-600 to-red-700" },
    { value: 350, color: "from-red-700 to-red-800" },
    { value: 400, color: "from-red-500 to-red-600" },
    { value: 500, color: "from-yellow-500 to-yellow-600" },
  ];

  const fetchSpinStatus = async () => {
    try {
      // Check if feature is enabled
      const { data: config } = await supabase
        .from("gamification_config")
        .select("is_enabled, config_json")
        .eq("feature_key", "spin_wheel")
        .single();

      if (config) {
        setIsEnabled(config.is_enabled);
      }

      // Get today's spin count
      const today = new Date().toISOString().split("T")[0];
      const { data: spins, error } = await supabase
        .from("spin_history")
        .select("spun_at")
        .eq("user_id", userId)
        .gte("spun_at", today);

      if (!error && spins) {
        const dailyLimit = (config?.config_json as any)?.daily_spins || 2;
        setSpinsRemaining(Math.max(0, dailyLimit - spins.length));

        // Check cooldown
        if (spins.length > 0) {
          const lastSpin = new Date(spins[spins.length - 1].spun_at);
          const cooldownHours = (config?.config_json as any)?.cooldown_hours || 12;
          const nextSpin = new Date(lastSpin.getTime() + cooldownHours * 60 * 60 * 1000);
          if (nextSpin > new Date()) {
            setNextSpinAt(nextSpin);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching spin status:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpinStatus();
  }, [userId]);

  // Countdown timer
  useEffect(() => {
    if (!nextSpinAt) {
      setCountdown("");
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const diff = nextSpinAt.getTime() - now.getTime();

      if (diff <= 0) {
        setNextSpinAt(null);
        setCountdown("");
        fetchSpinStatus();
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdown(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [nextSpinAt]);

  const handleSpin = async () => {
    if (isSpinning || (spinsRemaining !== null && spinsRemaining <= 0) || nextSpinAt) return;

    setIsSpinning(true);
    setReward(null);

    try {
      const { data, error } = await supabase.rpc("spin_wheel", {
        p_user_id: userId,
      });

      if (error) throw error;

      const result = data as { success: boolean; message?: string; reward?: number; spins_remaining?: number; next_spin_at?: string };

      if (!result.success) {
        toast.error(result.message || "Unable to spin");
        setIsSpinning(false);
        return;
      }

      // Find the segment index for the reward
      const rewardValue = result.reward || 100;
      const segmentIndex = segments.findIndex(s => s.value === rewardValue);
      const targetIndex = segmentIndex >= 0 ? segmentIndex : 0;

      // Calculate rotation: multiple full spins + land on segment
      const segmentAngle = 360 / segments.length;
      const targetAngle = targetIndex * segmentAngle + segmentAngle / 2;
      const spins = 5 + Math.random() * 3; // 5-8 full rotations
      const finalRotation = rotation + 360 * spins + (360 - targetAngle);

      setRotation(finalRotation);

      // Wait for animation to complete
      setTimeout(() => {
        setReward(rewardValue);
        setSpinsRemaining(result.spins_remaining ?? null);
        setIsSpinning(false);
        toast.success(`🎉 You won ${rewardValue} XD Coins!`);
        onSpin?.();
      }, 4000);

    } catch (error: any) {
      console.error("Spin error:", error);
      toast.error(error.message || "Failed to spin");
      setIsSpinning(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-4 bg-card border-primary/30">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  if (!isEnabled) {
    return null;
  }

  const canSpin = !isSpinning && (spinsRemaining === null || spinsRemaining > 0) && !nextSpinAt;

  return (
    <Card className="p-4 bg-gradient-to-br from-primary/20 via-card to-card border-primary/30 overflow-hidden">
      <div className="flex items-center gap-2 mb-4">
        <RotateCw className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-base">Spin & Earn</h3>
        {spinsRemaining !== null && (
          <span className="ml-auto text-xs text-muted-foreground">
            {spinsRemaining} spin{spinsRemaining !== 1 ? "s" : ""} left today
          </span>
        )}
      </div>

      <div className="relative flex flex-col items-center">
        {/* Wheel Container */}
        <div className="relative w-56 h-56 mb-4">
          {/* Pointer */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-20">
            <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-primary drop-shadow-lg" />
          </div>

          {/* Wheel */}
          <div
            ref={wheelRef}
            className="w-full h-full rounded-full relative overflow-hidden border-4 border-primary/50 shadow-lg"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: isSpinning ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
            }}
          >
            {segments.map((segment, index) => {
              const angle = 360 / segments.length;
              const startAngle = index * angle;

              return (
                <div
                  key={index}
                  className={`absolute w-1/2 h-1/2 origin-bottom-right bg-gradient-to-r ${segment.color}`}
                  style={{
                    transform: `rotate(${startAngle}deg) skewY(${90 - angle}deg)`,
                    transformOrigin: "bottom right",
                    left: "0",
                    top: "0",
                  }}
                >
                  <div
                    className="absolute flex items-center justify-center text-white font-bold text-xs"
                    style={{
                      transform: `skewY(-${90 - angle}deg) rotate(${angle / 2}deg)`,
                      width: "100%",
                      height: "100%",
                      paddingLeft: "45%",
                      paddingBottom: "10%",
                    }}
                  >
                    {segment.value}
                  </div>
                </div>
              );
            })}

            {/* Center circle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-card border-2 border-primary flex items-center justify-center z-10 shadow-lg">
              <XDCoin size="md" />
            </div>
          </div>
        </div>

        {/* Reward Display */}
        {reward && (
          <div className="mb-3 text-center animate-scale-in">
            <p className="text-2xl font-bold text-success flex items-center justify-center gap-2">
              <XDCoin size="md" />
              +{reward}
            </p>
            <p className="text-xs text-muted-foreground">XD Coins added!</p>
          </div>
        )}

        {/* Countdown */}
        {countdown && (
          <div className="mb-3 text-center">
            <p className="text-xs text-muted-foreground">Next spin in</p>
            <p className="text-lg font-bold text-primary">{countdown}</p>
          </div>
        )}

        {/* Spin Button */}
        <Button
          onClick={handleSpin}
          disabled={!canSpin}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 animate-pulse-glow"
        >
          {isSpinning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Spinning...
            </>
          ) : countdown ? (
            "Wait for Cooldown"
          ) : spinsRemaining === 0 ? (
            "Come Back Tomorrow"
          ) : (
            <>
              <RotateCw className="w-4 h-4 mr-2" />
              Spin Now!
            </>
          )}
        </Button>

        <p className="text-[10px] text-muted-foreground text-center mt-2">
          Win 100-500 XD Coins per spin. Entertainment value only.
        </p>
      </div>
    </Card>
  );
};

export default SpinWheel;
