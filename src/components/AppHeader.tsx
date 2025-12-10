import { useNavigate } from "react-router-dom";
import { ChevronLeft, Shield, LogOut } from "lucide-react";

interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  showAdmin?: boolean;
  showLogout?: boolean;
  onLogout?: () => void;
}

const AppHeader = ({ title, showBack = false, showAdmin = false, showLogout = false, onLogout }: AppHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-top">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left side */}
        <div className="flex items-center gap-2 min-w-[60px]">
          {showBack && (
            <button 
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Title */}
        <h1 className="text-lg font-bold text-gradient-red absolute left-1/2 -translate-x-1/2">
          {title}
        </h1>

        {/* Right side */}
        <div className="flex items-center gap-1 min-w-[60px] justify-end">
          {showAdmin && (
            <button
              onClick={() => navigate("/admin/dashboard")}
              className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors"
            >
              <Shield className="w-5 h-5" />
            </button>
          )}
          {showLogout && onLogout && (
            <button
              onClick={onLogout}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
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
