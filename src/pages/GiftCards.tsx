import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AppLayout from "@/components/AppLayout";
import { Gift, ShoppingCart, Clock, AlertCircle, Mail, Info } from "lucide-react";
import Disclaimer from "@/components/Disclaimer";
import XDCoin from "@/components/XDCoin";
import GuestBanner from "@/components/GuestBanner";
import { useGuest } from "@/contexts/GuestContext";
import { toast } from "sonner";

interface GiftCardProduct {
  id: string;
  name: string;
  brand: string;
  denomination: number;
  price: number;
  image_url: string | null;
  is_active: boolean;
}

interface GiftCardPurchase {
  id: string;
  product_id: string;
  amount_paid: number;
  status: string;
  redemption_code: string | null;
  created_at: string;
  product?: GiftCardProduct;
}

const GiftCards = () => {
  const { isGuest } = useGuest();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<GiftCardProduct[]>([]);
  const [purchases, setPurchases] = useState<GiftCardPurchase[]>([]);
  const [balance, setBalance] = useState(0);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [redeemEmail, setRedeemEmail] = useState("");
  const [emailError, setEmailError] = useState("");

  // Email validation
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const isEmailValid = validateEmail(redeemEmail);

  const handleEmailChange = (value: string) => {
    setRedeemEmail(value);
    if (value.trim() === "") {
      setEmailError("");
    } else if (!validateEmail(value)) {
      setEmailError("Please enter a valid email to continue");
    } else {
      setEmailError("");
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session && !isGuest) { navigate("/auth"); return; }
      if (isGuest) {
        await fetchProducts();
        setLoading(false);
        return;
      }
      setUser(session.user);
      await Promise.all([
        fetchProducts(),
        fetchBalance(session.user.id),
        fetchPurchases(session.user.id)
      ]);
      setLoading(false);
    };

    checkAuth();
  }, [navigate, isGuest]);

  const fetchProducts = async () => {
    const { data } = await supabase
      .from("gift_card_products")
      .select("*")
      .eq("is_active", true)
      .order("brand", { ascending: true });
    setProducts(data || []);
  };

  const fetchBalance = async (userId: string) => {
    const { data } = await supabase
      .from("user_profiles")
      .select("total_earnings")
      .eq("user_id", userId)
      .single();
    setBalance(data?.total_earnings || 0);
  };

  const fetchPurchases = async (userId: string) => {
    const { data } = await supabase
      .from("gift_card_purchases")
      .select("*, product:gift_card_products(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setPurchases(data || []);
  };

  const handleRedeem = async (product: GiftCardProduct) => {
    // Validate email first
    if (!redeemEmail.trim()) {
      setEmailError("Please enter a valid email to continue");
      toast.error("Please enter your email address first");
      return;
    }

    if (!isEmailValid) {
      setEmailError("Please enter a valid email to continue");
      toast.error("Please enter a valid email address");
      return;
    }

    const requiredCoins = Math.floor(product.price * 100);
    const userCoins = Math.floor(balance * 100);
    
    if (userCoins < requiredCoins) {
      toast.error(`You need ${requiredCoins} XD Coins to redeem this. You have ${userCoins}.`);
      return;
    }

    setRedeeming(product.id);
    try {
      const { data, error } = await supabase.rpc("purchase_gift_card", {
        p_user_id: user.id,
        p_product_id: product.id,
        p_email: redeemEmail.trim()
      });

      if (error) throw error;

      const result = data as { success: boolean; message: string };
      if (result.success) {
        toast.success("Redemption submitted! We'll process it within 24-48 hours.");
        setRedeemEmail(""); // Clear email after successful submission
        await Promise.all([
          fetchBalance(user.id),
          fetchPurchases(user.id)
        ]);
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to redeem");
    } finally {
      setRedeeming(null);
    }
  };

  const getBrandIcon = (brand: string) => {
    const icons: Record<string, string> = {
      "Amazon": "🛒",
      "Google Play": "🎮",
      "Flipkart": "📦",
    };
    return icons[brand] || "🎁";
  };

  // Convert to XD Coins
  const totalCoins = Math.floor(balance * 100);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout title="Rewards">
      <GuestBanner />
      <div className="px-4 py-4 space-y-4">
        {isGuest && (
          <Card className="p-4 bg-card border-border/50 flex items-center gap-3">
            <Info className="w-5 h-5 text-primary shrink-0" />
            <p className="text-sm text-muted-foreground">Login required to redeem rewards</p>
          </Card>
        )}
        {/* Balance Card */}
        <Card className="p-4 bg-gradient-to-r from-primary/20 to-transparent border-primary/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Your XD Coins</p>
              <div className="flex items-center gap-2">
                <XDCoin size="lg" />
                <p className="text-2xl font-bold text-success">{totalCoins.toLocaleString()}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Entertainment coins (in-app reward value only)</p>
            </div>
          </div>
        </Card>

        {/* Min Withdrawal Notice */}
        <Card className="p-3 bg-warning/10 border-warning/30">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Minimum 5000 XD Coins (50 value) required for redemption.
              </p>
              <p className="text-[10px] text-muted-foreground">
                Rewards are promotional and subject to availability and verification. 
                Gift cards or codes are not guaranteed cash rewards.
              </p>
            </div>
          </div>
        </Card>

        <Tabs defaultValue="browse" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="browse" className="text-xs">
              <ShoppingCart className="w-3 h-3 mr-1" />
              Redeem
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs">
              <Clock className="w-3 h-3 mr-1" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Browse Tab */}
          <TabsContent value="browse" className="space-y-3">
            {/* Email Input Section */}
            <Card className="p-4 bg-card border-border/50">
              <div className="space-y-2">
                <Label htmlFor="redeem-email" className="text-sm font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  Email Address
                </Label>
                <Input
                  id="redeem-email"
                  type="email"
                  placeholder="user@example.com"
                  value={redeemEmail}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  className={emailError ? "border-destructive" : ""}
                />
                {emailError && (
                  <p className="text-xs text-destructive">{emailError}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  This email will be used to send your redeem code after verification.
                </p>
              </div>
            </Card>

            <h3 className="text-sm font-semibold text-muted-foreground">Available Rewards</h3>
            
            {products.length === 0 ? (
              <Card className="p-6 text-center">
                <Gift className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No rewards available yet</p>
                <p className="text-xs text-muted-foreground mt-1">Check back soon!</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {products.map((product) => {
                  const requiredCoins = Math.floor(product.price * 100);
                  const canAfford = totalCoins >= requiredCoins;
                  const denominationValue = Math.floor(product.denomination);
                  const canRedeem = canAfford && isEmailValid;
                  
                  return (
                    <Card key={product.id} className={`p-4 bg-card border-border/50 ${!canAfford ? 'opacity-60' : ''}`}>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
                          {getBrandIcon(product.brand)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{product.name}</h4>
                          <p className="text-xs text-muted-foreground">{denominationValue} value reward</p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 justify-end mb-1">
                            <XDCoin size="sm" />
                            <p className="text-sm font-bold">{requiredCoins.toLocaleString()}</p>
                          </div>
                          <Button
                            size="sm"
                            disabled={!canRedeem || redeeming === product.id}
                            onClick={() => handleRedeem(product)}
                            className="text-xs h-7"
                            title={!isEmailValid ? "Enter a valid email first" : !canAfford ? "Insufficient coins" : ""}
                          >
                            {redeeming === product.id ? "Processing..." : canAfford ? (isEmailValid ? "Redeem" : "Enter Email") : "Need More"}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Info notice */}
            <Card className="p-4 bg-muted/30 border-border/50">
              <p className="text-xs text-muted-foreground text-center mb-2">
                Rewards subject to availability and verification. Processing time: 24-48 hours.
              </p>
              <p className="text-[10px] text-muted-foreground text-center">
                Gift cards or codes are not guaranteed cash rewards. All redemptions are for in-app entertainment value only.
              </p>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Redemption History</h3>
            
            {purchases.length === 0 ? (
              <Card className="p-6 text-center">
                <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No redemptions yet</p>
                <p className="text-xs text-muted-foreground mt-1">Redeem XD Coins for rewards!</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {purchases.map((purchase) => (
                  <Card key={purchase.id} className="p-4 bg-card border-border/50">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        purchase.status === "completed" ? "bg-success/20" : "bg-warning/20"
                      }`}>
                        {purchase.status === "completed" ? (
                          <Gift className="w-5 h-5 text-success" />
                        ) : (
                          <Clock className="w-5 h-5 text-warning" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">
                          {(purchase.product as GiftCardProduct)?.name || "Reward"}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {new Date(purchase.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <XDCoin size="sm" />
                          <p className="text-sm font-bold">{Math.floor(purchase.amount_paid * 100)}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                          purchase.status === "completed" 
                            ? "bg-success/20 text-success" 
                            : "bg-warning/20 text-warning"
                        }`}>
                          {purchase.status}
                        </span>
                      </div>
                    </div>
                    {purchase.status === "completed" && purchase.redemption_code && (
                      <div className="mt-3 p-2 bg-success/10 rounded-lg">
                        <p className="text-xs text-muted-foreground">Redemption Code:</p>
                        <p className="font-mono font-bold text-success">{purchase.redemption_code}</p>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Disclaimer */}
        <Disclaimer />
      </div>
    </AppLayout>
  );
};

export default GiftCards;
