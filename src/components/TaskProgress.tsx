import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Target, CheckCircle2 } from "lucide-react";
import XDCoin from "./XDCoin";

interface TaskProgressProps {
  userId: string;
}

interface Milestone {
  tasks: number;
  reward: number;
}

const TaskProgress = ({ userId }: TaskProgressProps) => {
  const [tasksCompleted, setTasksCompleted] = useState(0);
  const [lastMilestoneClaimed, setLastMilestoneClaimed] = useState(0);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isEnabled, setIsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        // Get config
        const { data: config } = await supabase
          .from("gamification_config")
          .select("is_enabled, config_json")
          .eq("feature_key", "task_bonus")
          .single();

        if (config) {
          setIsEnabled(config.is_enabled);
          const configJson = config.config_json as { milestones?: Milestone[] };
          setMilestones(configJson?.milestones || []);
        }

        // Get user progress
        const { data: progress } = await supabase
          .from("task_progress")
          .select("tasks_completed, last_milestone_claimed")
          .eq("user_id", userId)
          .single();

        if (progress) {
          setTasksCompleted(progress.tasks_completed);
          setLastMilestoneClaimed(progress.last_milestone_claimed);
        }
      } catch (error) {
        console.error("Error fetching task progress:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();

    // Subscribe to changes
    const channel = supabase
      .channel("task_progress_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "task_progress",
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          if (payload.new) {
            setTasksCompleted(payload.new.tasks_completed);
            setLastMilestoneClaimed(payload.new.last_milestone_claimed);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  if (loading || !isEnabled || milestones.length === 0) {
    return null;
  }

  // Find next milestone
  const nextMilestone = milestones.find(m => m.tasks > lastMilestoneClaimed);
  const progressPercent = nextMilestone
    ? Math.min(100, (tasksCompleted / nextMilestone.tasks) * 100)
    : 100;

  return (
    <Card className="p-4 bg-card border-border/50">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-5 h-5 text-warning" />
        <h3 className="font-bold text-base">Task Bonus Progress</h3>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-muted-foreground">
            {tasksCompleted} / {nextMilestone?.tasks || milestones[milestones.length - 1].tasks} tasks
          </span>
          {nextMilestone && (
            <div className="flex items-center gap-1 text-sm text-success">
              <XDCoin size="sm" />
              <span>+{nextMilestone.reward}</span>
            </div>
          )}
        </div>
        <Progress value={progressPercent} className="h-3" />
      </div>

      {/* Milestones */}
      <div className="flex justify-between items-center gap-2">
        {milestones.map((milestone, index) => {
          const isCompleted = lastMilestoneClaimed >= milestone.tasks;
          const isCurrent =
            tasksCompleted >= milestone.tasks && lastMilestoneClaimed < milestone.tasks;

          return (
            <div
              key={index}
              className={`flex flex-col items-center p-2 rounded-lg transition-all ${
                isCompleted
                  ? "bg-success/20 text-success"
                  : isCurrent
                  ? "bg-primary/20 text-primary animate-pulse"
                  : "bg-muted/30 text-muted-foreground"
              }`}
            >
              <div className="relative">
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Target className="w-5 h-5" />
                )}
              </div>
              <span className="text-xs font-medium mt-1">{milestone.tasks}</span>
              <div className="flex items-center gap-0.5 text-[10px]">
                <XDCoin size="xs" />
                <span>{milestone.reward}</span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-muted-foreground text-center mt-3">
        Complete tasks to earn bonus XD Coins. Auto-credited upon completion.
      </p>
    </Card>
  );
};

export default TaskProgress;
