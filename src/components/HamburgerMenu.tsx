import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, ShieldCheck, BadgeCheck, FileText, Mail, ExternalLink, User, Coins, Clock, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const HamburgerMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted">
          <Menu className="w-6 h-6" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[350px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-left">
            <div className="w-10 h-10 bg-trust-gradient rounded-xl flex items-center justify-center shadow-trust">
              <span className="text-xl font-black text-white">X</span>
            </div>
            <div>
              <p className="font-bold text-gradient-trust">XD REWARDS</p>
              <p className="text-[10px] text-muted-foreground font-normal">Transparent · Verified · Secure</p>
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Profile */}
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => { navigate("/profile"); setIsOpen(false); }}
          >
            <User className="w-4 h-4" />
            My Profile
          </Button>

          {/* About Us */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4" style={{ color: "hsl(var(--trust-amber))" }} />
              About Us
            </h3>
            <div className="rounded-xl p-4 bg-trust-gradient text-white shadow-trust">
              <p className="text-xs font-semibold uppercase tracking-wider opacity-80 mb-1">Brand Identity</p>
              <p className="text-sm font-bold leading-snug mb-2">
                100% Transparent, Fraud-free, and Secure Entertainment Platform.
              </p>
              <p className="text-[11px] leading-relaxed opacity-90">
                XD Rewards is a 100% transparent and verified platform. We are committed to honesty and provide
                clear, fair earning opportunities for our users. You can trust our process, as every reward is
                verified and processed with full integrity.
              </p>
            </div>
          </div>

          {/* Official Policy */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-gradient-trust">
              <ShieldCheck className="w-4 h-4" style={{ color: "hsl(var(--trust-purple-glow))" }} />
              XD REWARDS OFFICIAL POLICY
            </h3>

            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2 p-2.5 bg-trust-soft border border-trust rounded-lg">
                <BadgeCheck className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "hsl(var(--trust-amber))" }} />
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Verified & Fraud-free:</strong> Every reward is checked by our integrity team.
                </p>
              </div>

              <div className="flex items-start gap-2 p-2.5 bg-trust-soft border border-trust rounded-lg">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "hsl(var(--trust-purple-glow))" }} />
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">No Gambling:</strong> 100% free app. No deposits required.
                </p>
              </div>

              <div className="flex items-start gap-2 p-2.5 bg-trust-soft border border-trust rounded-lg">
                <Coins className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "hsl(var(--trust-amber))" }} />
                <div className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Redeem Rules:</strong>
                  <ul className="mt-1 space-y-0.5">
                    <li>• 1000 XD Coins = ₹10 INR</li>
                    <li>• Minimum withdrawal: ₹50 (5000 XD Coins)</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-2 p-2.5 bg-trust-soft border border-trust rounded-lg">
                <Clock className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "hsl(var(--trust-purple-glow))" }} />
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Processing:</strong> Rewards are processed within 48 hours after manual verification of tasks.
                </p>
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="space-y-2 pt-4 border-t border-border">
            <Button variant="outline" className="w-full justify-start gap-2" asChild>
              <a
                href="https://docs.google.com/document/d/1YrPSE23jfwKsz7h5PK7nrFqgqG2D6HOt6MlB0cJINPA/edit?usp=drivesdk"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FileText className="w-4 h-4" />
                Full Legal Policy
                <ExternalLink className="w-3 h-3 ml-auto" />
              </a>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => { navigate("/support"); setIsOpen(false); }}
            >
              <Mail className="w-4 h-4" />
              Support & FAQ
            </Button>
          </div>

          <div className="pt-4 border-t border-border">
            <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
              Every reward on XD Rewards is verified and processed with full integrity within 48 hours of task verification.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default HamburgerMenu;
