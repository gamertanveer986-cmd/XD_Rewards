import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Shield, LogOut, User as UserIcon } from "lucide-react";
import NotificationBell from "./NotificationBell";
import { supabase } from "@/integrations/supabase/client";
import { useGuest } from "@/contexts/GuestContext";

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
  showAdmin?: boolean;
  showLogout?: boolean;
  onLogout?: () => void;
}

/**
 * Premium fintech header.
 * Left: Username (or Back button when applicable).
 * Right: Notifications bell + Profile icon (link to /profile), optional admin/logout.
 */
const AppHeader = ({ showBack = false, showAdmin = false, showLogout = false, onLogout }: AppHeaderProps) => {
  const navigate = useNavigate();
  const { isGuest } = useGuest();
  const [displayName, setDisplayName] = useState<string>("");

  useEffect(() => {
    if (isGuest) {
      setDisplayName("Guest");
      return;
    }
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from("user_profiles")
        .select("display_name")
        .eq("user_id", session.user.id)
        .single();
      if (!mounted) return;
      setDisplayName(data?.display_name || session.user.email?.split("@")[0] || "User");
    })();
    return () => { mounted = false; };
  }, [isGuest]);

  return (
    <header className="sticky top-0 z-40 bg-background border-b border-border safe-area-top">
      <div className="flex items-center justify-between h-14 px-3 gap-2">
        {/* Left: Back arrow OR username */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {showBack ? (
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Back"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          ) : (
            <button
              onClick={() => navigate("/profile")}
              className="flex items-center gap-2 min-w-0 max-w-full text-left px-1 py-1 rounded-lg hover:bg-muted transition-colors"
              aria-label="My Profile"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-[hsl(0_70%_38%)] flex items-center justify-center shadow-[0_0_10px_hsl(0_65%_51%/0.35)] shrink-0">
                <span className="text-[11px] font-black text-primary-foreground">
                  {(displayName || "U").slice(0, 1).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground leading-none">Welcome</p>
                <p className="text-sm font-semibold text-foreground truncate leading-tight">
                  {displayName || "User"}
                </p>
              </div>
            </button>
          )}
        </div>

        {/* Right: bell + profile + admin/logout */}
        <div className="flex items-center gap-1 shrink-0">
          <NotificationBell />
          <button
            onClick={() => navigate("/profile")}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
            aria-label="My Profile"
          >
            <UserIcon className="w-5 h-5" />
          </button>
          {showAdmin && (
            <button
              onClick={() => navigate("/admin/dashboard")}
              className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors"
              aria-label="Admin"
            >
              <Shield className="w-5 h-5" />
            </button>
          )}
          {showLogout && onLogout && (
            <button
              onClick={onLogout}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
              aria-label="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
