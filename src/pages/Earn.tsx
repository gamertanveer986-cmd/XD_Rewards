import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/AppLayout";
import WatchAdModal from "@/components/WatchAdModal";
import XDCoin from "@/components/XDCoin";
import Disclaimer from "@/components/Disclaimer";
import { toast } from "sonner";
import { Zap, Clock, CheckCircle, Target, TrendingUp, Shield } from "lucide-react";

interface TaskConfig {
  id: string;
  title: string;
  description: string;
  reward: number;
  icon: typeof Zap;
  color: string;
  bg: string;
  cooldown: number; // seconds
}

const TASKS: TaskConfig[] = [
  {
    id: "watch_ad",
    title: "Watch Ad",
    description: "Watch a short ad to earn coins",
    reward: 10,
    icon: Zap,
    color: "text-primary",
    bg: "bg-primary/20",
    cooldown: 15,
  },
  {
    id: "complete_task",
    title: "Complete Task",
    description: "Finish a quick activity for coins",
    reward: 10,
    icon: Target,
    color: "text-success",
    bg: "bg-success/20",
    cooldown: 15,
  },
];

const Earn = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAdModal, setShowAdModal] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      setUser(session.user);
      setIsEmailVerified(session.user.email_confirmed_at != null);
      const { data } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .single();
      setProfile(data);
      setLoading(false);
    };
    checkAuth();
  }, [navigate]);

  // Cooldown timers
  useEffect(() => {
    const interval = setInterval(() => {
      setCooldowns(prev => {
        const next = { ...prev };
        for (const key in next) {
          if (next[key] > 0) next[key] -= 1;
          else delete next[key];
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleTaskClick = (task: TaskConfig) => {
    if (!isEmailVerified) {
      toast.error("Please verify your email first");
      return;
    }
    if (cooldowns[task.id]) {
      toast.error(`Please wait ${cooldowns[task.id]}s before trying again`);
      return;
    }
    setShowAdModal(true);
  };

  const handleAdComplete = () => {
    // Set cooldown for the task
    setCooldowns(prev => ({ ...prev, watch_ad: 15, complete_task: 15 }));
    if (user) {
      supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => setProfile(data));
    }
  };

  const totalCoins = Math.floor((profile?.total_earnings || 0) * 100);
  const tasksToday = profile?.ads_watched || 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AppLayout title="Earn XD Coins">
      <div className="px-4 py-4 space-y-4">
        {/* Stats Header */}
        <Card className="p-4 bg-gradient-to-r from-primary/15 via-card to-card border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Your Balance</p>
              <div className="flex items-center gap-2 mt-1">
                <XDCoin size="lg" />
                <span className="text-2xl font-bold text-success">{totalCoins.toLocaleString()}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-3 py-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-success" />
                <span className="text-sm font-semibold">{tasksToday}</span>
                <span className="text-[10px] text-muted-foreground">today</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Available Tasks */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground px-1 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Available Tasks
          </h2>
          
          {TASKS.map((task) => {
            const isOnCooldown = !!cooldowns[task.id];
            const Icon = task.icon;
            
            return (
              <Card 
                key={task.id} 
                className={`p-4 bg-card border-border/50 transition-all duration-300 ${
                  isOnCooldown ? "opacity-60" : "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl ${task.bg} flex items-center justify-center shrink-0 shadow-inner`}>
                    <Icon className={`w-7 h-7 ${task.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm">{task.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                    <div className="flex items-center gap-1 mt-1.5">
                      <XDCoin size="sm" />
                      <span className="text-xs font-bold text-success">+{task.reward} XD Coins</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className={`shrink-0 px-5 h-10 font-semibold ${
                      isOnCooldown ? "" : "bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
                    }`}
                    variant={isOnCooldown ? "secondary" : "default"}
                    disabled={isOnCooldown || !isEmailVerified}
                    onClick={() => handleTaskClick(task)}
                  >
                    {isOnCooldown ? (
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {cooldowns[task.id]}s
                      </span>
                    ) : !isEmailVerified ? (
                      "Verify Email"
                    ) : (
                      "Start"
                    )}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Daily Progress */}
        <Card className="p-4 bg-card border-border/50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Today's Progress</h3>
            <span className="text-xs text-muted-foreground">{tasksToday} tasks</span>
          </div>
          <div className="space-y-2">
            {[5, 10, 20, 50].map((milestone) => {
              const reached = tasksToday >= milestone;
              return (
                <div key={milestone} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                    reached ? "bg-success/20" : "bg-muted/30"
                  }`}>
                    {reached ? (
                      <CheckCircle className="w-4 h-4 text-success" />
                    ) : (
                      <span className="text-[10px] text-muted-foreground">{milestone}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-success rounded-full transition-all duration-500"
                        style={{ width: `${Math.min((tasksToday / milestone) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className={`text-xs font-medium ${reached ? "text-success" : "text-muted-foreground"}`}>
                    {milestone} tasks
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Anti-fraud notice */}
        <Card className="p-3 bg-destructive/5 border-destructive/20">
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-[10px] text-muted-foreground">
              Automated clicking, bots, or suspicious patterns will result in account suspension. Play fair!
            </p>
          </div>
        </Card>

        <Disclaimer variant="compact" />
      </div>

      {user && (
        <WatchAdModal
          isOpen={showAdModal}
          onClose={() => setShowAdModal(false)}
          userId={user.id}
          onAdComplete={handleAdComplete}
        />
      )}
    </AppLayout>
  );
};

export default Earn;
