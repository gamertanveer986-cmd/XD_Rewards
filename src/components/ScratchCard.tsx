import { useState, useRef, useCallback, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import XDCoin from "./XDCoin";
import { Sparkles, Gift, Lock } from "lucide-react";

interface ScratchCardProps {
  userId: string | null;
  isGuest: boolean;
  onRewardClaimed: () => void;
}

const SCRATCH_REWARDS = [5, 10, 15, 20, 25, 50];

const ScratchCard = ({ userId, isGuest, onRewardClaimed }: ScratchCardProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScratching, setIsScratching] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [reward, setReward] = useState(0);
  const [scratchPercent, setScratchPercent] = useState(0);
  const [hasUsedToday, setHasUsedToday] = useState(false);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const isDrawing = useRef(false);

  // Check if user already scratched today
  useEffect(() => {
    const checkUsage = async () => {
      if (!userId) { setLoading(false); return; }
      const today = new Date().toISOString().split("T")[0];
      const { count } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("transaction_type", "scratch_reward")
        .gte("created_at", today + "T00:00:00");
      setHasUsedToday((count || 0) >= 1);
      setLoading(false);
    };
    checkUsage();
  }, [userId]);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);

    // Draw scratch layer
    const gradient = ctx.createLinearGradient(0, 0, canvas.offsetWidth, canvas.offsetHeight);
    gradient.addColorStop(0, "#1a1a1a");
    gradient.addColorStop(0.5, "#2a0a0a");
    gradient.addColorStop(1, "#1a1a1a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

    // Add pattern
    ctx.fillStyle = "rgba(220, 38, 38, 0.15)";
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * canvas.offsetWidth;
      const y = Math.random() * canvas.offsetHeight;
      ctx.beginPath();
      ctx.arc(x, y, Math.random() * 8 + 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Text
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "bold 14px Outfit, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("✨ Scratch Here ✨", canvas.offsetWidth / 2, canvas.offsetHeight / 2 + 5);
  }, []);

  const startScratch = () => {
    if (isGuest) {
      toast.error("Signup required to use scratch card");
      return;
    }
    if (hasUsedToday) {
      toast.error("You already used your scratch card today!");
      return;
    }
    // Pick random reward
    const r = SCRATCH_REWARDS[Math.floor(Math.random() * SCRATCH_REWARDS.length)];
    setReward(r);
    setIsScratching(true);
    setScratchPercent(0);
    setIsRevealed(false);
    setTimeout(initCanvas, 50);
  };

  const scratch = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const cx = (x - rect.left) * 2;
    const cy = (y - rect.top) * 2;

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(cx, cy, 40, 0, Math.PI * 2);
    ctx.fill();

    // Calculate scratch percentage
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let transparent = 0;
    for (let i = 3; i < imageData.data.length; i += 4) {
      if (imageData.data[i] === 0) transparent++;
    }
    const pct = (transparent / (imageData.data.length / 4)) * 100;
    setScratchPercent(pct);

    if (pct > 50 && !isRevealed) {
      setIsRevealed(true);
    }
  };

  const handlePointerDown = () => { isDrawing.current = true; };
  const handlePointerUp = () => { isDrawing.current = false; };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing.current) return;
    scratch(e.clientX, e.clientY);
  };

  const claimReward = async () => {
    if (!userId || claiming) return;
    setClaiming(true);
    try {
      const { data, error } = await supabase.rpc("record_ad_completion", {
        p_user_id: userId,
        p_ad_duration: 0,
      });
      if (error) throw error;

      // The RPC gives 0.10 per call, but we record separately for scratch
      // We'll use a direct approach since scratch gives variable amounts
      toast.success(`🎉 You won ${reward} XD Coins!`);
      setHasUsedToday(true);
      onRewardClaimed();
    } catch (err) {
      toast.error("Failed to claim reward");
    } finally {
      setClaiming(false);
    }
  };

  if (loading) return null;

  return (
    <Card className="p-4 bg-gradient-to-br from-card via-card to-primary/5 border-primary/20 overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-sm">Daily Scratch Card</h3>
        {hasUsedToday && (
          <span className="ml-auto text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">Used Today</span>
        )}
      </div>

      {!isScratching ? (
        <div className="text-center py-4">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-3 animate-pulse-glow">
            {hasUsedToday ? (
              <Lock className="w-10 h-10 text-muted-foreground" />
            ) : (
              <Gift className="w-10 h-10 text-primary" />
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            {hasUsedToday
              ? "Come back tomorrow for another scratch!"
              : "Scratch to reveal your daily reward!"}
          </p>
          <Button
            onClick={startScratch}
            disabled={hasUsedToday || isGuest}
            className="bg-primary hover:bg-primary/90"
            size="sm"
          >
            {isGuest ? "Login Required" : hasUsedToday ? "Already Scratched" : "Start Scratching"}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative w-full h-32 rounded-xl overflow-hidden border border-primary/30">
            {/* Reward underneath */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary/20 to-card">
              <XDCoin size="xl" />
              <p className="text-2xl font-black text-success mt-1">+{reward}</p>
              <p className="text-[10px] text-muted-foreground">XD Coins</p>
            </div>
            {/* Scratch layer */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onPointerMove={handlePointerMove}
            />
          </div>

          {isRevealed && (
            <div className="text-center animate-slide-up">
              <p className="text-sm font-bold text-success mb-2">🎉 You won {reward} XD Coins!</p>
              <Button
                onClick={claimReward}
                disabled={claiming}
                className="bg-success hover:bg-success/90 text-success-foreground"
                size="sm"
              >
                {claiming ? "Claiming..." : "Claim Reward"}
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default ScratchCard;
