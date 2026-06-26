import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import AppLayout from "@/components/AppLayout";
import {
  Mail, ChevronDown, ChevronUp, HelpCircle, ShieldCheck, Smartphone, FileText,
  ExternalLink, Lock, BadgeCheck, Info, Coins, Clock, Sparkles
} from "lucide-react";
import Disclaimer from "@/components/Disclaimer";
import GuestBanner from "@/components/GuestBanner";
import { useGuest } from "@/contexts/GuestContext";

const faqs = [
  {
    question: "How does XD Rewards work?",
    answer: "XD Rewards is a transparent entertainment platform where users earn XD Coins by completing verified tasks and engaging with the app. Earned coins can be redeemed for real rewards in INR."
  },
  {
    question: "How are XD Coins converted to ₹ INR?",
    answer: "The conversion is simple and fixed: 1000 XD Coins = ₹10 INR. The minimum withdrawal is ₹50 INR (equivalent to 5000 XD Coins)."
  },
  {
    question: "Is any payment or deposit required?",
    answer: "No. XD Rewards is 100% free to use. We never ask for deposits — this is an entertainment rewards platform, not a gambling app."
  },
  {
    question: "When are withdrawals processed?",
    answer: "Rewards are processed within 48 hours after manual verification of tasks. Every withdrawal is reviewed by our integrity team to ensure full transparency."
  },
  {
    question: "What happens if rules are violated?",
    answer: "Accounts involved in misuse, bots, automation, or fraudulent activity may be suspended to protect the integrity of the platform for honest users."
  }
];

const Support = () => {
  const { isGuest } = useGuest();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session && !isGuest) { navigate("/auth"); return; }
      setLoading(false);
    };
    checkAuth();
  }, [navigate, isGuest]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AppLayout title="Support">
      <GuestBanner />
      <div className="px-4 py-4 space-y-4">
        {isGuest && (
          <Card className="p-4 bg-card border-border/50 flex items-center gap-3">
            <Info className="w-5 h-5 text-primary shrink-0" />
            <p className="text-sm text-muted-foreground">Login required to contact support</p>
          </Card>
        )}

        {/* Transparency Statement — required exact copy */}
        <Card className="p-5 bg-trust-gradient border-trust shadow-trust text-white">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5" style={{ color: "hsl(var(--trust-amber))" }} />
            <h2 className="text-sm font-bold uppercase tracking-wider">Our Transparency Promise</h2>
          </div>
          <p className="text-sm leading-relaxed">
            XD Rewards is a 100% transparent and verified platform. We are committed to honesty and provide
            clear, fair earning opportunities for our users. You can trust our process, as every reward is
            verified and processed with full integrity.
          </p>
        </Card>

        {/* Header */}
        <Card className="p-6 bg-trust-soft border-trust text-center">
          <div className="w-16 h-16 rounded-2xl bg-trust-gradient flex items-center justify-center mx-auto mb-4 shadow-trust">
            <HelpCircle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold mb-1 text-gradient-trust">Need Help?</h2>
          <p className="text-sm text-muted-foreground">Browse the FAQs below or contact our support team directly.</p>
        </Card>

        {/* Brand Identity / About */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground px-1">About XD Rewards</h2>
          <Card className="p-4 bg-card border-trust">
            <div className="flex items-center gap-2 mb-2">
              <BadgeCheck className="w-4 h-4" style={{ color: "hsl(var(--trust-amber))" }} />
              <h3 className="font-semibold text-sm">100% Transparent, Fraud-free, and Secure</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              XD Rewards is a premium entertainment rewards platform built on integrity. Every task, every coin,
              and every payout is verified by our internal team — giving you a clear, fair, and secure way to
              earn rewards in INR.
            </p>
          </Card>
        </div>

        {/* Redeem Rules */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground px-1">Redeem Rules</h2>
          <Card className="p-4 bg-trust-soft border-trust space-y-3">
            <div className="flex items-start gap-3">
              <Coins className="w-4 h-4 mt-0.5" style={{ color: "hsl(var(--trust-amber))" }} />
              <div className="text-xs">
                <p className="font-semibold text-sm">Conversion</p>
                <p className="text-muted-foreground">1000 XD Coins = <strong className="text-foreground">₹10 INR</strong></p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <BadgeCheck className="w-4 h-4 mt-0.5" style={{ color: "hsl(var(--trust-amber))" }} />
              <div className="text-xs">
                <p className="font-semibold text-sm">Minimum Withdrawal</p>
                <p className="text-muted-foreground"><strong className="text-foreground">₹50 INR</strong> (equivalent to 5000 XD Coins)</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 mt-0.5" style={{ color: "hsl(var(--trust-purple-glow))" }} />
              <div className="text-xs">
                <p className="font-semibold text-sm">Processing Time</p>
                <p className="text-muted-foreground">Rewards are verified and processed within 48 hours manually.</p>
              </div>
            </div>
            <div className="rounded-lg bg-background/40 border border-trust p-2.5">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Disclaimer:</strong> Rewards are processed within 48 hours after manual verification of tasks.
              </p>
            </div>
          </Card>
        </div>

        {/* FAQs */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground px-1">Frequently Asked Questions</h2>
          <Card className="bg-card border-border/50 divide-y divide-border/50 overflow-hidden">
            {faqs.map((faq, index) => (
              <div key={index}>
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="w-full p-4 text-left flex items-center justify-between gap-3 hover:bg-muted/50 transition-colors"
                >
                  <span className="font-medium text-sm">{faq.question}</span>
                  {expandedFaq === index ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                </button>
                {expandedFaq === index && (
                  <div className="px-4 pb-4">
                    <p className="text-sm text-muted-foreground">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </Card>
        </div>

        {/* Contact */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground px-1">Still Need Help?</h2>
          <Card className="p-4 bg-card border-border/50">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-trust-gradient flex items-center justify-center mx-auto shadow-trust">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-medium text-sm">Contact Support via Email</p>
                <p className="text-xs text-muted-foreground mt-1">Our team responds within 24–72 hours</p>
              </div>
              <Button
                className="w-full bg-trust-gradient text-white hover:opacity-95 border-0"
                onClick={() => { window.location.href = "mailto:dxreward@gmail.com?subject=XD%20Rewards%20Support%20Request"; }}
              >
                <Mail className="w-4 h-4 mr-2" />
                Contact Support
              </Button>
              <p className="text-xs text-muted-foreground">Email: dxreward@gmail.com</p>
            </div>
          </Card>
        </div>

        {/* Send Feedback */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground px-1">Send Feedback</h2>
          <Card className="p-4 surface-elevated border-border">
            <p className="text-xs text-muted-foreground mb-3">
              Have a suggestion, idea, or bug to report? Share it with our team — every message is read.
            </p>
            <Button
              variant="outline"
              className="w-full border-border"
              onClick={() => { window.location.href = "mailto:dxreward@gmail.com?subject=XD%20Rewards%20Feedback"; }}
            >
              <Mail className="w-4 h-4 mr-2" />
              Send Feedback Email
            </Button>
          </Card>
        </div>


        {/* Policies */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground px-1">Policies</h2>

          {/* Privacy */}
          <Card className="p-4 bg-card border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-4 h-4" style={{ color: "hsl(var(--trust-purple-glow))" }} />
              <h3 className="font-semibold text-sm">Privacy Policy</h3>
            </div>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <p>• We collect only your email address for secure authentication.</p>
              <p>• We never sell or share your personal data with third parties.</p>
              <p>• Encrypted storage and strict access controls protect your account.</p>
            </div>
          </Card>

          {/* Terms */}
          <Card className="p-4 bg-card border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4" style={{ color: "hsl(var(--trust-amber))" }} />
              <h3 className="font-semibold text-sm">Terms of Service</h3>
            </div>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <p>• XD Rewards is 100% free — no deposit or payment is ever required.</p>
              <p>• Rewards are paid in ₹ INR after manual verification (1000 XD Coins = ₹10).</p>
              <p>• Each user is allowed one verified account per mobile device.</p>
              <p>• Fraud, bots, or automation will result in permanent account suspension.</p>
            </div>
          </Card>

          {/* Reward Integrity */}
          <Card className="p-4 bg-trust-soft border-trust">
            <div className="flex items-center gap-2 mb-3">
              <BadgeCheck className="w-4 h-4" style={{ color: "hsl(var(--trust-amber))" }} />
              <h3 className="font-semibold text-sm">Reward Integrity</h3>
            </div>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <p>• Rewards are processed within 48 hours after manual verification of tasks.</p>
              <p>• Every payout is checked by our integrity team for full transparency.</p>
              <p>• Conversion is fixed and clear: 1000 XD Coins = ₹10 INR.</p>
            </div>
          </Card>

          {/* Full Legal */}
          <Button variant="outline" className="w-full gap-2 border-trust" asChild>
            <a
              href="https://docs.google.com/document/d/1YrPSE23jfwKsz7h5PK7nrFqgqG2D6HOt6MlB0cJINPA/edit?usp=drivesdk"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FileText className="w-4 h-4" />
              View Full Legal Policy
              <ExternalLink className="w-3 h-3 ml-auto" />
            </a>
          </Button>
        </div>

        {/* Safety */}
        <Card className="p-4 bg-trust-soft border-trust">
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "hsl(var(--trust-purple-glow))" }} />
            <div>
              <h4 className="font-medium text-sm">Safety & Integrity</h4>
              <p className="text-xs text-muted-foreground mt-1">
                XD Rewards uses automated and manual systems to maintain a fraud-free environment, so honest users
                always receive verified rewards on time.
              </p>
            </div>
          </div>
        </Card>

        <Disclaimer variant="compact" />
      </div>
    </AppLayout>
  );
};

export default Support;
