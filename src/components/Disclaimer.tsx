import { Card } from "@/components/ui/card";
import { BadgeCheck, ShieldCheck } from "lucide-react";

interface DisclaimerProps {
  variant?: "full" | "compact" | "footer" | "coins";
}

const Disclaimer = ({ variant = "full" }: DisclaimerProps) => {
  if (variant === "footer") {
    return (
      <div className="text-[10px] text-muted-foreground text-center px-4 py-3 bg-muted/20 border-t border-border/30">
        <p>Rewards are processed within 48 hours after manual verification of tasks.</p>
      </div>
    );
  }

  if (variant === "coins") {
    return (
      <div className="text-[10px] text-muted-foreground text-center px-3 py-2 bg-card border border-border rounded-lg">
        <p>1000 XD Coins = ₹10 INR · Processed within 48 hours after manual verification.</p>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className="flex items-start gap-2 text-[10px] text-muted-foreground px-4 py-2">
        <BadgeCheck className="w-3 h-3 shrink-0 mt-0.5 text-primary" />
        <p>100% transparent and verified platform. Rewards are processed within 48 hours after manual verification of tasks.</p>
      </div>
    );
  }

  return (
    <Card className="p-4 surface-elevated border-border">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h4 className="font-semibold text-sm mb-1">Our Trust Commitment</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            XD Rewards is a 100% transparent and verified platform. We are committed to honesty and provide clear,
            fair earning opportunities for our users. Every reward is verified and processed within 48 hours with full integrity.
          </p>
        </div>
      </div>
    </Card>
  );
};

export default Disclaimer;
