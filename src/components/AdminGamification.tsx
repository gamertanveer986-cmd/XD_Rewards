import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Trophy, Award, Loader2 } from "lucide-react";

interface GamificationConfig {
  id: string;
  feature_key: string;
  feature_name: string;
  is_enabled: boolean;
  config_json: any;
  updated_at: string;
}

const AdminGamification = () => {
  const [configs, setConfigs] = useState<GamificationConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [taskMilestones, setTaskMilestones] = useState("3:100,5:250,10:500");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const configRes = await supabase.from("gamification_config").select("*");

      if (configRes.data) {
        setConfigs(configRes.data);
        
        configRes.data.forEach((cfg) => {
          const json = cfg.config_json as Record<string, any>;
          if (cfg.feature_key === "task_bonus") {
            const milestones = json?.milestones || [];
            setTaskMilestones(milestones.map((m: any) => `${m.tasks}:${m.reward}`).join(","));
          }
        });
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

  const getFeatureEnabled = (key: string) => {
    return configs.find((c) => c.feature_key === key)?.is_enabled ?? true;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
    </div>
  );
};

export default AdminGamification;