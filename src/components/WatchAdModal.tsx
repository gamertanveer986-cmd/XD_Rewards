import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAdMob } from "@/hooks/useAdMob";

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
  const { watchAd, isAdReady, isLoading, isNative } = useAdMob();

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
        toast.error("Ad failed to load. Please try again.");
      }
      setIsWatching(false);
    } else {
      // Simulate ad watching on web (for testing)
      const duration = 15; // 15 seconds
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
        p_ad_duration: 15
      });

      if (error) {
        console.error('Error recording ad view:', error);
        toast.error("Failed to record points. Please try again.");
        return;
      }

      const result = data as { earnings: number; success: boolean };
      // Convert earnings to points (multiply by 100)
      const pointsEarned = Math.floor(result.earnings * 100);
      toast.success(`You collected ${pointsEarned} points!`);
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
          <DialogTitle className="text-center">
            {adCompleted ? "🎉 Points Collected!" : isWatching ? "Watching Ad..." : "Watch to Collect Points"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {!isWatching && !adCompleted && (
            <div className="text-center space-y-4">
              <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
                <span className="text-5xl">🎬</span>
              </div>
              <p className="text-muted-foreground">
                Watch a {isNative ? "video" : "15-second"} ad to collect 5-10 points
              </p>
              {isNative && !isAdReady && (
                <p className="text-sm text-muted-foreground">
                  {isLoading ? "Loading ad..." : "Preparing ad..."}
                </p>
              )}
              <Button 
                onClick={handleWatchAd} 
                className="w-full bg-primary hover:bg-primary/90"
                disabled={isLoading}
              >
                {isLoading ? "Loading..." : "Start Watching"}
              </Button>
            </div>
          )}

          {isWatching && !isNative && (
            <div className="space-y-4">
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-lg font-medium">Ad Playing...</p>
                  <p className="text-sm text-muted-foreground">Do not close this window</p>
                </div>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-center text-sm text-muted-foreground">
                {Math.ceil(15 - (progress / 100) * 15)} seconds remaining
              </p>
            </div>
          )}

          {adCompleted && (
            <div className="text-center space-y-4">
              <div className="w-24 h-24 bg-success/20 rounded-full flex items-center justify-center mx-auto">
                <span className="text-5xl">✅</span>
              </div>
              <p className="text-lg font-medium text-success">Points Collected!</p>
              <p className="text-muted-foreground">Your points have been added to your balance</p>
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
