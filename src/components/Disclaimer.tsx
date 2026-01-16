import { Card } from "@/components/ui/card";
import { AlertTriangle, Info } from "lucide-react";

interface DisclaimerProps {
  variant?: "full" | "compact" | "footer";
}

const Disclaimer = ({ variant = "full" }: DisclaimerProps) => {
  if (variant === "footer") {
    return (
      <div className="text-[10px] text-muted-foreground text-center px-4 py-3 bg-muted/20 border-t border-border/30">
        <p>This app is a rewards-based entertainment platform. Reward points do not guarantee real money.</p>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground text-center px-4 py-2">
        <Info className="w-3 h-3 shrink-0" />
        <p>Reward points do not guarantee real money. Redemption depends on eligibility and availability.</p>
      </div>
    );
  }

  return (
    <Card className="p-4 bg-muted/30 border-border/50">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-4 h-4 text-warning" />
        </div>
        <div>
          <h4 className="font-medium text-sm mb-1">Important Notice</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            This app is a rewards-based entertainment platform. Users earn reward points by engaging with ads and activities. 
            Reward points do not guarantee real money. Any redemption depends on eligibility, verification, and availability.
          </p>
        </div>
      </div>
    </Card>
  );
};

export default Disclaimer;
