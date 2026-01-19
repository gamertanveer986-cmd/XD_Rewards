import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import AppLayout from "@/components/AppLayout";
import { Mail, MessageCircle, ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
import Disclaimer from "@/components/Disclaimer";

const faqs = [
  {
    question: "How do I earn reward points?",
    answer: "You earn reward points by completing Fast Reward Tasks (watching ads), claiming daily bonuses, and inviting friends to join."
  },
  {
    question: "How does the redemption feature work?",
    answer: "The redemption system is now live! Once you have enough XD Coins (minimum 50 value), you can redeem them for gift cards and rewards."
  },
  {
    question: "What is the referral bonus?",
    answer: "Invite friends and get 500 bonus reward points for each friend who signs up using your referral code."
  },
  {
    question: "Is this app free to use?",
    answer: "Yes! XD Rewards is 100% free. No deposits or money payments are required. This is not a gambling app."
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
          <h2 className="text-xl font-bold mb-1">How can we help?</h2>
          <p className="text-sm text-muted-foreground">Get in touch with our support team</p>
        </Card>

        {/* Contact Options */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 bg-card border-border/50">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Email</p>
                <p className="text-xs text-muted-foreground">Get help via email</p>
              </div>
              <Button 
                size="sm" 
                className="w-full bg-primary hover:bg-primary/90 text-xs h-9"
                asChild
              >
                <a href="mailto:Dxreward@gmail.com?subject=Support%20Request">Contact</a>
              </Button>
            </div>
          </Card>

          <Card className="p-4 bg-card border-border/50">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                <MessageCircle className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-sm">Live Chat</p>
                <p className="text-xs text-muted-foreground">Coming soon</p>
              </div>
              <Button size="sm" variant="outline" className="w-full text-xs h-9" disabled>
                Unavailable
              </Button>
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

        {/* Contact Info */}
        <Card className="p-4 bg-card border-border/50">
          <p className="text-sm text-center text-muted-foreground">
            Email us at{" "}
            <a 
              href="mailto:Dxreward@gmail.com?subject=Support%20Request" 
              className="text-primary font-medium underline"
            >
              Dxreward@gmail.com
            </a>
          </p>
        </Card>

        {/* Disclaimer */}
        <Disclaimer variant="compact" />
      </div>
    </AppLayout>
  );
};

export default Support;
