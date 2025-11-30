import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const Support = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };
    checkAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gradient-red glow-red">Support</h1>
            <p className="text-muted-foreground">We're here to help</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-6 card-glow border-primary/20 bg-card/90">
            <h3 className="text-xl font-semibold mb-4">📧 Email Support</h3>
            <p className="text-muted-foreground mb-4">Get help via email</p>
            <Button className="w-full bg-primary hover:bg-primary/90">
              support@xdrewards.com
            </Button>
          </Card>

          <Card className="p-6 card-glow border-primary/20 bg-card/90">
            <h3 className="text-xl font-semibold mb-4">💬 Live Chat</h3>
            <p className="text-muted-foreground mb-4">Chat with our team</p>
            <Button className="w-full" variant="outline">
              Start Chat (Coming Soon)
            </Button>
          </Card>
        </div>

        <Card className="p-6 card-glow border-primary/20 bg-card/90">
          <h3 className="text-xl font-semibold mb-4">Frequently Asked Questions</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">How do I withdraw my earnings?</h4>
              <p className="text-sm text-muted-foreground">
                You can withdraw your earnings once you reach the minimum threshold of ₹50. 
                Withdrawals are processed via UPI within 1-5 minutes.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">How much can I earn per ad?</h4>
              <p className="text-sm text-muted-foreground">
                You earn between ₹0.05 to ₹0.10 per ad watched. The exact amount depends 
                on the advertiser and ad length.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">What is the referral bonus?</h4>
              <p className="text-sm text-muted-foreground">
                Earn ₹5 for every friend you refer who signs up and watches their first ad. 
                Your referral code is in your dashboard.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Is there a limit to daily earnings?</h4>
              <p className="text-sm text-muted-foreground">
                There's no daily limit! Watch as many ads as you want and earn without restrictions.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Support;
