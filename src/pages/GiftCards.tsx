import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import { Gift, ShoppingCart, Ticket, Loader2, CheckCircle, Clock } from "lucide-react";

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
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<GiftCardProduct[]>([]);
  const [purchases, setPurchases] = useState<GiftCardPurchase[]>([]);
  const [balance, setBalance] = useState(0);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
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
  }, [navigate]);

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
      .select("withdrawable_balance")
      .eq("user_id", userId)
      .single();
    setBalance(data?.withdrawable_balance || 0);
  };

  const fetchPurchases = async (userId: string) => {
    const { data } = await supabase
      .from("gift_card_purchases")
      .select("*, product:gift_card_products(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setPurchases(data || []);
  };

  const handleRedeem = async () => {
    if (!redeemCode.trim()) {
      toast.error("Please enter a gift card code");
      return;
    }

    setRedeeming(true);
    try {
      const { data, error } = await supabase.rpc("redeem_gift_card", {
        p_user_id: user.id,
        p_code: redeemCode.trim()
      });

      if (error) throw error;
      
      const result = data as { success: boolean; message: string; value?: number };
      
      if (result.success) {
        toast.success(result.message);
        setRedeemCode("");
        fetchBalance(user.id);
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to redeem gift card");
    } finally {
      setRedeeming(false);
    }
  };

  const handlePurchase = async (product: GiftCardProduct) => {
    if (balance < product.price) {
      toast.error("Insufficient balance");
      return;
    }

    setPurchasing(product.id);
    try {
      const { data, error } = await supabase.rpc("purchase_gift_card", {
        p_user_id: user.id,
        p_product_id: product.id
      });

      if (error) throw error;
      
      const result = data as { success: boolean; message: string };
      
      if (result.success) {
        toast.success(result.message);
        fetchBalance(user.id);
        fetchPurchases(user.id);
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to purchase gift card");
    } finally {
      setPurchasing(null);
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
    <AppLayout title="Gift Cards">
      <div className="px-4 py-4 space-y-4">
        {/* Balance Card */}
        <Card className="p-4 bg-gradient-to-r from-primary/20 to-transparent border-primary/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Available Balance</p>
              <p className="text-2xl font-bold text-success">₹{balance.toFixed(2)}</p>
            </div>
            <Gift className="w-10 h-10 text-primary/50" />
          </div>
        </Card>

        <Tabs defaultValue="purchase" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="purchase" className="text-xs">
              <ShoppingCart className="w-3 h-3 mr-1" />
              Buy
            </TabsTrigger>
            <TabsTrigger value="redeem" className="text-xs">
              <Ticket className="w-3 h-3 mr-1" />
              Redeem
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs">
              <Clock className="w-3 h-3 mr-1" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Purchase Tab */}
          <TabsContent value="purchase" className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Available Gift Cards</h3>
            
            {products.length === 0 ? (
              <Card className="p-6 text-center">
                <Gift className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No gift cards available</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {products.map((product) => (
                  <Card key={product.id} className="p-4 bg-card border-border/50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
                        {getBrandIcon(product.brand)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{product.name}</h4>
                        <p className="text-xs text-muted-foreground">Value: ₹{product.denomination}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-success">₹{product.price}</p>
                        <Button
                          size="sm"
                          className="mt-1 h-7 text-xs"
                          onClick={() => handlePurchase(product)}
                          disabled={purchasing === product.id || balance < product.price}
                        >
                          {purchasing === product.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            "Buy"
                          )}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Redeem Tab */}
          <TabsContent value="redeem" className="space-y-4">
            <Card className="p-4 bg-card border-border/50">
              <div className="space-y-4">
                <div className="text-center">
                  <Ticket className="w-12 h-12 mx-auto text-primary mb-2" />
                  <h3 className="font-semibold">Redeem Gift Card</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter your gift card code to add balance
                  </p>
                </div>
                
                <div className="space-y-3">
                  <Input
                    placeholder="Enter gift card code"
                    value={redeemCode}
                    onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                    className="text-center font-mono tracking-wider"
                    maxLength={20}
                  />
                  <Button 
                    className="w-full" 
                    onClick={handleRedeem}
                    disabled={redeeming || !redeemCode.trim()}
                  >
                    {redeeming ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Gift className="w-4 h-4 mr-2" />
                    )}
                    Redeem Code
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Purchase History</h3>
            
            {purchases.length === 0 ? (
              <Card className="p-6 text-center">
                <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No purchases yet</p>
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
                          <CheckCircle className="w-5 h-5 text-success" />
                        ) : (
                          <Clock className="w-5 h-5 text-warning" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">
                          {(purchase.product as GiftCardProduct)?.name || "Gift Card"}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {new Date(purchase.created_at).toLocaleDateString()}
                        </p>
                        {purchase.redemption_code && (
                          <p className="text-xs font-mono text-primary mt-1">
                            Code: {purchase.redemption_code}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">₹{purchase.amount_paid}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                          purchase.status === "completed" 
                            ? "bg-success/20 text-success" 
                            : "bg-warning/20 text-warning"
                        }`}>
                          {purchase.status}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default GiftCards;