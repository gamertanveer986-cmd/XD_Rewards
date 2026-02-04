import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import XDCoin from "./XDCoin";
import { Instagram, Upload, CheckCircle, Clock, XCircle, Loader2, ExternalLink, AlertCircle } from "lucide-react";

interface SocialTasksProps {
  userId: string;
  onComplete?: () => void;
}

interface Submission {
  id: string;
  task_type: string;
  status: string;
  reward_amount: number | null;
  submitted_at: string;
}

const SocialTasks = ({ userId, onComplete }: SocialTasksProps) => {
  const [isEnabled, setIsEnabled] = useState(true);
  const [config, setConfig] = useState<any>({});
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);

  const tasks = [
    {
      key: "follow",
      title: "Follow on Instagram",
      description: "Follow our official Instagram account",
      reward: config.instagram_follow_reward || 50,
      icon: Instagram,
      action: () => window.open(`https://www.instagram.com/${(config.instagram_handle || "@xd_rewards_official").replace("@", "")}`, "_blank"),
    },
    {
      key: "like",
      title: "Like Our Post",
      description: "Like and engage with our latest post",
      reward: config.instagram_like_reward || 25,
      icon: Instagram,
      action: () => window.open(`https://www.instagram.com/${(config.instagram_handle || "@xd_rewards_official").replace("@", "")}`, "_blank"),
    },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get config
        const { data: configData } = await supabase
          .from("gamification_config")
          .select("is_enabled, config_json")
          .eq("feature_key", "social_tasks")
          .single();

        if (configData) {
          setIsEnabled(configData.is_enabled);
          setConfig(configData.config_json || {});
        }

        // Get submissions
        const { data: submissionData } = await supabase
          .from("social_task_submissions")
          .select("*")
          .eq("user_id", userId)
          .order("submitted_at", { ascending: false });

        setSubmissions(submissionData || []);
      } catch (error) {
        console.error("Error fetching social tasks:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  const handleFileSelect = (taskKey: string) => {
    setSelectedTask(taskKey);
    fileInputRef.current?.click();
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedTask) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPG, PNG, and WebP images are allowed");
      return;
    }

    // Validate file size (2MB max)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File size must be less than 2MB");
      return;
    }

    // Check for duplicate pending submissions
    const existingPending = submissions.find(
      s => s.task_type === selectedTask && s.status === "pending"
    );
    if (existingPending) {
      toast.error("You already have a pending submission for this task");
      return;
    }

    setUploading(selectedTask);

    try {
      // Upload to storage
      const fileName = `${userId}/${selectedTask}_${Date.now()}.${file.name.split(".").pop()}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("uploads")
        .getPublicUrl(fileName);

      // Create submission
      const { error: insertError } = await supabase
        .from("social_task_submissions")
        .insert({
          user_id: userId,
          task_type: selectedTask,
          platform: "instagram",
          screenshot_url: urlData.publicUrl,
        });

      if (insertError) throw insertError;

      toast.success("Screenshot uploaded! Awaiting admin verification.");

      // Refresh submissions
      const { data: newSubmissions } = await supabase
        .from("social_task_submissions")
        .select("*")
        .eq("user_id", userId)
        .order("submitted_at", { ascending: false });

      setSubmissions(newSubmissions || []);
      onComplete?.();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload screenshot");
    } finally {
      setUploading(null);
      setSelectedTask(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const getTaskStatus = (taskKey: string) => {
    const submission = submissions.find(s => s.task_type === taskKey);
    if (!submission) return null;
    return submission.status;
  };

  if (loading) {
    return (
      <Card className="p-4 bg-card border-border/50">
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  if (!isEnabled) {
    return null;
  }

  return (
    <Card className="p-4 bg-gradient-to-r from-pink-500/10 to-purple-500/10 border-pink-500/30">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
          <Instagram className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-base">Social Media Tasks</h3>
          <p className="text-xs text-muted-foreground">
            Follow {config.instagram_handle || "@xd_rewards_official"} to earn
          </p>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleUpload}
        className="hidden"
      />

      {/* Tasks */}
      <div className="space-y-3">
        {tasks.map((task) => {
          const status = getTaskStatus(task.key);
          const Icon = task.icon;
          const isUploading = uploading === task.key;

          return (
            <div
              key={task.key}
              className="p-3 rounded-lg bg-card/50 border border-border/50"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-pink-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm">{task.title}</h4>
                  <p className="text-xs text-muted-foreground">{task.description}</p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <XDCoin size="sm" />
                  <span className="text-sm font-medium text-success">+{task.reward}</span>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                {status === "approved" ? (
                  <div className="flex items-center gap-1 text-success text-xs">
                    <CheckCircle className="w-4 h-4" />
                    <span>Rewarded</span>
                  </div>
                ) : status === "pending" ? (
                  <div className="flex items-center gap-1 text-warning text-xs">
                    <Clock className="w-4 h-4" />
                    <span>Verification pending</span>
                  </div>
                ) : status === "rejected" ? (
                  <div className="flex items-center gap-1 text-destructive text-xs">
                    <XCircle className="w-4 h-4" />
                    <span>Rejected - Try again</span>
                  </div>
                ) : null}

                <div className="flex gap-2 ml-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={task.action}
                    className="text-xs h-7"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Open
                  </Button>

                  {status !== "approved" && status !== "pending" && (
                    <Button
                      size="sm"
                      onClick={() => handleFileSelect(task.key)}
                      disabled={isUploading}
                      className="text-xs h-7 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                    >
                      {isUploading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <Upload className="w-3 h-3 mr-1" />
                          Upload Proof
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Safety Notice */}
      <div className="mt-4 p-3 bg-muted/30 rounded-lg border border-border/30">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-[10px] text-muted-foreground space-y-1">
            <p>• Rewards are given only after manual verification by admin.</p>
            <p>• Upload clear screenshots showing completed task.</p>
            <p>• Fake or manipulated screenshots will result in rejection.</p>
            <p>• Entertainment value only - not redeemable for cash.</p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default SocialTasks;
