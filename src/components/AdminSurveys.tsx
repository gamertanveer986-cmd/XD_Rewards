import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

interface SurveyTask {
  id: string;
  task_type: string;
  title: string;
  description: string | null;
  questions: any;
  reward_coins: number;
  time_limit_seconds: number | null;
  is_active: boolean;
  created_at: string;
}

const AdminSurveys = () => {
  const [tasks, setTasks] = useState<SurveyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taskType, setTaskType] = useState<"survey" | "time_task">("survey");
  const [rewardCoins, setRewardCoins] = useState("100");
  const [timeLimit, setTimeLimit] = useState("60");
  const [questionsText, setQuestionsText] = useState("");

  const loadTasks = async () => {
    try {
      const { data } = await supabase
        .from("survey_tasks")
        .select("*")
        .order("created_at", { ascending: false });
      setTasks((data as any[]) || []);
    } catch (e) {
      console.error("Failed to load survey tasks:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const createTask = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    const reward = parseInt(rewardCoins);
    if (!reward || reward <= 0) {
      toast.error("Enter a valid reward in XD Coins");
      return;
    }

    let questions: any[] = [];
    if (taskType === "survey") {
      questions = questionsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [q, opts] = line.split("|").map((p) => p.trim());
          return {
            q,
            options: opts ? opts.split(";").map((o) => o.trim()).filter(Boolean) : [],
          };
        });
      if (questions.length === 0) {
        toast.error("Add at least one question (one per line)");
        return;
      }
    }

    setSaving(true);
    const { error } = await supabase.from("survey_tasks").insert({
      task_type: taskType,
      title: title.trim(),
      description: description.trim() || null,
      questions,
      reward_coins: reward,
      time_limit_seconds: taskType === "time_task" ? parseInt(timeLimit) || 60 : null,
      is_active: true,
    });
    setSaving(false);

    if (error) {
      toast.error("Failed to create task");
      console.error(error);
      return;
    }
    toast.success("Task created and live for users");
    setTitle("");
    setDescription("");
    setQuestionsText("");
    loadTasks();
  };

  const toggleActive = async (task: SurveyTask) => {
    const { error } = await supabase
      .from("survey_tasks")
      .update({ is_active: !task.is_active })
      .eq("id", task.id);
    if (error) {
      toast.error("Failed to update");
      return;
    }
    toast.success(task.is_active ? "Task hidden from users" : "Task is live again");
    loadTasks();
  };

  const deleteTask = async (task: SurveyTask) => {
    const { error } = await supabase.from("survey_tasks").delete().eq("id", task.id);
    if (error) {
      toast.error("Failed to delete");
      return;
    }
    toast.success("Task deleted");
    loadTasks();
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
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold text-sm">Create Earning Task</h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={taskType === "survey" ? "default" : "outline"}
            className="text-xs flex-1"
            onClick={() => setTaskType("survey")}
          >
            Survey
          </Button>
          <Button
            size="sm"
            variant={taskType === "time_task" ? "default" : "outline"}
            className="text-xs flex-1"
            onClick={() => setTaskType("time_task")}
          >
            Time Task
          </Button>
        </div>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="h-8 text-xs" />
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short description"
          className="h-8 text-xs"
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-muted-foreground">Reward (XD Coins)</label>
            <Input value={rewardCoins} onChange={(e) => setRewardCoins(e.target.value)} className="h-8 text-xs" />
          </div>
          {taskType === "time_task" && (
            <div>
              <label className="text-[10px] text-muted-foreground">Duration (seconds)</label>
              <Input value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} className="h-8 text-xs" />
            </div>
          )}
        </div>
        {taskType === "survey" && (
          <div>
            <label className="text-[10px] text-muted-foreground">
              Questions — one per line. Format: Question? | option1; option2; option3
            </label>
            <Textarea
              value={questionsText}
              onChange={(e) => setQuestionsText(e.target.value)}
              rows={4}
              className="text-xs"
              placeholder={"How old are you? | Under 18; 18-25; 26-35; 36+"}
            />
          </div>
        )}
        <Button size="sm" onClick={createTask} disabled={saving} className="text-xs w-full">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
          Create Task
        </Button>
      </Card>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          All Tasks ({tasks.length})
        </h3>
        {tasks.map((task) => (
          <Card key={task.id} className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/15 text-primary font-semibold">
                    {task.task_type === "time_task" ? "Time" : "Survey"}
                  </span>
                  <p className="text-xs font-medium truncate">{task.title}</p>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {task.reward_coins} coins
                  {task.task_type === "time_task" && task.time_limit_seconds ? ` · ${task.time_limit_seconds}s` : ""}
                  {task.task_type === "survey" && Array.isArray(task.questions) ? ` · ${task.questions.length} questions` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button size="sm" variant="outline" className="h-7 text-[10px] px-2" onClick={() => toggleActive(task)}>
                  {task.is_active ? "Hide" : "Show"}
                </Button>
                <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => deleteTask(task)}>
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {tasks.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No tasks created yet.</p>
        )}
      </div>
    </div>
  );
};

export default AdminSurveys;
