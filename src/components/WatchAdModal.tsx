import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAdMob } from "@/hooks/useAdMob";
import { CheckCircle, Zap } from "lucide-react";

interface WatchAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onAdComplete: () => void;
}

const WatchAdModal = ({ isOpen, onClose, userId, onAdComplete }: WatchAdModalProps) => {
  const [isWatching, setIsWatching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [adCompleted, setAdCompleted] = useState(false);
  const { watchAd, isAdReady, isLoading, isNative, initError } = useAdMob();

  const handleWatchAd = async () => {
    setIsWatching(true);
    setProgress(0);
    setAdCompleted(false);

    if (isNative) {
      // Real ad on mobile
      const result = await watchAd();
      if (result.success) {
        await recordAdView();
        setAdCompleted(true);
      } else {
        toast.error(result.error || "Ad failed to load. Please try again.");
      }
      setIsWatching(false);
    } else {
      // Simulate ad watching on web (12 seconds)
      const duration = 12;
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + (100 / duration);
        });
      }, 1000);

      setTimeout(async () => {
        clearInterval(interval);
        setProgress(100);
        await recordAdView();
        setAdCompleted(true);
        setIsWatching(false);
      }, duration * 1000);
    }
  };

  const recordAdView = async () => {
    try {
      // Call the secure server-side function to record ad completion
      // Points are calculated server-side to prevent manipulation
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
      // Convert earnings to XD Coins (multiply by 100)
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
      setProgress(0);
      setAdCompleted(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            {adCompleted ? (
              <>
                <CheckCircle className="w-5 h-5 text-success" />
                Task Completed!
              </>
            ) : isWatching ? (
              "Verifying your task reward..."
            ) : (
              <>
                <Zap className="w-5 h-5 text-primary" />
                Fast Reward Task
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
                  Complete tasks to earn XD Coins.
                </p>
                <p className="text-sm text-muted-foreground">
                  Rewards are not guaranteed and depend on system conditions.
                </p>
              </div>
              {isNative && initError && (
                <p className="text-sm text-destructive">{initError}. Please reopen the app.</p>
              )}
              {isNative && !initError && !isAdReady && (
                <p className="text-sm text-muted-foreground">
                  {isLoading ? "Loading task..." : "Preparing task..."}
                </p>
              )}
              <Button 
                onClick={handleWatchAd} 
                className="w-full bg-primary hover:bg-primary/90"
                disabled={isLoading}
              >
                {isLoading ? "Loading..." : "Start Fast Reward Task"}
              </Button>
            </div>
          )}

          {isWatching && !isNative && (
            <div className="space-y-4">
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-lg font-medium">Verifying your task reward...</p>
                  <p className="text-sm text-muted-foreground">Do not close this window</p>
                </div>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-center text-sm text-muted-foreground">
                {Math.ceil(12 - (progress / 100) * 12)} seconds remaining
              </p>
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
