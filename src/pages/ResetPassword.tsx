import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { KeyRound } from "lucide-react";

/**
 * Public route hit by Supabase password recovery emails.
 * Supabase places the recovery tokens in the URL hash and (with detectSessionInUrl)
 * exchanges them for a temporary session on load. We block auto-redirect elsewhere
 * and require the user to actually set a new password before proceeding.
 */
const ResetPassword = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [ready, setReady] = useState(false);
  const [validLink, setValidLink] = useState(true);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Wait for Supabase to parse the recovery hash and fire PASSWORD_RECOVERY.
    const hash = window.location.hash || "";
    const isRecovery = hash.includes("type=recovery") || hash.includes("access_token=");

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
        setValidLink(true);
      }
    });

    // Fallback: if the URL has no recovery hash and there's no active session,
    // the link is invalid or already consumed.
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!isRecovery && !session) {
        setValidLink(false);
      }
      setReady(true);
    })();

    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      setError(t("auth.passwordHint"));
      return;
    }
    if (password !== confirm) {
      setError(t("auth.passwordsDoNotMatch"));
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      await supabase.auth.signOut();
      toast.success(t("auth.passwordUpdated"));
      navigate("/auth", { replace: true });
    } catch (err: any) {
      toast.error(err?.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col safe-area-top safe-area-bottom">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/20 rounded-full blur-[80px]" />
      </div>

      <div className="flex-1 flex flex-col px-6 py-8 relative z-10">
        <div className="text-center mb-8 pt-8">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-[hsl(0_70%_38%)] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_28px_hsl(0_65%_51%/0.5)]">
            <KeyRound className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-2">{t("auth.resetPasswordTitle")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("auth.resetPasswordSubtitle")}
          </p>
        </div>

        <Card className="p-6 surface-elevated border-border">
          {!validLink ? (
            <div className="text-center space-y-4 py-4">
              <p className="text-sm text-destructive">{t("auth.invalidOrExpiredLink")}</p>
              <Button
                onClick={() => navigate("/auth", { replace: true })}
                className="w-full bg-primary hover:bg-primary/90"
              >
                {t("auth.backToLogin")}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-sm">
                  {t("auth.newPassword")}
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-muted border-border h-12"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">{t("auth.passwordHint")}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-sm">
                  {t("auth.confirmPassword")}
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="bg-muted border-border h-12"
                />
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-12 text-base"
                disabled={loading}
              >
                {loading ? t("auth.updating") : t("auth.updatePassword")}
              </Button>

              <button
                type="button"
                onClick={() => navigate("/auth", { replace: true })}
                className="w-full text-sm text-muted-foreground hover:text-primary transition-colors py-2"
              >
                {t("auth.backToLogin")}
              </button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
