import { useNavigate, useLocation } from "react-router-dom";
import { Home, Wallet, Trophy, Gift } from "lucide-react";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: "/dashboard", icon: Home, label: "Home" },
    { path: "/wallet", icon: Wallet, label: "Wallet" },
    { path: "/gift-cards", icon: Gift, label: "Gifts" },
    { path: "/leaderboard", icon: Trophy, label: "Ranks" },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border z-50 safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 ${
                active 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className={`relative ${active ? "scale-110" : ""} transition-transform`}>
                <item.icon className={`w-6 h-6 ${active ? "drop-shadow-[0_0_8px_hsl(var(--primary))]" : ""}`} />
                {active && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                )}
              </div>
              <span className={`text-[10px] mt-1 font-medium ${active ? "text-primary" : ""}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
