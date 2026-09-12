import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SplashScreen from "@/components/SplashScreen";
import PolicyModal from "@/components/PolicyModal";
import { loginSchema, signupSchema } from "@/lib/validations/auth";
import { z } from "zod";
import { Shield, ArrowLeft, Mail, Eye, EyeOff, Chrome, LockKeyhole, UserPlus, ArrowRight } from "lucide-react";
import { lovable } from "@/integrations/lovable";
import { useGuest } from "@/contexts/GuestContext";
import { checkAndRegisterDevice } from "@/lib/deviceCheck";
import DeviceLockedDialog, { type DeviceLockCode } from "@/components/DeviceLockedDialog";
import { getAuthErrorMessage, withAuthTimeout } from "@/lib/authTimeout";
import "@fontsource/sora/600.css";
import "@fontsource/sora/700.css";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";

const getSafeNextTarget = (): string => {
  try {
    const raw = new URLSearchParams(window.location.search).get("next");
    if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  } catch {
    // Fall back to the dashboard when the query string is malformed.
  }
  return "/dashboard";
};
const Auth = () => {
  const navigate = useNavigate();
  const { enterGuestMode, exitGuestMode } = useGuest();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [checkingSession, setCheckingSession] = useState(true);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [deviceLock, setDeviceLock] = useState<{ open: boolean; code: DeviceLockCode; message?: string }>({
    open: false,
    code: "UNKNOWN",
  });

  // Subscribe before reading the current session so an OAuth callback cannot
  // complete between the initial read and listener registration.
  useEffect(() => {
    let active = true;

    const redirectAuthenticatedUser = (hasSession: boolean) => {
      if (!active || !hasSession) return false;
      exitGuestMode();
      navigate(getSafeNextTarget(), { replace: true });
      return true;
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (redirectAuthenticatedUser(Boolean(session))) return;
      if (active) setCheckingSession(false);
    });

    const checkSession = async () => {
      try {
        const hash = window.location.hash || "";
        const isRecovery = hash.includes("type=recovery");
        if (isRecovery) {
          navigate("/reset-password" + window.location.hash, { replace: true });
          return;
        }

        const { data: { session }, error } = await withAuthTimeout(supabase.auth.getSession());
        if (error) throw error;
        redirectAuthenticatedUser(Boolean(session));
      } catch (error) {
        if (active) toast.error(getAuthErrorMessage(error, "Could not check your session. Please try again."));
      } finally {
        if (active) setCheckingSession(false);
      }
    };
    void checkSession();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  // `exitGuestMode` is intentionally omitted because the context currently
  // recreates it on render; including it would restart OAuth detection.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const [signupSuccess, setSignupSuccess] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const next = getSafeNextTarget();
      const callbackUrl = new URL("/auth", window.location.origin);
      if (next !== "/dashboard") callbackUrl.searchParams.set("next", next);

      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: callbackUrl.toString(),
        extraParams: { prompt: "select_account" },
      });

      if (result.error) throw result.error;
      if (result.redirected) return;

      const { data: { user } } = await withAuthTimeout(supabase.auth.getUser());
      if (!user) throw new Error("Google sign-in did not return a user session.");

      const deviceCheck = await withAuthTimeout(checkAndRegisterDevice());
      if (!deviceCheck.success) {
        await supabase.auth.signOut();
        setDeviceLock({
          open: true,
          code: (deviceCheck.code as DeviceLockCode) || "UNKNOWN",
          message: deviceCheck.message,
        });
        return;
      }

      await supabase.from("admin_auth_reports").insert({
        user_id: user.id,
        provider: "google",
        email: user.email ?? null,
        action: "sign_in",
      });

      exitGuestMode();
      toast.success("Signed in with Google");
      navigate(getSafeNextTarget());
    } catch (error: unknown) {
      toast.error(getAuthErrorMessage(error, "Google sign-in failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    setErrors({});
    const schema = isLogin ? loginSchema : signupSchema;
    
    try {
      schema.parse({ email, password });
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: { email?: string; password?: string } = {};
        error.errors.forEach((err) => {
          const field = err.path[0] as 'email' | 'password';
          if (!fieldErrors[field]) {
            fieldErrors[field] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await withAuthTimeout(supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        }));
        if (error) throw error;

        // Enforce one-device-one-account on native mobile
        const deviceCheck = await withAuthTimeout(checkAndRegisterDevice());
        if (!deviceCheck.success) {
          await supabase.auth.signOut();
          setDeviceLock({
            open: true,
            code: (deviceCheck.code as DeviceLockCode) || "UNKNOWN",
            message: deviceCheck.message,
          });
          return;
        }

        exitGuestMode();
        toast.success("Welcome back!");
        navigate(getSafeNextTarget());
      } else {
        // Sign up — auto-confirm is enabled server-side, so a session should be returned.
        const { data: signUpData, error } = await withAuthTimeout(supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${getSafeNextTarget()}`,
            data: {
              referral_code: referralCode.trim().toUpperCase() || null,
            },
          },
        }));
        if (error) throw error;

        // If no session yet (e.g. email confirmation is required for this project),
        // try password sign-in. If that also fails, surface a clean error instead of hanging.
        let activeSession = signUpData.session;
        if (!activeSession) {
          const { data: signInData, error: signInError } =
            await withAuthTimeout(supabase.auth.signInWithPassword({
              email: email.trim(),
              password,
            }));
          if (signInError) {
            // Most common cause: email confirmation required. Tell the user clearly.
            toast.error(
              signInError.message?.toLowerCase().includes("confirm")
                ? "Please confirm your email to continue."
                : signInError.message || "Could not sign in after signup."
            );
            return;
          }
          activeSession = signInData.session;
        }

        // Enforce one-device-one-account (no-op on web).
        const deviceCheck = await withAuthTimeout(checkAndRegisterDevice());
        if (!deviceCheck.success) {
          await supabase.auth.signOut();
          setDeviceLock({
            open: true,
            code: (deviceCheck.code as DeviceLockCode) || "DEVICE_IN_USE",
            message: deviceCheck.message,
          });
          return;
        }

        // Apply referral code (referrer paid on first successful withdrawal).
        if (referralCode.trim() && activeSession) {
          try {
            await supabase.rpc("apply_referral_code", {
              p_user_id: activeSession.user.id,
              p_referral_code: referralCode.trim().toUpperCase(),
            });
          } catch (refErr) {
            // Non-fatal — user still gets an account.
            console.warn("[Auth] apply_referral_code failed:", refErr);
          }
        }

        exitGuestMode();
        toast.success("Account created! Welcome to XD Rewards.");
        navigate(getSafeNextTarget());
      }
    } catch (error: unknown) {
      toast.error(getAuthErrorMessage(error, "Authentication failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setErrors({ email: "Please enter your email address" });
      return;
    }
    
    setLoading(true);
    
    try {
      const { error } = await withAuthTimeout(supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      }));
      
      if (error) throw error;
      setResetEmailSent(true);
    } catch (error: unknown) {
      toast.error(getAuthErrorMessage(error, "Failed to send reset email"));
    } finally {
      setLoading(false);
    }
  };

  if (showSplash || checkingSession) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  // Show reset email sent confirmation
  if (resetEmailSent) {
    return (
      <div className="min-h-screen bg-background flex flex-col safe-area-top safe-area-bottom">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/20 rounded-full blur-[80px]"></div>
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 relative z-10">
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6">
            <Mail className="w-10 h-10 text-primary" />
          </div>
          
          <h1 className="text-2xl font-bold text-center mb-2">Check Your Email</h1>
          <p className="text-muted-foreground text-center text-sm mb-6 max-w-xs">
            We've sent a password reset link to <span className="text-foreground font-medium">{email}</span>
          </p>
          
          <div className="bg-card/90 border border-border/50 rounded-xl p-4 mb-6 max-w-xs">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <polyline points="3 7 12 13 21 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium">Reset Your Password</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Click the link in your email to set a new password.
                </p>
              </div>
            </div>
          </div>
          
          <Button
            variant="outline"
            onClick={() => {
              setResetEmailSent(false);
              setShowForgotPassword(false);
              setIsLogin(true);
            }}
            className="border-border"
          >
            Back to Login
          </Button>
        </div>
      </div>
    );
  }

  // Show forgot password form
  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-background flex flex-col safe-area-top safe-area-bottom">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/20 rounded-full blur-[80px]"></div>
        </div>

        <div className="flex-1 flex flex-col px-6 py-8 relative z-10">
          {/* Back Button */}
          <button
            onClick={() => {
              setShowForgotPassword(false);
              setErrors({});
            }}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Login</span>
          </button>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-red-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-3xl font-black text-primary-foreground">X</span>
            </div>
            <h1 className="text-2xl font-bold mb-2">Forgot Password?</h1>
            <p className="text-muted-foreground text-sm">
              Enter your email and we'll send you a reset link
            </p>
          </div>

          {/* Reset Form */}
          <Card className="p-6 bg-card/90 border-border/50 backdrop-blur-sm">
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email" className="text-sm">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors({});
                  }}
                  className={`bg-muted border-border h-12 ${errors.email ? 'border-destructive' : ''}`}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-12 text-base"
                disabled={loading}
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  // Show signup success screen
  if (signupSuccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col safe-area-top safe-area-bottom">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-64 h-64 bg-success/20 rounded-full blur-[80px]"></div>
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 relative z-10">
          <div className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-center mb-2">Check Your Email</h1>
          <p className="text-muted-foreground text-center text-sm mb-6 max-w-xs">
            We've sent a verification link to <span className="text-foreground font-medium">{email}</span>
          </p>
          
          <div className="bg-card/90 border border-border/50 rounded-xl p-4 mb-6 max-w-xs">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <polyline points="3 7 12 13 21 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium">Verify to Start Collecting</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Click the link in your email to verify and unlock all features.
                </p>
              </div>
            </div>
          </div>
          
          <Button
            variant="outline"
            onClick={() => {
              setSignupSuccess(false);
              setIsLogin(true);
            }}
            className="border-border"
          >
            Back to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <main className="relative min-h-[100dvh] overflow-x-hidden bg-background safe-area-top safe-area-bottom [font-family:Manrope,sans-serif]">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-[90px]" />
        <div className="absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-primary/10 blur-[100px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col justify-center px-4 py-4 min-[380px]:px-5 min-[380px]:py-5 landscape:justify-start">
        <header className="mb-3.5 flex shrink-0 flex-col items-center text-center min-[380px]:mb-5">
          <div className="relative mb-2.5 flex h-12 w-12 items-center justify-center rounded-xl border border-primary/60 bg-card shadow-[0_0_24px_hsl(var(--primary)/0.26)] min-[380px]:h-14 min-[380px]:w-14">
            <span className="bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text font-[Sora] text-xl font-bold text-transparent min-[380px]:text-2xl">XD</span>
            <div className="absolute inset-x-2 bottom-0 h-px bg-primary shadow-[0_0_10px_hsl(var(--primary))]" />
          </div>
          <h1 className="font-[Sora] text-xl font-bold text-foreground min-[380px]:text-2xl">
            <span className="text-primary">XD</span> REWARDS
          </h1>
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.24em] text-muted-foreground min-[380px]:text-[11px]">
            Premium Rewards Platform
          </p>
        </header>

        <Card className="shrink-0 border-primary/35 bg-card/75 p-4 shadow-[0_18px_50px_hsl(0_0%_0%/0.48),0_0_32px_hsl(var(--primary)/0.08)] backdrop-blur-xl min-[380px]:p-5">
          <div className="mb-3 min-[380px]:mb-4">
            <h2 className="font-[Sora] text-lg font-semibold text-foreground min-[380px]:text-xl">
              {isLogin ? "Welcome Back" : "Create Account"}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isLogin ? "Sign in securely to continue" : "Create your XD Rewards account"}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="h-11 w-full rounded-lg border-border bg-secondary/70 font-semibold hover:border-primary/50 hover:bg-secondary"
          >
            <Chrome className="h-4 w-4 text-primary" />
            {loading ? "Connecting..." : "Continue with Google"}
            <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
          </Button>

          <div className="my-3 flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground min-[380px]:my-4">
            <div className="h-px flex-1 bg-border" />
            <span>Or use email</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleAuth} className="space-y-2.5 min-[380px]:space-y-3">
            <div>
              <Label htmlFor="auth-email" className="sr-only">Email address</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (errors.email) setErrors((current) => ({ ...current, email: undefined }));
                  }}
                  aria-invalid={Boolean(errors.email)}
                  className="h-11 rounded-lg border-border bg-secondary/55 pl-10 text-sm focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
                />
              </div>
              {errors.email && <p className="mt-1 text-[11px] text-destructive">{errors.email}</p>}
            </div>

            <div>
              <Label htmlFor="auth-password" className="sr-only">Password</Label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  placeholder="Password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (errors.password) setErrors((current) => ({ ...current, password: undefined }));
                  }}
                  aria-invalid={Boolean(errors.password)}
                  className="h-11 rounded-lg border-border bg-secondary/55 px-10 text-sm focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-0.5 top-1/2 h-10 w-10 -translate-y-1/2 text-muted-foreground hover:bg-transparent hover:text-foreground"
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
              <div className="mt-1 flex min-h-4 items-start justify-between gap-2">
                {errors.password ? <p className="text-[11px] text-destructive">{errors.password}</p> : <span />}
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="shrink-0 text-[11px] font-semibold text-primary-readable transition-colors hover:text-primary"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
            </div>

            {!isLogin && (
              <div>
                <Label htmlFor="referral-code" className="sr-only">Referral code</Label>
                <Input
                  id="referral-code"
                  type="text"
                  placeholder="Referral code (optional)"
                  value={referralCode}
                  onChange={(event) => setReferralCode(event.target.value)}
                  className="h-11 rounded-lg border-border bg-secondary/55 text-sm uppercase focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
                />
              </div>
            )}

            <Button type="submit" disabled={loading} className="h-11 w-full rounded-lg bg-primary font-semibold shadow-[0_10px_24px_hsl(var(--primary)/0.22)]">
              {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setIsLogin((current) => !current);
              setErrors({});
            }}
            className="mt-2.5 h-10 w-full rounded-lg border-border bg-transparent text-xs font-semibold hover:border-primary/40 hover:bg-secondary/60 min-[380px]:mt-3"
          >
            <UserPlus className="h-4 w-4" />
            {isLogin ? "Create New Account" : "Already have an account? Sign In"}
          </Button>

          <p className="mt-2.5 text-center text-[10px] text-muted-foreground min-[380px]:mt-3">
            By continuing, you agree to our{" "}
            <button type="button" onClick={() => setShowPolicyModal(true)} className="font-semibold text-primary-readable underline underline-offset-2">
              Privacy & Safety Policy
            </button>
          </p>
        </Card>

        <Button
          variant="ghost"
          onClick={() => {
            enterGuestMode();
            navigate("/dashboard");
          }}
          className="mt-1.5 h-9 w-full text-xs text-muted-foreground hover:bg-transparent hover:text-foreground min-[380px]:mt-2"
        >
          <Eye className="h-4 w-4" />
          Continue as Guest
        </Button>

        <button
          type="button"
          onClick={() => setShowPolicyModal(true)}
          className="mx-auto flex items-center gap-1.5 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <Shield className="h-3 w-3 text-primary" />
          100% transparent and verified
        </button>
      </div>

      {/* Policy Modal */}
      <PolicyModal isOpen={showPolicyModal} onClose={() => setShowPolicyModal(false)} />

      <DeviceLockedDialog
        open={deviceLock.open}
        onClose={() => setDeviceLock((s) => ({ ...s, open: false }))}
        code={deviceLock.code}
        message={deviceLock.message}
        email={email}
      />
    </div>
  );
};

export default Auth;
