import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import AppLayout from "@/components/AppLayout";
import { ArrowDownToLine, Wallet as WalletIcon, Gift, Video, Users, Edit2, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

const Wallet = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingUpi, setEditingUpi] = useState(false);
  const [upiId, setUpiId] = useState("");
  const [savingUpi, setSavingUpi] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      
      const { data } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .single();
      setProfile(data);
      setUpiId(data?.upi_id || "");
      setLoading(false);
    };
    checkAuth();
  }, [navigate]);

  const handleSaveUpi = async () => {
    if (!upiId.trim()) {
      toast.error("Please enter a valid UPI ID");
      return;
    }

    // Basic UPI ID validation
    const upiRegex = /^[\w.-]+@[\w.-]+$/;
    if (!upiRegex.test(upiId.trim())) {
      toast.error("Invalid UPI ID format (e.g., name@upi)");
      return;
    }

    try {
      setSavingUpi(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const { error } = await supabase
        .from("user_profiles")
        .update({ upi_id: upiId.trim() })
        .eq("user_id", session?.user.id);

      if (error) throw error;

      setProfile({ ...profile, upi_id: upiId.trim() });
      setEditingUpi(false);
      toast.success("UPI ID saved successfully");
    } catch (error) {
      console.error("Error saving UPI ID:", error);
      toast.error("Failed to save UPI ID");
    } finally {
      setSavingUpi(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const canWithdraw = (profile?.withdrawable_balance || 0) >= 50;

  return (
    <AppLayout title="Wallet">
      <div className="px-4 py-4 space-y-4">
        {/* Balance Card */}
        <Card className="p-6 bg-gradient-to-br from-primary/20 via-card to-card border-primary/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -mr-10 -mt-10" />
          <div className="relative z-10 text-center">
            <WalletIcon className="w-10 h-10 text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-1">Total Balance</p>
            <p className="text-5xl font-bold text-success mb-1">
              ₹{profile?.total_earnings?.toFixed(2) || "0.00"}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Withdrawable: ₹{profile?.withdrawable_balance?.toFixed(2) || "0.00"}
            </p>
            <Button 
              className="w-full bg-primary hover:bg-primary/90 h-12" 
              disabled={!canWithdraw}
            >
              <ArrowDownToLine className="w-4 h-4 mr-2" />
              {canWithdraw ? "Withdraw Now" : `Min ₹50 Required`}
            </Button>
          </div>
        </Card>

        {/* UPI ID Card */}
        <Card className="p-4 bg-card border-primary/30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Payment UPI ID</h3>
            {!editingUpi && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setEditingUpi(true)}
                className="h-8 px-2"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          {editingUpi ? (
            <div className="flex gap-2">
              <Input
                placeholder="Enter UPI ID (e.g., name@paytm)"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={handleSaveUpi} 
                disabled={savingUpi}
                size="sm"
                className="h-10"
              >
                {savingUpi ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
              </Button>
            </div>
          ) : (
            <p className={`text-sm ${profile?.upi_id ? 'text-primary font-medium' : 'text-muted-foreground italic'}`}>
              {profile?.upi_id || "Not set - tap edit to add your UPI ID"}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Your withdrawals will be sent to this UPI ID
          </p>
        </Card>

        {/* Earnings Breakdown */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground px-1">Earnings Breakdown</h2>
          
          <Card className="divide-y divide-border/50">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Gift className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Signup Bonus</p>
                  <p className="text-xs text-muted-foreground">Non-withdrawable</p>
                </div>
              </div>
              <p className="font-semibold text-success">₹{profile?.non_withdrawable_balance?.toFixed(2) || "10.00"}</p>
            </div>
            
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                  <Video className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="font-medium text-sm">Ad Earnings</p>
                  <p className="text-xs text-muted-foreground">Withdrawable</p>
                </div>
              </div>
              <p className="font-semibold">₹{profile?.withdrawable_balance?.toFixed(2) || "0.00"}</p>
            </div>
            
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="font-medium text-sm">Referral Earnings</p>
                  <p className="text-xs text-muted-foreground">{profile?.referrals_count || 0} referrals</p>
                </div>
              </div>
              <p className="font-semibold">₹{((profile?.referrals_count || 0) * 5).toFixed(2)}</p>
            </div>
          </Card>
        </div>

        {/* Withdrawal Info */}
        <Card className="p-4 bg-card border-border/50">
          <h3 className="font-semibold text-sm mb-3">Withdrawal Info</h3>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-success" />
              <span>Minimum withdrawal: ₹50</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-success" />
              <span>Payment method: UPI only</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-success" />
              <span>Processing time: 1-5 minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-success" />
              <span>No withdrawal fees</span>
            </div>
          </div>
        </Card>

        {/* Transaction History */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground px-1">Recent Transactions</h2>
          <Card className="p-6 bg-card border-border/50">
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <WalletIcon className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No transactions yet</p>
              <p className="text-xs text-muted-foreground mt-1">Start watching ads to earn!</p>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Wallet;
