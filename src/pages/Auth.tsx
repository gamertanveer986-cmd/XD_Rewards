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
import { Shield } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [checkingSession, setCheckingSession] = useState(true);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
      setCheckingSession(false);
    };
    checkSession();
  }, [navigate]);

  const [signupSuccess, setSignupSuccess] = useState(false);

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
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate("/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });
        if (error) throw error;
        setSignupSuccess(true);
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || "Google authentication failed");
    }
  };

  if (showSplash || checkingSession) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
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
        <div className="text-center mb-6 pt-4">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-red-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-3xl font-black text-primary-foreground">X</span>
          </div>
          <h1 className="text-3xl font-bold text-gradient-red glow-red mb-2">
            XD REWARDS
          </h1>
          <p className="text-muted-foreground text-sm">Collect • Play • Enjoy</p>
        </div>

        {/* Transparency Policy Button */}
        <Button
          onClick={() => setShowPolicyModal(true)}
          className="w-full mb-6 bg-blue-600 hover:bg-blue-700 text-white gap-2"
        >
          <Shield className="w-4 h-4" />
          Transparency & Safety Policy
        </Button>

        {/* Features - Compact */}
        <div className="flex justify-center gap-6 mb-6">
          <div className="text-center">
            <p className="text-lg font-bold text-success">10 pts</p>
            <p className="text-[10px] text-muted-foreground">Per Task</p>
          </div>
          <div className="w-px bg-border" />
          <div className="text-center">
            <p className="text-lg font-bold text-primary">1000</p>
            <p className="text-[10px] text-muted-foreground">Welcome Bonus</p>
          </div>
          <div className="w-px bg-border" />
          <div className="text-center">
            <p className="text-lg font-bold">500</p>
            <p className="text-[10px] text-muted-foreground">Per Referral</p>
          </div>
        </div>

        {/* Auth Card */}
        <Card className="p-6 bg-card/90 border-border/50 backdrop-blur-sm">
          <div className="space-y-5">
            <div className="text-center">
              <h2 className="text-xl font-bold mb-1">
                {isLogin ? "Welcome Back" : "Create Account"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isLogin ? "Login to continue collecting" : "Sign up and get 1000 bonus points"}
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
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-12 text-base"
                disabled={loading}
              >
                {loading ? "Processing..." : isLogin ? "Login" : "Sign Up"}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full border-border hover:bg-muted h-12"
              onClick={handleGoogleAuth}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>

            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrors({});
              }}
              className="w-full text-sm text-muted-foreground hover:text-primary transition-colors py-2"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
            </button>
          </div>
        </Card>

        {/* Policy Agreement Note */}
        <p className="text-[11px] text-muted-foreground text-center mt-4 px-4">
          By signing up, you agree to our{" "}
          <button 
            onClick={() => setShowPolicyModal(true)}
            className="text-primary underline"
          >
            Policy
          </button>
        </p>

        {/* Disclaimer */}
        <p className="text-[10px] text-muted-foreground text-center mt-2 px-4">
          Reward points do not guarantee real money. This is an entertainment platform.
        </p>

        {/* Bottom safe area spacer */}
        <div className="h-6" />
      </div>

      {/* Policy Modal */}
      <PolicyModal isOpen={showPolicyModal} onClose={() => setShowPolicyModal(false)} />
    </div>
  );
};

export default Auth;
