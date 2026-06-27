import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ShieldCheck, BadgeCheck, Coins, Clock, FileText } from "lucide-react";

const STORAGE_KEY = "xd_terms_accepted_v1";

interface Props {
  children: React.ReactNode;
}

/**
 * Full-screen Terms & Agreements gate shown on first launch.
 * The "I Agree & Continue" button is enabled immediately — no scroll requirement.
 */
const TermsAgreementGate = ({ children }: Props) => {
  const [accepted, setAccepted] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      setAccepted(stored === "1");
    } catch {
      setAccepted(true);
    }
  }, []);

  const accept = () => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {/* ignore */}
    setAccepted(true);
  };

  if (accepted === null) return null;
  if (accepted) return <>{children}</>;

  return (
    <>
      {children}
      <div className="fixed inset-0 z-[100] bg-background flex flex-col safe-area-top safe-area-bottom">
        <div className="px-6 pt-8 pb-4 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-primary to-[hsl(0_70%_38%)] flex items-center justify-center shadow-[0_0_24px_hsl(0_65%_51%/0.5)] mb-4">
            <ShieldCheck className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Terms & Agreements</h1>
          <p className="text-xs text-muted-foreground mt-1.5">
            Please review and agree to continue using XD Rewards.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 space-y-4 hide-scrollbar">
          <section className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <BadgeCheck className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Our Transparency Promise</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              XD Rewards is a 100% transparent and verified platform. Every reward is verified and
              processed with full integrity.
            </p>
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Rewards & Conversion</h3>
            </div>
            <ul className="text-xs text-muted-foreground leading-relaxed space-y-1">
              <li>• Conversion: <span className="text-foreground font-medium">1000 XD Coins = ₹10 INR</span></li>
              <li>• Minimum Withdrawal: <span className="text-foreground font-medium">₹50 INR (5000 XD Coins)</span></li>
            </ul>
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Processing Time</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Rewards are processed within 48 hours after manual verification of tasks.
            </p>
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Account & Device Policy</h3>
            </div>
            <ul className="text-xs text-muted-foreground leading-relaxed space-y-1">
              <li>• One verified account is allowed per mobile device.</li>
              <li>• Fraudulent activity, bots, or automation will result in suspension.</li>
            </ul>
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Privacy</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We collect only your email address for authentication and the data necessary to operate the
              rewards platform. We never sell your personal information.
            </p>
          </section>
        </div>

        <div className="px-6 pt-3 pb-6 border-t border-border bg-background">
          <Button
            onClick={accept}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            I Agree & Continue
          </Button>
        </div>
      </div>
    </>
  );
};

export default TermsAgreementGate;
