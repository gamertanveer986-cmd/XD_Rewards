import { useEffect, useState } from "react";

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 300);
          return 100;
        }
        return prev + 4;
      });
    }, 50);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50">
      {/* Background glow effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/30 rounded-full blur-[80px] animate-pulse"></div>
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-48 h-48 bg-primary/20 rounded-full blur-[60px] animate-pulse" style={{ animationDelay: "0.5s" }}></div>
      </div>

      {/* Logo and branding */}
      <div className="relative z-10 flex flex-col items-center space-y-6">
        {/* App icon */}
        <div className="w-24 h-24 bg-gradient-to-br from-primary to-red-700 rounded-3xl flex items-center justify-center shadow-2xl animate-float">
          <span className="text-5xl font-black text-primary-foreground">X</span>
        </div>

        {/* App name */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gradient-red glow-red tracking-tight">
            XD REWARDS
          </h1>
          <p className="text-muted-foreground text-sm">Collect • Play • Enjoy</p>
        </div>

        {/* Loading bar */}
        <div className="w-48 space-y-2">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-red-500 rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">Loading...</p>
        </div>
      </div>

      {/* Disclaimer at bottom */}
      <div className="absolute bottom-6 left-4 right-4 text-center">
        <p className="text-[9px] text-muted-foreground leading-relaxed max-w-xs mx-auto">
          This app is a rewards-based entertainment platform. Reward points do not guarantee real money.
        </p>
      </div>
    </div>
  );
};

export default SplashScreen;
