import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAdMob } from "@/hooks/useAdMob";
import { CheckCircle, Zap, AlertCircle } from "lucide-react";

interface WatchAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onAdComplete: () => void;
}

const WatchAdModal = ({ isOpen, onClose, userId, onAdComplete }: WatchAdModalProps) => {
  const [isWatching, setIsWatching] = useState(false);
  const [adCompleted, setAdCompleted] = useState(false);
  const { watchAd, isAdReady, isLoading, isNative, initError, loadRewardedAd } = useAdMob();

  const handleWatchAd = async () => {
    console.log('[WatchAdModal] Watch Ad clicked. isNative:', isNative, 'isAdReady:', isAdReady);

    if (!isNative) {
      toast.error("Ads only work on the mobile app. Please install the Android/iOS app.");
      return;
    }

    if (!isAdReady) {
      toast.error("Ad not ready yet. Please wait...");
      return;
    }

    setIsWatching(true);
    setAdCompleted(false);

    // Real ad on mobile — reward ONLY granted on real AdMob "Rewarded" event
    const result = await watchAd();
    setIsWatching(false);

    if (result.success && result.reward) {
      console.log('[WatchAdModal] ✅ Real reward earned from AdMob:', result.reward);
      await recordAdView();
      setAdCompleted(true);
    } else {
      console.error('[WatchAdModal] ❌ No reward — ad failed or closed early:', result.error);
      toast.error(result.error || "Ad was not completed. No reward given.");
    }
  };

  const recordAdView = async () => {
    try {
      const { data, error } = await supabase.rpc('record_ad_completion', {
        p_user_id: userId,
        p_ad_duration: 12
      });

      if (error) {
        console.error('Error recording task:', error);
        toast.error("Failed to record points. Please try again.");
        return;
      }

      const result = data as { earnings: number; success: boolean };
      const coinsEarned = Math.floor(result.earnings * 100);
      toast.success(`You earned ${coinsEarned} XD Coins!`);
      onAdComplete();
    } catch (err) {
      console.error('Error in recordAdView:', err);
      toast.error("An error occurred. Please try again.");
    }
  };

  const handleClose = () => {
    if (!isWatching) {
      setAdCompleted(false);
      onClose();
    }
  };

  const handleRetryLoad = async () => {
    console.log('[WatchAdModal] Manual retry load');
    await loadRewardedAd();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            {adCompleted ? (
              <>
                <CheckCircle className="w-5 h-5 text-success" />
                Reward Earned!
              </>
            ) : isWatching ? (
              "Showing ad..."
            ) : (
              <>
                <Zap className="w-5 h-5 text-primary" />
                Watch Ad to Earn
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {!isWatching && !adCompleted && (
            <div className="text-center space-y-4">
              <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
                <Zap className="w-12 h-12 text-primary" />
              </div>
              <div className="space-y-2">
                <p className="text-foreground font-medium">
                  Watch a full ad to earn XD Coins.
                </p>
                <p className="text-sm text-muted-foreground">
                  Reward is granted only after the ad completes.
                </p>
              </div>

              {!isNative && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg text-left">
                  <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">
                    Ads only work in the installed mobile app. Web preview cannot show real ads.
                  </p>
                </div>
              )}

              {isNative && initError && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg text-left">
                  <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{initError}</p>
                </div>
              )}

              {isNative && !initError && !isAdReady && (
                <p className="text-sm text-muted-foreground">
                  {isLoading ? "Loading ad..." : "Preparing ad..."}
                </p>
              )}

              {isNative && !initError && isAdReady && (
                <p className="text-sm text-success">✓ Ad ready</p>
              )}

              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleWatchAd}
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={!isNative || isLoading || !isAdReady}
                >
                  {!isNative
                    ? "Mobile App Only"
                    : isLoading
                    ? "Loading Ad..."
                    : !isAdReady
                    ? "Ad Not Ready"
                    : "Watch Ad"}
                </Button>

                {isNative && !isAdReady && !isLoading && (
                  <Button onClick={handleRetryLoad} variant="outline" className="w-full">
                    Retry Load
                  </Button>
                )}
              </div>
            </div>
          )}

          {isWatching && (
            <div className="space-y-4">
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-lg font-medium">Ad is playing...</p>
                  <p className="text-sm text-muted-foreground">Watch fully to earn reward</p>
                </div>
              </div>
            </div>
          )}

          {adCompleted && (
            <div className="text-center space-y-4">
              <div className="w-24 h-24 bg-success/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-12 h-12 text-success" />
              </div>
              <p className="text-lg font-medium text-success">XD Coins Collected!</p>
              <p className="text-muted-foreground">Your XD Coins have been added to your balance</p>
              <Button onClick={handleClose} className="w-full" variant="outline">
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
