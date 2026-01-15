import { Card } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface DisclaimerProps {
  compact?: boolean;
}

const Disclaimer = ({ compact = false }: DisclaimerProps) => {
  if (compact) {
    return (
      <p className="text-[10px] text-muted-foreground text-center px-4">
        For entertainment only. Points are promotional and have no monetary value.
      </p>
    );
  }

  return (
    <Card className="p-4 bg-muted/30 border-border/50">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-4 h-4 text-warning" />
        </div>
        <div>
          <h4 className="font-medium text-sm mb-1">Disclaimer</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            This application is designed for entertainment purposes only. Users earn points for in-app activities. 
            No real money withdrawal or guaranteed earnings are promised. Rewards are promotional and subject to change.
          </p>
        </div>
      </div>
    </Card>
  );
};

export default Disclaimer;
