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
import { Shield, ArrowLeft, Mail, Eye } from "lucide-react";
import { useGuest } from "@/contexts/GuestContext";
import { checkAndRegisterDevice } from "@/lib/deviceCheck";
import DeviceLockedDialog, { type DeviceLockCode } from "@/components/DeviceLockedDialog";
import { getAuthErrorMessage, withAuthTimeout } from "@/lib/authTimeout";



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
  const [deviceLock, setDeviceLock] = useState<{ open: boolean; code: DeviceLockCode; message?: string }>({
    open: false,
    code: "UNKNOWN",
  });

  // Check if user is already logged in — but NOT during a password recovery flow.
  useEffect(() => {
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
        if (session) {
          const raw = new URLSearchParams(window.location.search).get("next");
          navigate(raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard");
        }
      } catch (error) {
        toast.error(getAuthErrorMessage(error, "Could not check your session. Please try again."));
      } finally {
        setCheckingSession(false);
      }
    };
    checkSession();
  }, [navigate]);

  const [signupSuccess, setSignupSuccess] = useState(false);

  // Where to go after auth: honours a same-origin relative ?next= (used by the
  // OAuth consent flow for agent integrations), otherwise the dashboard.
  const nextTarget = (): string => {
    try {
      const raw = new URLSearchParams(window.location.search).get("next");
      if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
    } catch {/* ignore */}
    return "/dashboard";
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
        navigate(nextTarget());
      } else {
        // Sign up — auto-confirm is enabled server-side, so a session should be returned.
        const { data: signUpData, error } = await withAuthTimeout(supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${nextTarget()}`,
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
        navigate(nextTarget());
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
    <div className="min-h-screen bg-background flex flex-col safe-area-top safe-area-bottom">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/20 rounded-full blur-[80px]"></div>
      </div>

      <div className="flex-1 flex flex-col px-6 py-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-8 pt-6">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-[hsl(0_70%_38%)] rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-[0_0_28px_hsl(0_65%_51%/0.5)]">
            <span className="text-2xl font-black text-primary-foreground tracking-tight">XD</span>
          </div>
          <h1 className="text-2xl font-bold tracking-[0.22em] text-foreground">
            XD&nbsp;REWARDS
          </h1>
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground mt-1.5">
            Premium Rewards Platform
          </p>
        </div>

        {/* Auth Card */}
        <Card className="p-6 surface-elevated border-border">
          <div className="space-y-5">
            <div className="text-center">
              <h2 className="text-xl font-bold mb-1">
                {isLogin ? "Welcome Back" : "Create Account"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isLogin ? "Sign in to continue" : "Join XD Rewards in seconds"}
              </p>
            </div>


            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
                  }}
                  className={`bg-muted border-border h-12 ${errors.email ? 'border-destructive' : ''}`}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
                  }}
                  className={`bg-muted border-border h-12 ${errors.password ? 'border-destructive' : ''}`}
                />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password}</p>
                )}
                {!isLogin && !errors.password && (
                  <p className="text-xs text-muted-foreground">
                    Min 8 chars with uppercase, lowercase & number
                  </p>
                )}
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(true);
                      setErrors({});
                    }}
                    className="text-xs text-primary hover:underline mt-1"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>

              {/* Referral Code Field - Only show for signup */}
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="referralCode" className="text-sm">Referral Code (Optional)</Label>
                  <Input
                    id="referralCode"
                    type="text"
                    placeholder="Enter referral code"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    className="bg-muted border-border h-12 uppercase tracking-widest"
                    maxLength={8}
                  />
                  <p className="text-xs text-muted-foreground">
                    Your referrer earns 500 XD Coins after your first successful redemption
                  </p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-12 text-base"
                disabled={loading}
              >
                {loading ? "Processing..." : isLogin ? "Login" : "Sign Up"}
              </Button>
            </form>

            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrors({});
                setReferralCode("");
              }}
              className="w-full text-sm text-muted-foreground hover:text-primary transition-colors py-2"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
            </button>
          </div>
        </Card>

        {/* Continue as Guest */}
        <Button
          variant="ghost"
          onClick={() => {
            enterGuestMode();
            navigate("/dashboard");
          }}
          className="w-full text-muted-foreground hover:text-foreground gap-2 h-11"
        >
          <Eye className="w-4 h-4" />
          Continue as Guest
        </Button>

        <Button
          onClick={() => setShowPolicyModal(true)}
          variant="outline"
          size="sm"
          className="w-full mb-3 text-xs gap-2"
        >
          <Shield className="w-3 h-3" />
          Transparency & Safety Policy
        </Button>

        {/* Policy Agreement Note */}
        <p className="text-[10px] text-muted-foreground text-center px-4">
          By signing up, you agree to our{" "}
          <button 
            onClick={() => setShowPolicyModal(true)}
            className="text-primary-readable underline"
          >
            Policy
          </button>
        </p>

        {/* Trust note */}
        <p className="text-[10px] text-muted-foreground text-center mt-2 px-4">
          XD Rewards is a 100% transparent and verified entertainment rewards platform. 1000 XD Coins = ₹10 INR.
        </p>

        {/* Bottom safe area spacer */}
        <div className="h-6" />
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
