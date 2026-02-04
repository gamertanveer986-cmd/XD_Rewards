import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Settings, RotateCw, Trophy, Award, Instagram, Loader2, CheckCircle, XCircle, Image, Eye } from "lucide-react";

interface GamificationConfig {
  id: string;
  feature_key: string;
  feature_name: string;
  is_enabled: boolean;
  config_json: any;
  updated_at: string;
}

interface SocialSubmission {
  id: string;
  user_id: string;
  task_type: string;
  platform: string;
  screenshot_url: string;
  status: string;
  reward_amount: number | null;
  admin_notes: string | null;
  submitted_at: string;
}

const AdminGamification = () => {
  const [configs, setConfigs] = useState<GamificationConfig[]>([]);
  const [submissions, setSubmissions] = useState<SocialSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<"settings" | "social">("settings");

  // Form states
  const [spinDailyLimit, setSpinDailyLimit] = useState("2");
  const [spinCooldown, setSpinCooldown] = useState("12");
  const [spinRewards, setSpinRewards] = useState("100,150,200,250,300,350,400,500");
  
  const [taskMilestones, setTaskMilestones] = useState("3:100,5:250,10:500");
  
  const [instagramFollow, setInstagramFollow] = useState("50");
  const [instagramLike, setInstagramLike] = useState("25");
  const [instagramHandle, setInstagramHandle] = useState("@xd_rewards_official");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [configRes, submissionsRes] = await Promise.all([
        supabase.from("gamification_config").select("*"),
        supabase.from("social_task_submissions").select("*").order("submitted_at", { ascending: false }),
      ]);

      if (configRes.data) {
        setConfigs(configRes.data);
        
        // Parse configs
        configRes.data.forEach((cfg) => {
          const json = cfg.config_json as Record<string, any>;
          if (cfg.feature_key === "spin_wheel") {
            setSpinDailyLimit(String(json?.daily_spins || 2));
            setSpinCooldown(String(json?.cooldown_hours || 12));
            setSpinRewards((json?.rewards || []).join(","));
          } else if (cfg.feature_key === "task_bonus") {
            const milestones = json?.milestones || [];
            setTaskMilestones(milestones.map((m: any) => `${m.tasks}:${m.reward}`).join(","));
          } else if (cfg.feature_key === "social_tasks") {
            setInstagramFollow(String(json?.instagram_follow_reward || 50));
            setInstagramLike(String(json?.instagram_like_reward || 25));
            setInstagramHandle(json?.instagram_handle || "@xd_rewards_official");
          }
        });
      }

      if (submissionsRes.data) {
        setSubmissions(submissionsRes.data);
      }
    } catch (error) {
      console.error("Error loading gamification data:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFeature = async (featureKey: string, enabled: boolean) => {
    const { error } = await supabase
      .from("gamification_config")
      .update({ is_enabled: enabled, updated_at: new Date().toISOString() })
      .eq("feature_key", featureKey);

    if (error) {
      toast.error("Failed to update");
    } else {
      toast.success(`Feature ${enabled ? "enabled" : "disabled"}`);
      setConfigs((prev) =>
        prev.map((c) => (c.feature_key === featureKey ? { ...c, is_enabled: enabled } : c))
      );
    }
  };

  const saveSpinConfig = async () => {
    setSaving(true);
    const rewards = spinRewards.split(",").map((r) => parseInt(r.trim())).filter((r) => !isNaN(r));
    
    const { error } = await supabase
      .from("gamification_config")
      .update({
        config_json: {
          daily_spins: parseInt(spinDailyLimit),
          cooldown_hours: parseInt(spinCooldown),
          rewards,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("feature_key", "spin_wheel");

    if (error) {
      toast.error("Failed to save");
    } else {
      toast.success("Spin wheel config saved");
    }
    setSaving(false);
  };

  const saveTaskConfig = async () => {
    setSaving(true);
    const milestones = taskMilestones.split(",").map((m) => {
      const [tasks, reward] = m.split(":").map((v) => parseInt(v.trim()));
      return { tasks, reward };
    }).filter((m) => !isNaN(m.tasks) && !isNaN(m.reward));
    
    const { error } = await supabase
      .from("gamification_config")
      .update({
        config_json: { milestones },
        updated_at: new Date().toISOString(),
      })
      .eq("feature_key", "task_bonus");

    if (error) {
      toast.error("Failed to save");
    } else {
      toast.success("Task bonus config saved");
    }
    setSaving(false);
  };

  const saveSocialConfig = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("gamification_config")
      .update({
        config_json: {
          instagram_follow_reward: parseInt(instagramFollow),
          instagram_like_reward: parseInt(instagramLike),
          instagram_handle: instagramHandle,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("feature_key", "social_tasks");

    if (error) {
      toast.error("Failed to save");
    } else {
      toast.success("Social tasks config saved");
    }
    setSaving(false);
  };

  const handleApproveSubmission = async (id: string, approved: boolean) => {
    const { data, error } = await supabase.rpc("approve_social_task", {
      p_submission_id: id,
      p_approved: approved,
      p_admin_notes: null,
    });

    if (error) {
      toast.error("Failed to process");
    } else {
      toast.success(approved ? "Approved and rewarded" : "Rejected");
      loadData();
    }
  };

  const getFeatureEnabled = (key: string) => {
    return configs.find((c) => c.feature_key === key)?.is_enabled ?? true;
  };

  const pendingSubmissions = submissions.filter((s) => s.status === "pending");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Section Toggle */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={activeSection === "settings" ? "default" : "outline"}
          onClick={() => setActiveSection("settings")}
          className="text-xs"
        >
          <Settings className="w-3 h-3 mr-1" />
          Settings
        </Button>
        <Button
          size="sm"
          variant={activeSection === "social" ? "default" : "outline"}
          onClick={() => setActiveSection("social")}
          className="text-xs"
        >
          <Instagram className="w-3 h-3 mr-1" />
          Social Verifications
          {pendingSubmissions.length > 0 && (
            <span className="ml-1 bg-destructive text-destructive-foreground rounded-full w-4 h-4 text-[10px] flex items-center justify-center">
              {pendingSubmissions.length}
            </span>
          )}
        </Button>
      </div>

      {activeSection === "settings" && (
        <div className="space-y-4">
          {/* Spin Wheel Settings */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <RotateCw className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">Spin & Earn</h3>
              </div>
              <Switch
                checked={getFeatureEnabled("spin_wheel")}
                onCheckedChange={(checked) => toggleFeature("spin_wheel", checked)}
              />
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Daily Spins Limit</label>
                <Input
                  value={spinDailyLimit}
                  onChange={(e) => setSpinDailyLimit(e.target.value)}
                  className="h-8 text-xs"
                  type="number"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Cooldown (hours)</label>
                <Input
                  value={spinCooldown}
                  onChange={(e) => setSpinCooldown(e.target.value)}
                  className="h-8 text-xs"
                  type="number"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Rewards (comma-separated coins)</label>
                <Input
                  value={spinRewards}
                  onChange={(e) => setSpinRewards(e.target.value)}
                  className="h-8 text-xs"
                  placeholder="100,150,200,250,300,350,400,500"
                />
              </div>
              <Button size="sm" onClick={saveSpinConfig} disabled={saving} className="text-xs">
                Save Spin Config
              </Button>
            </div>
          </Card>

          {/* Task Bonus Settings */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-warning" />
                <h3 className="font-semibold text-sm">Task Bonus</h3>
              </div>
              <Switch
                checked={getFeatureEnabled("task_bonus")}
                onCheckedChange={(checked) => toggleFeature("task_bonus", checked)}
              />
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Milestones (tasks:coins, comma-separated)</label>
                <Input
                  value={taskMilestones}
                  onChange={(e) => setTaskMilestones(e.target.value)}
                  className="h-8 text-xs"
                  placeholder="3:100,5:250,10:500"
                />
              </div>
              <Button size="sm" onClick={saveTaskConfig} disabled={saving} className="text-xs">
                Save Task Config
              </Button>
            </div>
          </Card>

          {/* Badge Settings */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-400" />
                <h3 className="font-semibold text-sm">Badges</h3>
              </div>
              <Switch
                checked={getFeatureEnabled("badges")}
                onCheckedChange={(checked) => toggleFeature("badges", checked)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Badges are automatically awarded based on user achievements (first withdrawal, referrals, streaks, tasks).
            </p>
          </Card>

          {/* Social Tasks Settings */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Instagram className="w-4 h-4 text-pink-400" />
                <h3 className="font-semibold text-sm">Social Tasks</h3>
              </div>
              <Switch
                checked={getFeatureEnabled("social_tasks")}
                onCheckedChange={(checked) => toggleFeature("social_tasks", checked)}
              />
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Instagram Handle</label>
                <Input
                  value={instagramHandle}
                  onChange={(e) => setInstagramHandle(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Follow Reward (coins)</label>
                  <Input
                    value={instagramFollow}
                    onChange={(e) => setInstagramFollow(e.target.value)}
                    className="h-8 text-xs"
                    type="number"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Like Reward (coins)</label>
                  <Input
                    value={instagramLike}
                    onChange={(e) => setInstagramLike(e.target.value)}
                    className="h-8 text-xs"
                    type="number"
                  />
                </div>
              </div>
              <Button size="sm" onClick={saveSocialConfig} disabled={saving} className="text-xs">
                Save Social Config
              </Button>
            </div>
          </Card>
        </div>
      )}

      {activeSection === "social" && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase">
            Pending Verifications ({pendingSubmissions.length})
          </p>

          {pendingSubmissions.length === 0 ? (
            <Card className="p-6 text-center">
              <CheckCircle className="w-8 h-8 text-success mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">All submissions verified!</p>
            </Card>
          ) : (
            pendingSubmissions.map((sub) => (
              <Card key={sub.id} className="p-3">
                <div className="flex items-start gap-3">
                  <a
                    href={sub.screenshot_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-16 h-16 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden"
                  >
                    <img
                      src={sub.screenshot_url}
                      alt="Screenshot"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </a>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium capitalize">{sub.task_type}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(sub.submitted_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">
                      User: {sub.user_id.slice(0, 8)}...
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        onClick={() => handleApproveSubmission(sub.id, true)}
                        className="h-6 text-[10px] bg-success hover:bg-success/90"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApproveSubmission(sub.id, false)}
                        className="h-6 text-[10px] text-destructive border-destructive"
                      >
                        <XCircle className="w-3 h-3 mr-1" />
                        Reject
                      </Button>
                      <a
                        href={sub.screenshot_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-6 px-2 text-[10px] border rounded flex items-center gap-1 text-muted-foreground hover:text-foreground"
                      >
                        <Eye className="w-3 h-3" />
                        View
                      </a>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}

          {/* All Submissions History */}
          <div className="mt-6">
            <p className="text-xs font-medium text-muted-foreground uppercase mb-3">
              All Submissions ({submissions.length})
            </p>
            <div className="space-y-2">
              {submissions.slice(0, 20).map((sub) => (
                <div
                  key={sub.id}
                  className={`p-2 rounded text-xs flex items-center gap-2 ${
                    sub.status === "approved"
                      ? "bg-success/10"
                      : sub.status === "rejected"
                      ? "bg-destructive/10"
                      : "bg-muted/30"
                  }`}
                >
                  <span className="font-mono">{sub.user_id.slice(0, 8)}</span>
                  <span className="capitalize">{sub.task_type}</span>
                  <span
                    className={`ml-auto ${
                      sub.status === "approved"
                        ? "text-success"
                        : sub.status === "rejected"
                        ? "text-destructive"
                        : "text-warning"
                    }`}
                  >
                    {sub.status}
                  </span>
                  {sub.reward_amount && (
                    <span className="text-success">+{sub.reward_amount}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminGamification;
