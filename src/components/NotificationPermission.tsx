import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bell, BellOff, X, Gift, Coins, AlertCircle, Trophy } from "lucide-react";

interface NotificationPermissionProps {
  userId: string;
  onClose?: () => void;
}

const NotificationPermission = ({ userId, onClose }: NotificationPermissionProps) => {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enabling, setEnabling] = useState(false);

  useEffect(() => {
    const checkPermission = async () => {
      try {
        // Get user's notification preference
        const { data: pref } = await supabase
          .from("notification_preferences")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (!pref) {
          // First time - show popup
          setShowModal(true);
        } else if (!pref.notifications_enabled) {
          // User disabled - check if 24 hours passed
          const lastPrompt = pref.last_prompt_at ? new Date(pref.last_prompt_at) : null;
          const now = new Date();

          if (!lastPrompt || now.getTime() - lastPrompt.getTime() > 24 * 60 * 60 * 1000) {
            // 24 hours passed, show reminder
            setShowModal(true);
          }
        }
      } catch (error) {
        console.error("Error checking notification permission:", error);
      } finally {
        setLoading(false);
      }
    };

    checkPermission();
  }, [userId]);

  const handleAllow = async () => {
    setEnabling(true);
    try {
      // Request browser notification permission if available
      if ("Notification" in window) {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          console.log("Browser notification permission denied");
        }
      }

      // Save preference
      await supabase
        .from("notification_preferences")
        .upsert({
          user_id: userId,
          notifications_enabled: true,
          last_prompt_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id",
        });

      setShowModal(false);
      onClose?.();
    } catch (error) {
      console.error("Error enabling notifications:", error);
    } finally {
      setEnabling(false);
    }
  };

  const handleDismiss = async () => {
    try {
      // Save preference with disabled state
      await supabase
        .from("notification_preferences")
        .upsert({
          user_id: userId,
          notifications_enabled: false,
          last_prompt_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id",
        });

      setShowModal(false);
      onClose?.();
    } catch (error) {
      console.error("Error saving notification preference:", error);
    }
  };

  if (loading || !showModal) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <Card className="w-full max-w-sm p-6 bg-card border-primary/30 relative overflow-hidden animate-scale-in">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -ml-12 -mb-12" />

        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative z-10">
          {/* Icon */}
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 animate-pulse-glow">
            <Bell className="w-8 h-8 text-primary" />
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-center mb-2">
            Stay Updated!
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-6">
            Enable notifications to never miss rewards and updates
          </p>

          {/* Benefits */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
              <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center shrink-0">
                <Gift className="w-4 h-4 text-success" />
              </div>
              <div>
                <p className="text-sm font-medium">Reward Alerts</p>
                <p className="text-xs text-muted-foreground">Get notified when you earn rewards</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Coins className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Redeem Codes</p>
                <p className="text-xs text-muted-foreground">Be first to know about promo codes</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
              <div className="w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
                <Trophy className="w-4 h-4 text-warning" />
              </div>
              <div>
                <p className="text-sm font-medium">Event Updates</p>
                <p className="text-xs text-muted-foreground">Special events and bonus opportunities</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Withdrawal Updates</p>
                <p className="text-xs text-muted-foreground">Track your withdrawal status</p>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="space-y-2">
            <Button
              onClick={handleAllow}
              disabled={enabling}
              className="w-full bg-primary hover:bg-primary/90 font-bold"
            >
              <Bell className="w-4 h-4 mr-2" />
              {enabling ? "Enabling..." : "Allow Notifications"}
            </Button>

            <Button
              onClick={handleDismiss}
              variant="ghost"
              className="w-full text-muted-foreground hover:text-foreground"
            >
              <BellOff className="w-4 h-4 mr-2" />
              Maybe Later
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground text-center mt-4">
            You can change this in your profile settings anytime
          </p>
        </div>
      </Card>
    </div>
  );
};

export default NotificationPermission;
