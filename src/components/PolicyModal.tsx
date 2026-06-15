import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShieldCheck, BadgeCheck, Coins, Clock, FileText, Mail, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PolicyModal = ({ isOpen, onClose }: PolicyModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto border-trust shadow-trust">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5" style={{ color: "hsl(var(--trust-amber))" }} />
            <span className="text-gradient-trust">XD REWARDS OFFICIAL POLICY</span>
          </DialogTitle>
        </DialogHeader>

        {/* Brand identity / Transparency Statement */}
        <div className="rounded-xl p-4 bg-trust-gradient text-white">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-80 mb-1">Our Promise</p>
          <p className="text-sm font-bold leading-snug">
            100% Transparent, Fraud-free, and Secure Entertainment Platform.
          </p>
          <p className="text-xs mt-2 leading-relaxed opacity-90">
            XD Rewards is a 100% transparent and verified platform. We are committed to honesty and provide clear,
            fair earning opportunities for our users. You can trust our process, as every reward is verified and
            processed with full integrity.
          </p>
        </div>

        <div className="space-y-3 py-3">
          <div className="flex items-start gap-3 p-3 bg-trust-soft border border-trust rounded-lg">
            <BadgeCheck className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "hsl(var(--trust-amber))" }} />
            <div>
              <h4 className="font-semibold text-sm">Verified & Fraud-free</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Every account, task, and reward is verified by our integrity team.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-trust-soft border border-trust rounded-lg">
            <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "hsl(var(--trust-purple-glow))" }} />
            <div>
              <h4 className="font-semibold text-sm">No Deposits. No Gambling.</h4>
              <p className="text-xs text-muted-foreground mt-1">
                XD Rewards is 100% free. We never ask for payments or deposits.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-trust-soft border border-trust rounded-lg">
            <Coins className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "hsl(var(--trust-amber))" }} />
            <div>
              <h4 className="font-semibold text-sm">Redeem Rules</h4>
              <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                <li>• Conversion: <strong className="text-foreground">1000 XD Coins = ₹10 INR</strong></li>
                <li>• Minimum Withdrawal: <strong className="text-foreground">₹50 INR (5000 XD Coins)</strong></li>
                <li>• Manual verification for full integrity</li>
              </ul>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-trust-soft border border-trust rounded-lg">
            <Clock className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "hsl(var(--trust-purple-glow))" }} />
            <div>
              <h4 className="font-semibold text-sm">Processing Time</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Rewards are processed within 48 hours after manual verification of tasks.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-muted rounded-lg border border-border">
            <FileText className="w-5 h-5 text-foreground shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-sm">Full Legal Policy</h4>
              <Button variant="link" className="p-0 h-auto text-xs text-primary" asChild>
                <a
                  href="https://docs.google.com/document/d/1YrPSE23jfwKsz7h5PK7nrFqgqG2D6HOt6MlB0cJINPA/edit?usp=drivesdk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1"
                >
                  View Full Policy <ExternalLink className="w-3 h-3" />
                </a>
              </Button>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-muted rounded-lg border border-border">
            <Mail className="w-5 h-5 text-foreground shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-sm">Contact Support</h4>
              <Button variant="link" className="p-0 h-auto text-xs text-primary" asChild>
                <a href="mailto:dxreward@gmail.com">dxreward@gmail.com</a>
              </Button>
            </div>
          </div>
        </div>

        <Button onClick={onClose} className="w-full bg-trust-gradient text-white hover:opacity-95">
          I Understand & Agree
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default PolicyModal;
