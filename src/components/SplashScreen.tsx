import { useEffect, useState } from "react";
import { LifeBuoy } from "lucide-react";

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [progress, setProgress] = useState(0);
  const [showSupport, setShowSupport] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 250);
          return 100;
        }
        return prev + 4;
      });
    }, 50);

    // Surface support button if loading hangs past 8s
    const hangTimer = setTimeout(() => setShowSupport(true), 8000);

    return () => {
      clearInterval(timer);
      clearTimeout(hangTimer);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50">
      {/* Subtle crimson glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-72 h-72 bg-primary/20 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center space-y-8">
        {/* Crimson monogram */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-[hsl(0_70%_38%)] flex items-center justify-center shadow-[0_0_40px_hsl(0_65%_51%/0.5)]">
          <span className="text-4xl font-black tracking-tight text-primary-foreground">XD</span>
        </div>

        {/* Wordmark */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-[0.25em] text-foreground">
            XD&nbsp;REWARDS
          </h1>
          <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
            Premium Rewards Platform
          </p>
        </div>

        {/* Thin progress bar */}
        <div className="w-56">
          <div className="h-[3px] bg-muted/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Support button shown if loading hangs */}
      {showSupport && (
        <a
          href="mailto:dxreward@gmail.com?subject=XD%20Rewards%20—%20Loading%20Issue"
          className="absolute bottom-10 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card/80 backdrop-blur text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
        >
          <LifeBuoy className="w-4 h-4" />
          Need help? Contact Support
        </a>
      )}
    </div>
  );
};

export default SplashScreen;
