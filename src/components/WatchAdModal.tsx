import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUnityAds } from "@/hooks/useUnityAds";
import { useGuest } from "@/contexts/GuestContext";
import { CheckCircle, Zap, Play, Volume2, X } from "lucide-react";

interface WatchAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string | null;
  onAdComplete: (coinsEarned: number) => void;
}

const SIM_AD_SECONDS = 15;
const GUEST_COINS_PER_AD = 10;

const WatchAdModal = ({ isOpen, onClose, userId, onAdComplete }: WatchAdModalProps) => {
  const { isGuest, addGuestCoins } = useGuest();
  const { isNative, isReady, isLoading, initError, watch } = useUnityAds();

  const [phase, setPhase] = useState<"idle" | "playing" | "done">("idle");
  const [remaining, setRemaining] = useState(SIM_AD_SECONDS);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setPhase("idle");
      setRemaining(SIM_AD_SECONDS);
      setCoinsEarned(0);
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isOpen]);

  const grantReward = async () => {
    // Guest: session wallet only
    if (isGuest || !userId) {
      addGuestCoins(GUEST_COINS_PER_AD);
      setCoinsEarned(GUEST_COINS_PER_AD);
      setPhase("done");
      toast.success(`You earned ${GUEST_COINS_PER_AD} XD Coins!`);
      onAdComplete(GUEST_COINS_PER_AD);
      return;
    }

    try {
      const { data, error } = await supabase.rpc("record_ad_completion", {
        p_user_id: userId,
        p_ad_duration: SIM_AD_SECONDS,
      });
      if (error) throw error;
      const result = data as { earnings: number; success: boolean };
      const coins = Math.floor((result?.earnings ?? 0) * 100) || GUEST_COINS_PER_AD;
      setCoinsEarned(coins);
      setPhase("done");
      toast.success(`You earned ${coins} XD Coins!`);
      onAdComplete(coins);
    } catch (err: any) {
      console.error("[WatchAdModal] record_ad_completion failed:", err);
      toast.error("Failed to record reward. Please try again.");
      setPhase("idle");
    }
  };

  const startSimulatedAd = () => {
    setPhase("playing");
    setRemaining(SIM_AD_SECONDS);
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          if (timerRef.current) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
          }
          grantReward();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startNativeAd = async () => {
    setPhase("playing");
    const res = await watch();
    if (res.success) {
      await grantReward();
    } else {
      toast.error(res.error || "Ad was not completed.");
      setPhase("idle");
    }
  };

  const handleStart = () => {
    if (isNative) startNativeAd();
    else startSimulatedAd();
  };

  const handleClose = () => {
    if (phase === "playing") return; // can't close during ad
    onClose();
  };

  const progressPct = ((SIM_AD_SECONDS - remaining) / SIM_AD_SECONDS) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-md bg-card border-border/60">
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            {phase === "done" ? (
              <><CheckCircle className="w-5 h-5 text-success" /> Reward Earned!</>
            ) : phase === "playing" ? (
              <>Ad playing…</>
            ) : (
              <><Zap className="w-5 h-5 text-primary" /> Watch Video & Earn Coins</>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="py-2">
          {phase === "idle" && (
            <div className="space-y-4 text-center">
              <div className="w-24 h-24 mx-auto rounded-full bg-primary/15 flex items-center justify-center shadow-inner">
                <Play className="w-12 h-12 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">
                  {isNative ? "Watch a Unity rewarded ad" : "Watch a short video"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Reward is granted only after the video completes.
                </p>
              </div>
              {isNative && initError && (
                <p className="text-xs text-destructive">{initError}</p>
              )}
              <Button
                onClick={handleStart}
                className="w-full bg-primary hover:bg-primary/90"
                disabled={isNative && (isLoading || (!isReady && !initError))}
              >
                {isNative
                  ? (isLoading ? "Loading ad…" : isReady ? "Watch Ad" : "Preparing…")
                  : `Play ${SIM_AD_SECONDS}s Video`}
              </Button>
              {!isNative && (
                <p className="text-[10px] text-muted-foreground">
                  Simulated player on web — real Unity Ads run in the mobile app.
                </p>
              )}
            </div>
          )}

          {phase === "playing" && !isNative && (
            <div className="space-y-3">
              <div className="relative aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 border border-border/60">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white space-y-3">
                    <div className="mx-auto w-16 h-16 rounded-full bg-white/10 backdrop-blur flex items-center justify-center animate-pulse">
                      <Play className="w-8 h-8" />
                    </div>
                    <p className="text-sm opacity-90">Sponsored Video</p>
                    <p className="text-3xl font-bold tabular-nums">{remaining}s</p>
                  </div>
                </div>
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 text-[10px] text-white tracking-wide">AD</div>
                <div className="absolute top-2 right-2 flex items-center gap-1 text-white/80">
                  <Volume2 className="w-3.5 h-3.5" />
                  <X className="w-3.5 h-3.5 opacity-40" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-success transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Please wait — your reward unlocks when the video ends.
              </p>
            </div>
          )}

          {phase === "playing" && isNative && (
            <div className="py-8 text-center space-y-3">
              <div className="w-14 h-14 mx-auto border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Showing Unity rewarded ad…</p>
            </div>
          )}

          {phase === "done" && (
            <div className="text-center space-y-4 py-2">
              <div className="w-24 h-24 mx-auto rounded-full bg-success/20 flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-success" />
              </div>
              <p className="text-lg font-semibold text-success">
                +{coinsEarned} XD Coins
              </p>
              <p className="text-sm text-muted-foreground">
                {isGuest ? "Saved to your guest session wallet." : "Added to your balance."}
              </p>
              <Button onClick={handleClose} variant="outline" className="w-full">
                Continue
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WatchAdModal;
