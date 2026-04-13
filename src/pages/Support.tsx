import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import AppLayout from "@/components/AppLayout";
import { Mail, ChevronDown, ChevronUp, HelpCircle, Shield, Smartphone, FileText, ExternalLink, Lock, AlertTriangle } from "lucide-react";
import Disclaimer from "@/components/Disclaimer";

const faqs = [
  {
    question: "How does XD Rewards work?",
    answer: "Users earn in-app coins by completing tasks and engaging with the app. Coins represent in-app reward value only."
  },
  {
    question: "Are rewards guaranteed?",
    answer: "No. Rewards are promotional and depend on availability and verification."
  },
  {
    question: "Is any payment or deposit required?",
    answer: "No. XD Rewards is completely free to use. This is an entertainment platform, not a gambling app."
  },
  {
    question: "When are withdrawals processed?",
    answer: "Withdrawals are processed within 24–48 hours after verification. Maximum 3 withdrawals per day with 20 value limit."
  },
  {
    question: "What happens if rules are violated?",
    answer: "Accounts involved in misuse, bots, automation, or suspicious activity may be suspended or banned without prior notice."
  }
];

const Support = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      setLoading(false);
    };
    checkAuth();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AppLayout title="Support">
      <div className="px-4 py-4 space-y-4">
        {/* Header */}
        <Card className="p-6 bg-gradient-to-br from-primary/20 via-card to-card border-primary/30 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-1">Need Help?</h2>
          <p className="text-sm text-muted-foreground">Check our FAQs first, then contact support if needed</p>
        </Card>

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

        {/* Contact Support */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground px-1">Still Need Help?</h2>
          <Card className="p-4 bg-card border-border/50">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Contact Support via Email</p>
                <p className="text-xs text-muted-foreground mt-1">Our team responds within 24–72 hours</p>
              </div>
              <Button
                className="w-full bg-primary hover:bg-primary/90"
                onClick={() => { window.location.href = "mailto:dxreward@gmail.com?subject=XD%20Rewards%20Support%20Request"; }}
              >
                <Mail className="w-4 h-4 mr-2" />
                Contact Support
              </Button>
              <p className="text-xs text-muted-foreground">Email: dxreward@gmail.com</p>
            </div>
          </Card>
        </div>

        {/* Our App Section */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground px-1">Our App</h2>
          <Card className="p-4 bg-gradient-to-r from-primary/10 to-transparent border-primary/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
                <Smartphone className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">XD Rewards App</h3>
                <p className="text-xs text-muted-foreground">Our official app will be available here.</p>
              </div>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">[APP URL WILL BE ADDED HERE]</p>
            </div>
          </Card>
        </div>

        {/* Policies Section */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground px-1">Policies</h2>

          {/* Privacy Policy */}
          <Card className="p-4 bg-card border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">Privacy Policy</h3>
            </div>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <p>• We collect only your email address for authentication</p>
              <p>• We do not sell or share your personal data</p>
              <p>• Third-party ads may collect anonymous usage data</p>
            </div>
          </Card>

          {/* Terms */}
          <Card className="p-4 bg-card border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">Terms of Service</h3>
            </div>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <p>• No deposit or payment is required to use XD Rewards</p>
              <p>• All rewards are virtual and for entertainment purposes only</p>
              <p>• Fraud, bots, or automation usage leads to permanent ban</p>
            </div>
          </Card>

          {/* Disclaimer */}
          <Card className="p-4 bg-card border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <h3 className="font-semibold text-sm">Disclaimer</h3>
            </div>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <p>• XD Rewards does not guarantee any earnings</p>
              <p>• This is NOT a job, investment, or income platform</p>
              <p>• Rewards are promotional and subject to verification</p>
            </div>
          </Card>

          {/* Full Legal Policy Link */}
          <Button variant="outline" className="w-full gap-2" asChild>
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

        {/* Anti-Fraud */}
        <Card className="p-4 bg-destructive/5 border-destructive/20">
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-sm">Anti-Fraud & Safety Notice</h4>
              <p className="text-xs text-muted-foreground mt-1">
                XD Rewards uses automated and manual systems to detect bots, auto-clickers, and unfair activity.
                Violations may lead to account suspension without prior notice.
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
