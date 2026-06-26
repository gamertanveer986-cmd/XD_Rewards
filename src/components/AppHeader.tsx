import { useNavigate } from "react-router-dom";
import { ChevronLeft, Shield, LogOut, Settings } from "lucide-react";
import NotificationBell from "./NotificationBell";

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
  showAdmin?: boolean;
  showLogout?: boolean;
  onLogout?: () => void;
}

/**
 * Premium fintech header — centered XD Rewards wordmark.
 * Left: Settings (or Back). Right: Notifications + optional admin/logout.
 * The `title` prop is intentionally ignored: the centered brand is the header.
 */
const AppHeader = ({ showBack = false, showAdmin = false, showLogout = false, onLogout }: AppHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border safe-area-top">
      <div className="relative flex items-center justify-between h-14 px-3">
        {/* Left: Settings / Back */}
        <div className="flex items-center gap-1 min-w-[64px]">
          {showBack ? (
            <button
              onClick={() => navigate(-1)}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Back"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          ) : (
            <button
              onClick={() => navigate("/settings")}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
              aria-label="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Centered wordmark */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-[hsl(0_70%_38%)] flex items-center justify-center shadow-[0_0_12px_hsl(0_65%_51%/0.4)]">
            <span className="text-[10px] font-black text-primary-foreground tracking-tight">XD</span>
          </div>
          <span className="text-base font-bold tracking-[0.18em] text-foreground">
            XD&nbsp;REWARDS
          </span>
        </div>

        {/* Right: Notifications + admin/logout */}
        <div className="flex items-center gap-1 min-w-[64px] justify-end">
          <NotificationBell />
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
