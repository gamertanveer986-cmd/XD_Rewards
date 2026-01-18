import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { User, Calendar, AtSign, Gift, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ProfileSetupProps {
  userId: string;
  onComplete: () => void;
  existingProfile?: any;
}

const ProfileSetup = ({ userId, onComplete, existingProfile }: ProfileSetupProps) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    display_name: existingProfile?.display_name || "",
    username: existingProfile?.username || "",
    birthday: existingProfile?.birthday || "",
    referral_input: "",
    avatar_url: existingProfile?.avatar_url || "",
  });

  const totalSteps = 4;

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateUsername = (username: string) => {
    const regex = /^[a-zA-Z0-9_]{3,20}$/;
    return regex.test(username);
  };

  const handleNext = async () => {
    if (step === 1 && !formData.display_name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    if (step === 2) {
      if (!formData.username.trim()) {
        toast.error("Please enter a username");
        return;
      }
      if (!validateUsername(formData.username)) {
        toast.error("Username must be 3-20 characters, letters, numbers, and underscores only");
        return;
      }

      // Check username availability
      setLoading(true);
      const { data: existingUser } = await supabase
        .from("user_profiles")
        .select("username")
        .eq("username", formData.username.toLowerCase())
        .neq("user_id", userId)
        .maybeSingle();

      if (existingUser) {
        setLoading(false);
        toast.error("Username already taken");
        return;
      }
      setLoading(false);
    }

    if (step === 3 && !formData.birthday) {
      toast.error("Please enter your birthday");
      return;
    }

    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      await handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from("user_profiles")
        .update({
          display_name: formData.display_name.trim(),
          username: formData.username.toLowerCase().trim(),
          birthday: formData.birthday,
          avatar_url: formData.avatar_url || null,
          profile_completed: true,
        })
        .eq("user_id", userId);

      if (profileError) throw profileError;

      // Apply referral code if provided
      if (formData.referral_input.trim()) {
        const { data: result } = await supabase.rpc("apply_referral_code", {
          p_user_id: userId,
          p_referral_code: formData.referral_input.trim(),
        });

        const resultObj = result as { success: boolean; message: string } | null;
        if (resultObj && !resultObj.success) {
          toast.error(resultObj.message);
        } else if (resultObj?.success) {
          toast.success("Referral code applied! Your friend got 5 value bonus (500 XD Coins)");
        }
      }

      toast.success("Profile setup complete!");
      onComplete();
    } catch (error: any) {
      console.error("Profile setup error:", error);
      if (error.message?.includes("username")) {
        toast.error("Username already taken");
      } else {
        toast.error("Failed to save profile");
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (birthday: string) => {
    if (!birthday) return null;
    const today = new Date();
    const birthDate = new Date(birthday);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 bg-card border-border/50">
        {/* Progress */}
        <div className="flex items-center justify-between mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`w-1/4 h-1.5 rounded-full mx-0.5 transition-colors ${
                s <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="text-center mb-6">
          <h2 className="text-xl font-bold mb-1">
            {step === 1 && "What's your name?"}
            {step === 2 && "Choose a username"}
            {step === 3 && "When's your birthday?"}
            {step === 4 && "Got a referral code?"}
          </h2>
          <p className="text-sm text-muted-foreground">

            {step === 1 && "This will be shown on the leaderboard"}
            {step === 2 && "Your unique identity on XD Rewards"}
            {step === 3 && "We'll celebrate with you!"}
            {step === 4 && "Enter it to give your friend 5 value bonus (500 XD Coins)"}
          </p>
        </div>

        {/* Step 1: Name */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex justify-center mb-4">
              <Avatar className="w-20 h-20 border-2 border-primary/30">
                <AvatarImage src={formData.avatar_url} />
                <AvatarFallback className="bg-primary/20 text-primary text-xl">
                  {formData.display_name ? getInitials(formData.display_name) : <User className="w-8 h-8" />}
                </AvatarFallback>
              </Avatar>
            </div>
            <div>
              <Label htmlFor="display_name">Full Name</Label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="display_name"
                  placeholder="Enter your name"
                  value={formData.display_name}
                  onChange={(e) => handleInputChange("display_name", e.target.value)}
                  className="pl-10"
                  autoFocus
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Username */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <div className="relative mt-1">
                <AtSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="username"
                  placeholder="your_username"
                  value={formData.username}
                  onChange={(e) => handleInputChange("username", e.target.value.toLowerCase())}
                  className="pl-10"
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                3-20 characters, letters, numbers, and underscores only
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Birthday */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="birthday">Birthday</Label>
              <div className="relative mt-1">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="birthday"
                  type="date"
                  value={formData.birthday}
                  onChange={(e) => handleInputChange("birthday", e.target.value)}
                  className="pl-10"
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>
              {formData.birthday && (
                <p className="text-sm text-primary mt-2 font-medium">
                  You are {calculateAge(formData.birthday)} years old 🎂
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Referral Code */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <Gift className="w-8 h-8 text-primary" />
            </div>
            <div>
              <Label htmlFor="referral">Referral Code (Optional)</Label>
              <Input
                id="referral"
                placeholder="Enter friend's referral code"
                value={formData.referral_input}
                onChange={(e) => handleInputChange("referral_input", e.target.value.toUpperCase())}
                className="text-center text-lg tracking-widest uppercase"
                maxLength={8}
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Your friend will receive 5 value bonus (500 XD Coins) when you join!
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              className="flex-1"
              disabled={loading}
            >
              Back
            </Button>
          )}
          <Button
            onClick={handleNext}
            className="flex-1"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : step === totalSteps ? (
              "Complete Setup"
            ) : (
              "Continue"
            )}
          </Button>
        </div>

        {step === 4 && (
          <Button
            variant="ghost"
            onClick={handleSubmit}
            className="w-full mt-2 text-muted-foreground"
            disabled={loading}
          >
            Skip for now
          </Button>
        )}
      </Card>
    </div>
  );
};

export default ProfileSetup;
