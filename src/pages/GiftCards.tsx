import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AppLayout from "@/components/AppLayout";
import { Gift, ShoppingCart, Clock, Coins, Lock } from "lucide-react";
import Disclaimer from "@/components/Disclaimer";

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

  const getBrandIcon = (brand: string) => {
    const icons: Record<string, string> = {
      "Amazon": "🛒",
      "Google Play": "🎮",
      "Flipkart": "📦",
    };
    return icons[brand] || "🎁";
  };

  // Convert to points
  const totalPoints = Math.floor(balance * 100);

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
      <div className="px-4 py-4 space-y-4">
        {/* Balance Card */}
        <Card className="p-4 bg-gradient-to-r from-primary/20 to-transparent border-primary/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Your Points</p>
              <p className="text-2xl font-bold text-success">{totalPoints.toLocaleString()} pts</p>
            </div>
            <Coins className="w-10 h-10 text-primary/50" />
          </div>
        </Card>

        {/* Coming Soon Notice */}
        <Card className="p-4 bg-warning/10 border-warning/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
              <Lock className="w-5 h-5 text-warning" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Rewards Coming Soon</h3>
              <p className="text-xs text-muted-foreground">
                Keep collecting points! Redemption features are under development.
              </p>
            </div>
          </div>
        </Card>

        <Tabs defaultValue="browse" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="browse" className="text-xs">
              <ShoppingCart className="w-3 h-3 mr-1" />
              Browse
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs">
              <Clock className="w-3 h-3 mr-1" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Browse Tab */}
          <TabsContent value="browse" className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Demo Rewards</h3>
            
            {products.length === 0 ? (
              <Card className="p-6 text-center">
                <Gift className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No rewards available yet</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {products.map((product) => (
                  <Card key={product.id} className="p-4 bg-card border-border/50 opacity-75">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
                        {getBrandIcon(product.brand)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{product.name}</h4>
                        <p className="text-xs text-muted-foreground">Demo: {Math.floor(product.denomination * 100)} pts value</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-muted-foreground">{Math.floor(product.price * 100)} pts</p>
                        <span className="text-[10px] text-warning">Coming Soon</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Demo notice */}
            <Card className="p-4 bg-muted/30 border-border/50">
              <p className="text-xs text-muted-foreground text-center">
                Rewards shown are for demonstration purposes only and subject to availability.
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
                <p className="text-xs text-muted-foreground mt-1">Redemption features coming soon!</p>
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
                        <p className="text-sm font-bold">{Math.floor(purchase.amount_paid * 100)} pts</p>
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

        {/* Disclaimer */}
        <Disclaimer />
      </div>
    </AppLayout>
  );
};

export default GiftCards;
