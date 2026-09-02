import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield } from "lucide-react";
import { getAuthErrorMessage, withAuthTimeout } from "@/lib/authTimeout";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Check if admin is already logged in
  useEffect(() => {
    const checkAdminSession = async () => {
      try {
        const { data: { session }, error } = await withAuthTimeout(supabase.auth.getSession());
        if (error) throw error;
        if (session) {
          const { data: roleData, error: roleError } = await withAuthTimeout(
            supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", session.user.id)
              .eq("role", "admin")
              .maybeSingle(),
          );

          if (!roleError && roleData) navigate("/admin/dashboard");
        }
      } catch {
        // Keep the login form available if session restoration is unavailable.
      }
    };
    checkAdminSession();
  }, [navigate]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await withAuthTimeout(supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      }));

      if (error) throw error;
      if (!data.user) throw new Error("Login succeeded, but no user session was returned. Please try again.");

      // Verify admin role from user_roles table
      const { data: roleData, error: roleError } = await withAuthTimeout(
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .eq("role", "admin")
          .maybeSingle(),
      );

      if (roleError) {
        await supabase.auth.signOut();
        throw new Error(`Admin credentials were accepted, but role verification failed: ${roleError.message}`);
      }

      if (!roleData) {
        await supabase.auth.signOut();
        throw new Error("Unauthorized: Admin access required");
      }
      
      toast.success("Admin access granted");
      navigate("/admin/dashboard");
    } catch (error: unknown) {
      toast.error(getAuthErrorMessage(error, "Admin authentication failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/20 rounded-full blur-[100px] animate-pulse-glow"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: "1s" }}></div>
      </div>

      <div className="w-full max-w-md mx-auto px-4 relative z-10">
        <Card className="p-8 card-glow border-primary/20 bg-card/90 backdrop-blur-sm animate-slide-up">
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-2">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-gradient-red glow-red">
                Admin Portal
              </h1>
              <p className="text-muted-foreground">
                Secure administrative access
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email">Admin Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="admin@xdrewards.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-muted border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-password">Password</Label>
                <Input
                  id="admin-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-muted border-border"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-6 text-lg animate-pulse-glow"
                disabled={loading}
              >
                {loading ? "Authenticating..." : "Access Admin Panel"}
              </Button>
            </form>

            {/* Security Notice */}
            <div className="pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">
                🔒 Secure admin access only. All login attempts are monitored.
              </p>
            </div>

            {/* Back to main site */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate("/auth")}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                ← Back to main site
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;
