import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import AppLayout from "@/components/AppLayout";
import { Mail, ChevronDown, ChevronUp, HelpCircle, Shield } from "lucide-react";
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
      if (!session) {
        navigate("/auth");
        return;
      }
      setLoading(false);
    };
    checkAuth();
  }, [navigate]);

  const handleContactSupport = () => {
    window.location.href = "mailto:dxreward@gmail.com?subject=XD%20Rewards%20Support%20Request";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <AppLayout title="Support">
      <div className="px-4 py-4 space-y-4">
        {/* Header */}
        <Card className="p-6 bg-gradient-to-br from-primary/20 via-card to-card border-primary/30 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-1">Need Help?</h2>
          <p className="text-sm text-muted-foreground">Check our FAQs first, then contact support if needed</p>
        </Card>

        {/* FAQs Section */}
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

        {/* Contact Support Section */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground px-1">Still Need Help?</h2>
          
          <Card className="p-4 bg-card border-border/50">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Contact Support via Email</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Couldn't find your answer? Our support team is here to help.
                </p>
              </div>
              <Button 
                className="w-full bg-primary hover:bg-primary/90"
                onClick={handleContactSupport}
              >
                <Mail className="w-4 h-4 mr-2" />
                Contact Support via Email
              </Button>
              <p className="text-xs text-muted-foreground">
                Email: dxreward@gmail.com
              </p>
            </div>
          </Card>
        </div>

        {/* Anti-Fraud Notice */}
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

        {/* Disclaimer */}
        <Disclaimer variant="compact" />
      </div>
    </AppLayout>
  );
};

export default Support;
