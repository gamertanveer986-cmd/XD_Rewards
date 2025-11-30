import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const Wallet = () => {
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
          <h1 className="text-4xl font-bold text-gradient-red glow-red">My Wallet</h1>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>

        <Card className="p-8 card-glow border-primary/20 bg-card/90 text-center">
          <p className="text-sm text-muted-foreground mb-4">Total Balance</p>
          <p className="text-6xl font-bold text-success mb-2">₹10.00</p>
          <p className="text-muted-foreground mb-6">Signup bonus (non-withdrawable)</p>
          <Button className="bg-primary hover:bg-primary/90" size="lg" disabled>
            Withdraw (Min ₹50)
          </Button>
        </Card>

        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-6 card-glow border-primary/20 bg-card/90">
            <h3 className="text-xl font-semibold mb-4">Earnings Breakdown</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Signup Bonus</span>
                <span className="font-semibold text-success">₹10.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ad Earnings</span>
                <span className="font-semibold">₹0.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Referral Earnings</span>
                <span className="font-semibold">₹0.00</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 card-glow border-primary/20 bg-card/90">
            <h3 className="text-xl font-semibold mb-4">Withdrawal Info</h3>
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">• Minimum withdrawal: ₹50</p>
              <p className="text-muted-foreground">• Payment method: UPI only</p>
              <p className="text-muted-foreground">• Processing time: 1-5 minutes</p>
              <p className="text-muted-foreground">• No withdrawal fees</p>
            </div>
          </Card>
        </div>

        <Card className="p-6 card-glow border-primary/20 bg-card/90">
          <h3 className="text-xl font-semibold mb-4">Transaction History</h3>
          <div className="text-center py-8 text-muted-foreground">
            No transactions yet. Start watching ads to earn!
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Wallet;
