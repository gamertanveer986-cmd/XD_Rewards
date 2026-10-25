import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGuest } from "@/contexts/GuestContext";
import AppLayout from "@/components/AppLayout";
import GuestBanner from "@/components/GuestBanner";
import XDCoin from "@/components/XDCoin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ClipboardList,
  Timer,
  Zap,
  Gift,
  Users,
  ChevronRight,
  CheckCircle2,
  Loader2,
  ArrowLeft,
} from "lucide-react";

interface SurveyQuestion {
  q: string;
  options?: string[];
}

interface SurveyTask {
  id: string;
  task_type: string;
  title: string;
  description: string | null;
  questions: SurveyQuestion[];
  reward_coins: number;
  time_limit_seconds: number | null;
}

const Survey = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isGuest } = useGuest();
  const [tasks, setTasks] = useState<SurveyTask[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [activeSurvey, setActiveSurvey] = useState<SurveyTask | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [activeTimer, setActiveTimer] = useState<{ task: SurveyTask; secondsLeft: number } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const { data: tasksData } = await supabase
        .from("survey_tasks")
        .select("*")
        .eq("is_active", true)
        .order("reward_coins", { ascending: false });
      setTasks((tasksData as any[]) || []);

      if (user) {
        const { data: compData } = await supabase
          .from("survey_completions")
          .select("task_id")
          .eq("user_id", user.id);
        setCompletedIds(new Set((compData || []).map((c: any) => c.task_id)));
      }
    } catch (e) {
      console.error("Failed to load earning tasks:", e);
      toast.error("Could not load tasks. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isGuest || !user) {
      setLoading(false);
      return;
    }
    loadData();
  }, [isGuest, user, loadData]);

  // Countdown for timed tasks
  useEffect(() => {
    if (!activeTimer || activeTimer.secondsLeft <= 0) return;
    const id = window.setInterval(() => {
      setActiveTimer((prev) =>
        prev && prev.secondsLeft > 0 ? { ...prev, secondsLeft: prev.secondsLeft - 1 } : prev
      );
    }, 1000);
    return () => window.clearInterval(id);
  }, [activeTimer]);

  const creditReward = async (task: SurveyTask, taskAnswers: Record<number, string> | null) => {
    if (!user) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("complete_survey", {
        p_user_id: user.id,
        p_task_id: task.id,
        p_answers: taskAnswers ? (taskAnswers as any) : null,
      });
      const res = data as any;
      if (error || !res?.success) {
        const reason = res?.error || "failed";
        if (reason === "already_completed") toast.error("You already completed this task.");
        else if (reason === "rate_limited") toast.error("Too many attempts. Please wait a minute.");
        else toast.error("Could not credit the reward. Please try again.");
        return;
      }
      toast.success(`+${res.reward_coins} XD Coins credited!`);
      setCompletedIds((prev) => new Set(prev).add(task.id));
      setActiveSurvey(null);
      setActiveTimer(null);
      loadData();
    } finally {
      setSubmitting(false);
    }
  };

  const startSurvey = (task: SurveyTask) => {
    setActiveSurvey(task);
    setAnswers({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitSurvey = () => {
    if (!activeSurvey) return;
    const questions = activeSurvey.questions || [];
    for (let i = 0; i < questions.length; i++) {
      const val = (answers[i] || "").trim();
      if (!val) {
        toast.error("Please answer every question before submitting.");
        return;
      }
    }
    creditReward(activeSurvey, answers);
  };

  const startTimerTask = (task: SurveyTask) => {
    setActiveTimer({ task, secondsLeft: task.time_limit_seconds || 60 });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const surveys = tasks.filter((t) => t.task_type === "survey");
  const timeTasks = tasks.filter((t) => t.task_type === "time_task");

  const TaskCard = ({ task }: { task: SurveyTask }) => {
    const done = completedIds.has(task.id);
    return (
      <Card className={`p-4 bg-card border-border ${done ? "opacity-60" : ""}`}>
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
            {task.task_type === "time_task" ? (
              <Timer className="w-4 h-4 text-warning" />
            ) : (
              <ClipboardList className="w-4 h-4 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-sm leading-tight truncate">{task.title}</h3>
              <div className="flex items-center gap-1 shrink-0">
                <XDCoin size="sm" />
                <span className="text-sm font-bold text-success">{task.reward_coins}</span>
              </div>
            </div>
            {task.description && (
              <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{task.description}</p>
            )}
            <div className="mt-2.5">
              {done ? (
                <div className="inline-flex items-center gap-1.5 text-xs text-success font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                </div>
              ) : (
                <Button
                  size="sm"
                  className="h-8 text-xs px-4"
                  disabled={submitting}
                  onClick={() =>
                    task.task_type === "time_task" ? startTimerTask(task) : startSurvey(task)
                  }
                >
                  {task.task_type === "time_task"
                    ? `Start ${Math.ceil((task.time_limit_seconds || 60) / 60)} min task`
                    : "Start survey"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  };

  const quickLinks = [
    { icon: Zap, label: "Watch Ads", path: "/earn", color: "text-primary" },
    { icon: Gift, label: "Daily Bonus", path: "/daily-bonus", color: "text-warning" },
    { icon: Users, label: "Referrals", path: "/referral", color: "text-success" },
  ];

  return (
    <AppLayout title="SURVEYS" showBack>
      <GuestBanner />
      <div className="px-4 py-4 space-y-5">
        {isGuest || (!user && !authLoading) ? (
          <Card className="p-6 text-center space-y-3">
            <ClipboardList className="w-10 h-10 text-primary mx-auto" />
            <h2 className="font-semibold">Sign in to earn from surveys</h2>
            <p className="text-xs text-muted-foreground">
              Surveys, timed tasks and every earning feature are available to signed-in members.
            </p>
            <Button onClick={() => navigate("/auth")} className="w-full">Sign in</Button>
          </Card>
        ) : authLoading || loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : activeSurvey ? (
          /* ---------- Survey taking view ---------- */
          <div className="space-y-4">
            <Button variant="ghost" size="sm" className="pl-0" onClick={() => setActiveSurvey(null)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to tasks
            </Button>
            <Card className="p-4 space-y-1">
              <h2 className="font-semibold">{activeSurvey.title}</h2>
              <p className="text-[11px] text-muted-foreground">{activeSurvey.description}</p>
              <div className="flex items-center gap-1.5 pt-1">
                <XDCoin size="sm" />
                <span className="text-sm font-bold text-success">{activeSurvey.reward_coins} on completion</span>
              </div>
            </Card>
            {(activeSurvey.questions || []).map((question, idx) => (
              <Card key={idx} className="p-4 space-y-2.5">
                <p className="text-sm font-medium">
                  {idx + 1}. {question.q}
                </p>
                {question.options && question.options.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {question.options.map((opt) => {
                      const selected = answers[idx] === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setAnswers((prev) => ({ ...prev, [idx]: opt }))}
                          className={`text-xs text-left px-3 py-2.5 rounded-lg border transition-colors ${
                            selected
                              ? "border-primary bg-primary/10 text-primary font-medium"
                              : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <Input
                    value={answers[idx] || ""}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [idx]: e.target.value }))}
                    placeholder="Type your answer"
                    className="h-9 text-xs"
                  />
                )}
              </Card>
            ))}
            <Button className="w-full" disabled={submitting} onClick={submitSurvey}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : `Submit & earn ${activeSurvey.reward_coins} XD Coins`}
            </Button>
          </div>
        ) : activeTimer ? (
          /* ---------- Timed task view ---------- */
          <div className="space-y-4">
            <Button variant="ghost" size="sm" className="pl-0" onClick={() => setActiveTimer(null)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to tasks
            </Button>
            <Card className="p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
                <Timer className="w-8 h-8 text-primary" />
              </div>
              <h2 className="font-semibold">{activeTimer.task.title}</h2>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Stay on this screen until the timer finishes to unlock your bonus.
              </p>
              <p className="text-4xl font-black tabular-nums text-primary">
                {String(Math.floor(activeTimer.secondsLeft / 60)).padStart(2, "0")}:
                {String(activeTimer.secondsLeft % 60).padStart(2, "0")}
              </p>
              {activeTimer.secondsLeft <= 0 ? (
                <Button
                  className="w-full"
                  disabled={submitting}
                  onClick={() => creditReward(activeTimer.task, null)}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : `Claim ${activeTimer.task.reward_coins} XD Coins`}
                </Button>
              ) : (
                <p className="text-[10px] text-muted-foreground">Claim button unlocks when the timer ends</p>
              )}
            </Card>
          </div>
        ) : (
          /* ---------- Task lists ---------- */
          <>
            <Card className="p-4 bg-gradient-to-br from-primary/15 via-card to-card border-primary/30">
              <h2 className="font-semibold text-sm">Earn More Hub</h2>
              <p className="text-[11px] text-muted-foreground mt-1">
                Complete surveys and timed tasks to stack extra XD Coins on top of ads and streaks.
              </p>
            </Card>

            <section className="space-y-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Surveys ({surveys.length})
              </h3>
              {surveys.length === 0 ? (
                <Card className="p-4 text-center text-xs text-muted-foreground">No surveys right now — check back soon.</Card>
              ) : (
                surveys.map((t) => <TaskCard key={t.id} task={t} />)
              )}
            </section>

            <section className="space-y-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Time Wall ({timeTasks.length})
              </h3>
              {timeTasks.length === 0 ? (
                <Card className="p-4 text-center text-xs text-muted-foreground">No timed tasks right now — check back soon.</Card>
              ) : (
                timeTasks.map((t) => <TaskCard key={t.id} task={t} />)
              )}
            </section>

            <section className="space-y-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">More ways to earn</h3>
              <div className="grid grid-cols-3 gap-2.5">
                {quickLinks.map((link) => (
                  <Card
                    key={link.path}
                    className="p-3 bg-card border-border cursor-pointer hover:border-primary/40 transition-colors text-center"
                    onClick={() => navigate(link.path)}
                  >
                    <link.icon className={`w-5 h-5 mx-auto mb-1.5 ${link.color}`} />
                    <p className="text-[11px] font-medium">{link.label}</p>
                    <ChevronRight className="w-3 h-3 mx-auto text-muted-foreground" />
                  </Card>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default Survey;
