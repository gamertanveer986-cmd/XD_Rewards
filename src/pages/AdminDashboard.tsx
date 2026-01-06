import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface UserProfile {
  id: string;
  user_id: string;
  total_earnings: number;
  withdrawable_balance: number;
  non_withdrawable_balance: number;
  ads_watched: number;
  referrals_count: number;
  created_at: string;
  upi_id?: string;
  payment_status?: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: "admin" | "moderator" | "user";
  created_at: string;
}

interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: string;
  description: string;
  created_at: string;
}

interface DailyReward {
  id: string;
  user_id: string;
  current_streak: number;
  last_claim_date: string | null;
  total_claimed: number;
  created_at: string;
}

interface GiftCard {
  id: string;
  code: string;
  value: number;
  is_redeemed: boolean;
  redeemed_by: string | null;
  redeemed_at: string | null;
  created_at: string;
  expires_at: string | null;
}

interface GiftCardProduct {
  id: string;
  name: string;
  brand: string;
  denomination: number;
  price: number;
  is_active: boolean;
}

interface GiftCardPurchase {
  id: string;
  user_id: string;
  product_id: string;
  amount_paid: number;
  status: string;
  redemption_code: string | null;
  created_at: string;
  product?: GiftCardProduct;
}

type TabType = "overview" | "users" | "leaderboard" | "transactions" | "payments" | "daily" | "giftcards" | "roles" | "notifications" | "admob";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Form states
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [admobAppId, setAdmobAppId] = useState("");
  const [admobRewardedAdUnitId, setAdmobRewardedAdUnitId] = useState("");
  const [admobBannerAdUnitId, setAdmobBannerAdUnitId] = useState("");
  const [admobInterstitialAdUnitId, setAdmobInterstitialAdUnitId] = useState("");
  const [admobIsTesting, setAdmobIsTesting] = useState(false);
  const [dailyRewards, setDailyRewards] = useState<DailyReward[]>([]);
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [giftCardProducts, setGiftCardProducts] = useState<GiftCardProduct[]>([]);
  const [giftCardPurchases, setGiftCardPurchases] = useState<GiftCardPurchase[]>([]);
  const [newGiftCardCode, setNewGiftCardCode] = useState("");
  const [newGiftCardValue, setNewGiftCardValue] = useState("");
  const [newProductName, setNewProductName] = useState("");
  const [newProductBrand, setNewProductBrand] = useState("");
  const [newProductDenomination, setNewProductDenomination] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("");

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalEarnings: 0,
    totalWithdrawals: 0,
    totalAdsWatched: 0,
    pendingPayments: 0,
    totalPayable: 0
  });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/admin/login");
        return;
      }
      const { data: roleData, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (error || !roleData) {
        toast.error("Unauthorized: Admin access required");
        navigate("/admin/login");
        return;
      }
      await loadAllData();
    } catch (error) {
      console.error("Error checking admin access:", error);
      navigate("/admin/login");
    }
  };

  const loadAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadData(), loadAdmobConfig(), loadDailyRewards(), loadGiftCardsData()]);
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      const { data: profilesData } = await supabase.from("user_profiles").select("*").order("created_at", { ascending: false });
      setUserProfiles(profilesData || []);

      const { data: rolesData } = await supabase.from("user_roles").select("*").order("created_at", { ascending: false });
      setUserRoles(rolesData || []);

      const { data: txData } = await supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(100);
      setTransactions(txData || []);

      const totalEarnings = profilesData?.reduce((sum, p) => sum + Number(p.total_earnings), 0) || 0;
      const totalWithdrawals = txData?.filter(t => t.transaction_type === 'withdrawal').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const totalAdsWatched = profilesData?.reduce((sum, p) => sum + p.ads_watched, 0) || 0;
      const pendingPayments = profilesData?.filter(p => p.payment_status === 'pending' && Number(p.withdrawable_balance) >= 50).length || 0;
      const totalPayable = profilesData?.filter(p => Number(p.withdrawable_balance) >= 50).reduce((sum, p) => sum + Number(p.withdrawable_balance), 0) || 0;

      setStats({ totalUsers: profilesData?.length || 0, totalEarnings, totalWithdrawals, totalAdsWatched, pendingPayments, totalPayable });
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const loadAdmobConfig = async () => {
    try {
      const { data } = await supabase.from("admob_config").select("*").limit(1).single();
      if (data) {
        setAdmobAppId(data.app_id || "");
        setAdmobRewardedAdUnitId(data.rewarded_ad_unit_id || "");
        setAdmobBannerAdUnitId(data.banner_ad_unit_id || "");
        setAdmobInterstitialAdUnitId(data.interstitial_ad_unit_id || "");
        setAdmobIsTesting(data.is_testing || false);
      }
    } catch (error) {
      console.error("Error loading AdMob config:", error);
    }
  };

  const loadDailyRewards = async () => {
    try {
      const { data } = await supabase.from("daily_rewards").select("*").order("total_claimed", { ascending: false });
      setDailyRewards(data || []);
    } catch (error) {
      console.error("Error loading daily rewards:", error);
    }
  };

  const loadGiftCardsData = async () => {
    try {
      const [cardsRes, productsRes, purchasesRes] = await Promise.all([
        supabase.from("gift_cards").select("*").order("created_at", { ascending: false }),
        supabase.from("gift_card_products").select("*").order("brand", { ascending: true }),
        supabase.from("gift_card_purchases").select("*, product:gift_card_products(*)").order("created_at", { ascending: false })
      ]);
      if (cardsRes.data) setGiftCards(cardsRes.data);
      if (productsRes.data) setGiftCardProducts(productsRes.data);
      if (purchasesRes.data) setGiftCardPurchases(purchasesRes.data);
    } catch (error) {
      console.error("Error loading gift cards data:", error);
    }
  };

  const handleSendNotification = async () => {
    if (!notificationTitle.trim() || !notificationMessage.trim()) {
      toast.error("Enter title and message");
      return;
    }
    try {
      setActionLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const { data: notification, error } = await supabase.from("notifications").insert({ title: notificationTitle, message: notificationMessage, sent_by: user?.id }).select().single();
      if (error) throw error;
      const userNotifications = userProfiles.map(profile => ({ user_id: profile.user_id, notification_id: notification.id }));
      await supabase.from("user_notifications").insert(userNotifications);
      toast.success(`Sent to ${userProfiles.length} users`);
      setNotificationTitle("");
      setNotificationMessage("");
    } catch (error) {
      toast.error("Failed to send");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveAdmobConfig = async () => {
    if (!admobAppId.trim() || !admobRewardedAdUnitId.trim()) {
      toast.error("App ID and Rewarded Ad Unit ID required");
      return;
    }
    try {
      setActionLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const { data: existing } = await supabase.from("admob_config").select("id").limit(1).single();
      const configData = {
        app_id: admobAppId,
        rewarded_ad_unit_id: admobRewardedAdUnitId,
        banner_ad_unit_id: admobBannerAdUnitId || null,
        interstitial_ad_unit_id: admobInterstitialAdUnitId || null,
        is_testing: admobIsTesting,
        updated_at: new Date().toISOString(),
        updated_by: user?.id
      };
      if (existing) {
        await supabase.from("admob_config").update(configData).eq("id", existing.id);
      } else {
        await supabase.from("admob_config").insert(configData);
      }
      toast.success("AdMob config saved");
    } catch (error) {
      toast.error("Failed to save");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdatePaymentStatus = async (userId: string, status: string) => {
    try {
      setActionLoading(true);
      await supabase.from("user_profiles").update({ payment_status: status }).eq("user_id", userId);
      toast.success(`Status: ${status}`);
      await loadData();
    } catch (error) {
      toast.error("Failed to update");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignRole = async () => {
    if (!selectedUserId || !selectedRole) {
      toast.error("Select user and role");
      return;
    }
    try {
      setActionLoading(true);
      await supabase.from("user_roles").insert({ user_id: selectedUserId, role: selectedRole as any });
      toast.success("Role assigned");
      setSelectedUserId("");
      setSelectedRole("");
      await loadData();
    } catch (error: any) {
      toast.error(error.code === "23505" ? "Already has role" : "Failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeRole = async (roleId: string) => {
    try {
      setActionLoading(true);
      await supabase.from("user_roles").delete().eq("id", roleId);
      toast.success("Role revoked");
      await loadData();
    } catch (error) {
      toast.error("Failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateGiftCard = async () => {
    if (!newGiftCardCode.trim() || !newGiftCardValue) {
      toast.error("Enter code and value");
      return;
    }
    try {
      setActionLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("gift_cards").insert({ code: newGiftCardCode.toUpperCase(), value: parseFloat(newGiftCardValue), created_by: user?.id });
      toast.success("Gift card created");
      setNewGiftCardCode("");
      setNewGiftCardValue("");
      await loadGiftCardsData();
    } catch (error: any) {
      toast.error(error.code === "23505" ? "Code exists" : "Failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteGiftCard = async (id: string) => {
    try {
      await supabase.from("gift_cards").delete().eq("id", id);
      toast.success("Deleted");
      await loadGiftCardsData();
    } catch (error) {
      toast.error("Failed");
    }
  };

  const handleCreateProduct = async () => {
    if (!newProductName.trim() || !newProductBrand.trim() || !newProductDenomination || !newProductPrice) {
      toast.error("Fill all fields");
      return;
    }
    try {
      setActionLoading(true);
      await supabase.from("gift_card_products").insert({
        name: newProductName,
        brand: newProductBrand,
        denomination: parseFloat(newProductDenomination),
        price: parseFloat(newProductPrice)
      });
      toast.success("Product created");
      setNewProductName("");
      setNewProductBrand("");
      setNewProductDenomination("");
      setNewProductPrice("");
      await loadGiftCardsData();
    } catch (error) {
      toast.error("Failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleProductStatus = async (id: string, currentStatus: boolean) => {
    try {
      await supabase.from("gift_card_products").update({ is_active: !currentStatus }).eq("id", id);
      toast.success(!currentStatus ? "Activated" : "Deactivated");
      await loadGiftCardsData();
    } catch (error) {
      toast.error("Failed");
    }
  };

  const handleUpdatePurchaseStatus = async (id: string, status: string, code?: string) => {
    try {
      const updateData: any = { status, processed_at: new Date().toISOString() };
      if (code) updateData.redemption_code = code;
      await supabase.from("gift_card_purchases").update(updateData).eq("id", id);
      toast.success(`Status: ${status}`);
      await loadGiftCardsData();
    } catch (error) {
      toast.error("Failed");
    }
  };

  const filteredProfiles = userProfiles.filter(p => p.user_id.toLowerCase().includes(searchTerm.toLowerCase()) || (p.upi_id && p.upi_id.toLowerCase().includes(searchTerm.toLowerCase())));

  const tabs: { key: TabType; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "users", label: "Users" },
    { key: "leaderboard", label: "Leaderboard" },
    { key: "transactions", label: "Transactions" },
    { key: "payments", label: "Payments" },
    { key: "daily", label: "Daily" },
    { key: "giftcards", label: "Gift Cards" },
    { key: "roles", label: "Roles" },
    { key: "notifications", label: "Notify" },
    { key: "admob", label: "AdMob" }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Admin Panel</h1>
          <button onClick={() => navigate("/dashboard")} className="text-sm text-primary hover:underline">← Back</button>
        </div>
      </div>

      {/* Navigation - Single Line */}
      <div className="border-b border-border px-4 py-2 overflow-x-auto">
        <div className="flex gap-4 min-w-max">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`text-sm whitespace-nowrap ${activeTab === tab.key ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Overview */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-muted/50 rounded">
                <p className="text-muted-foreground">Users</p>
                <p className="text-xl font-bold">{stats.totalUsers}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded">
                <p className="text-muted-foreground">Total Earnings</p>
                <p className="text-xl font-bold text-green-500">₹{stats.totalEarnings.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded">
                <p className="text-muted-foreground">Ads Watched</p>
                <p className="text-xl font-bold">{stats.totalAdsWatched}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded">
                <p className="text-muted-foreground">Pending Payments</p>
                <p className="text-xl font-bold text-yellow-500">{stats.pendingPayments}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded">
                <p className="text-muted-foreground">Total Payable</p>
                <p className="text-xl font-bold text-red-500">₹{stats.totalPayable.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded">
                <p className="text-muted-foreground">Withdrawals</p>
                <p className="text-xl font-bold">₹{stats.totalWithdrawals.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Users */}
        {activeTab === "users" && (
          <div className="space-y-3">
            <Input placeholder="Search user ID or UPI..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="text-sm" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-4">User ID</th>
                    <th className="pb-2 pr-4">UPI</th>
                    <th className="pb-2 pr-4">Earnings</th>
                    <th className="pb-2 pr-4">Balance</th>
                    <th className="pb-2 pr-4">Ads</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProfiles.map(p => (
                    <tr key={p.id} className="border-b border-border/50">
                      <td className="py-2 pr-4 font-mono text-xs">{p.user_id.slice(0, 8)}...</td>
                      <td className="py-2 pr-4 text-primary">{p.upi_id || "-"}</td>
                      <td className="py-2 pr-4 text-green-500">₹{Number(p.total_earnings).toFixed(2)}</td>
                      <td className="py-2 pr-4">₹{Number(p.withdrawable_balance).toFixed(2)}</td>
                      <td className="py-2 pr-4">{p.ads_watched}</td>
                      <td className="py-2">
                        <span className={`text-xs ${p.payment_status === 'paid' ? 'text-green-500' : p.payment_status === 'processing' ? 'text-yellow-500' : 'text-red-500'}`}>
                          {p.payment_status || 'pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        {activeTab === "leaderboard" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Top earners</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-4">#</th>
                    <th className="pb-2 pr-4">User</th>
                    <th className="pb-2 pr-4">Earnings</th>
                    <th className="pb-2">Ads</th>
                  </tr>
                </thead>
                <tbody>
                  {[...userProfiles].sort((a, b) => Number(b.total_earnings) - Number(a.total_earnings)).slice(0, 20).map((p, i) => (
                    <tr key={p.id} className="border-b border-border/50">
                      <td className="py-2 pr-4 font-bold">{i + 1}</td>
                      <td className="py-2 pr-4 font-mono text-xs">{p.user_id.slice(0, 8)}...</td>
                      <td className="py-2 pr-4 text-green-500">₹{Number(p.total_earnings).toFixed(2)}</td>
                      <td className="py-2">{p.ads_watched}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Transactions */}
        {activeTab === "transactions" && (
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-4">User</th>
                    <th className="pb-2 pr-4">Type</th>
                    <th className="pb-2 pr-4">Amount</th>
                    <th className="pb-2 pr-4">Description</th>
                    <th className="pb-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => (
                    <tr key={tx.id} className="border-b border-border/50">
                      <td className="py-2 pr-4 font-mono text-xs">{tx.user_id.slice(0, 8)}...</td>
                      <td className="py-2 pr-4">
                        <span className={`text-xs ${tx.transaction_type === 'withdrawal' ? 'text-red-500' : 'text-green-500'}`}>
                          {tx.transaction_type}
                        </span>
                      </td>
                      <td className={`py-2 pr-4 ${tx.transaction_type === 'withdrawal' ? 'text-red-500' : 'text-green-500'}`}>
                        {tx.transaction_type === 'withdrawal' ? '-' : '+'}₹{Number(tx.amount).toFixed(2)}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground truncate max-w-[150px]">{tx.description || '-'}</td>
                      <td className="py-2 text-muted-foreground text-xs">{new Date(tx.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payments */}
        {activeTab === "payments" && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="p-2 bg-muted/50 rounded text-center">
                <p className="text-muted-foreground text-xs">Pending</p>
                <p className="font-bold text-yellow-500">{stats.pendingPayments}</p>
              </div>
              <div className="p-2 bg-muted/50 rounded text-center">
                <p className="text-muted-foreground text-xs">Payable</p>
                <p className="font-bold text-red-500">₹{stats.totalPayable.toFixed(0)}</p>
              </div>
              <div className="p-2 bg-muted/50 rounded text-center">
                <p className="text-muted-foreground text-xs">Earnings</p>
                <p className="font-bold text-green-500">₹{stats.totalEarnings.toFixed(0)}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Users with ≥₹50 balance</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-4">User</th>
                    <th className="pb-2 pr-4">UPI</th>
                    <th className="pb-2 pr-4">Amount</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {userProfiles.filter(p => Number(p.withdrawable_balance) >= 50).map(p => (
                    <tr key={p.id} className="border-b border-border/50">
                      <td className="py-2 pr-4 font-mono text-xs">{p.user_id.slice(0, 8)}...</td>
                      <td className="py-2 pr-4 text-primary">{p.upi_id || "-"}</td>
                      <td className="py-2 pr-4 text-green-500 font-medium">₹{Number(p.withdrawable_balance).toFixed(2)}</td>
                      <td className="py-2 pr-4">
                        <span className={`text-xs ${p.payment_status === 'paid' ? 'text-green-500' : p.payment_status === 'processing' ? 'text-yellow-500' : 'text-red-500'}`}>
                          {p.payment_status || 'pending'}
                        </span>
                      </td>
                      <td className="py-2">
                        <div className="flex gap-2">
                          <button onClick={() => handleUpdatePaymentStatus(p.user_id, 'processing')} className="text-xs text-yellow-500 hover:underline" disabled={actionLoading}>Process</button>
                          <button onClick={() => handleUpdatePaymentStatus(p.user_id, 'paid')} className="text-xs text-green-500 hover:underline" disabled={actionLoading}>Paid</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Daily Rewards */}
        {activeTab === "daily" && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="p-2 bg-muted/50 rounded text-center">
                <p className="text-muted-foreground text-xs">Claimed</p>
                <p className="font-bold">{dailyRewards.length}</p>
              </div>
              <div className="p-2 bg-muted/50 rounded text-center">
                <p className="text-muted-foreground text-xs">Total Given</p>
                <p className="font-bold text-green-500">₹{dailyRewards.reduce((sum, d) => sum + Number(d.total_claimed), 0).toFixed(2)}</p>
              </div>
              <div className="p-2 bg-muted/50 rounded text-center">
                <p className="text-muted-foreground text-xs">7-Day Streaks</p>
                <p className="font-bold text-primary">{dailyRewards.filter(d => d.current_streak >= 7).length}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-4">User</th>
                    <th className="pb-2 pr-4">Streak</th>
                    <th className="pb-2 pr-4">Last Claim</th>
                    <th className="pb-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyRewards.map(d => (
                    <tr key={d.id} className="border-b border-border/50">
                      <td className="py-2 pr-4 font-mono text-xs">{d.user_id.slice(0, 8)}...</td>
                      <td className="py-2 pr-4">Day {d.current_streak}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{d.last_claim_date || '-'}</td>
                      <td className="py-2 text-green-500">₹{Number(d.total_claimed).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Gift Cards */}
        {activeTab === "giftcards" && (
          <div className="space-y-4">
            {/* Create Code */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Create Code</p>
              <div className="flex gap-2">
                <Input placeholder="CODE" value={newGiftCardCode} onChange={(e) => setNewGiftCardCode(e.target.value.toUpperCase())} className="text-sm flex-1" />
                <Input type="number" placeholder="₹" value={newGiftCardValue} onChange={(e) => setNewGiftCardValue(e.target.value)} className="text-sm w-20" />
                <button onClick={handleCreateGiftCard} className="text-sm text-primary hover:underline px-2" disabled={actionLoading}>Add</button>
              </div>
            </div>

            {/* Codes List */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Codes ({giftCards.length})</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="pb-2 pr-4">Code</th>
                      <th className="pb-2 pr-4">Value</th>
                      <th className="pb-2 pr-4">Status</th>
                      <th className="pb-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {giftCards.map(gc => (
                      <tr key={gc.id} className="border-b border-border/50">
                        <td className="py-2 pr-4 font-mono">{gc.code}</td>
                        <td className="py-2 pr-4">₹{Number(gc.value).toFixed(0)}</td>
                        <td className="py-2 pr-4">
                          <span className={gc.is_redeemed ? 'text-green-500' : 'text-yellow-500'}>{gc.is_redeemed ? 'Used' : 'Active'}</span>
                        </td>
                        <td className="py-2">
                          {!gc.is_redeemed && <button onClick={() => handleDeleteGiftCard(gc.id)} className="text-xs text-red-500 hover:underline">Delete</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Create Product */}
            <div className="space-y-2 pt-4 border-t border-border">
              <p className="text-sm font-medium">Add Product</p>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Name" value={newProductName} onChange={(e) => setNewProductName(e.target.value)} className="text-sm" />
                <Input placeholder="Brand" value={newProductBrand} onChange={(e) => setNewProductBrand(e.target.value)} className="text-sm" />
                <Input type="number" placeholder="Denomination" value={newProductDenomination} onChange={(e) => setNewProductDenomination(e.target.value)} className="text-sm" />
                <Input type="number" placeholder="Price" value={newProductPrice} onChange={(e) => setNewProductPrice(e.target.value)} className="text-sm" />
              </div>
              <button onClick={handleCreateProduct} className="text-sm text-primary hover:underline" disabled={actionLoading}>Create Product</button>
            </div>

            {/* Products */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Products ({giftCardProducts.length})</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="pb-2 pr-4">Name</th>
                      <th className="pb-2 pr-4">Brand</th>
                      <th className="pb-2 pr-4">Value</th>
                      <th className="pb-2 pr-4">Price</th>
                      <th className="pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {giftCardProducts.map(p => (
                      <tr key={p.id} className="border-b border-border/50">
                        <td className="py-2 pr-4">{p.name}</td>
                        <td className="py-2 pr-4">{p.brand}</td>
                        <td className="py-2 pr-4">₹{Number(p.denomination).toFixed(0)}</td>
                        <td className="py-2 pr-4">₹{Number(p.price).toFixed(0)}</td>
                        <td className="py-2">
                          <button onClick={() => handleToggleProductStatus(p.id, p.is_active)} className={`text-xs hover:underline ${p.is_active ? 'text-green-500' : 'text-red-500'}`}>
                            {p.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Purchases */}
            <div className="space-y-2 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">Purchases ({giftCardPurchases.length})</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="pb-2 pr-4">User</th>
                      <th className="pb-2 pr-4">Product</th>
                      <th className="pb-2 pr-4">Paid</th>
                      <th className="pb-2 pr-4">Status</th>
                      <th className="pb-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {giftCardPurchases.map(p => (
                      <tr key={p.id} className="border-b border-border/50">
                        <td className="py-2 pr-4 font-mono text-xs">{p.user_id.slice(0, 8)}...</td>
                        <td className="py-2 pr-4">{p.product?.name || '-'}</td>
                        <td className="py-2 pr-4">₹{Number(p.amount_paid).toFixed(0)}</td>
                        <td className="py-2 pr-4">
                          <span className={`text-xs ${p.status === 'completed' ? 'text-green-500' : p.status === 'processing' ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-2">
                          {p.status === 'pending' && (
                            <div className="flex gap-2">
                              <button onClick={() => handleUpdatePurchaseStatus(p.id, 'processing')} className="text-xs text-yellow-500 hover:underline">Process</button>
                              <button onClick={() => handleUpdatePurchaseStatus(p.id, 'completed', 'GENERATED_CODE')} className="text-xs text-green-500 hover:underline">Complete</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Roles */}
        {activeTab === "roles" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Assign Role</p>
              <div className="flex gap-2">
                <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} className="flex-1 text-sm bg-background border border-border rounded px-2 py-1">
                  <option value="">Select User</option>
                  {userProfiles.map(p => (
                    <option key={p.user_id} value={p.user_id}>{p.user_id.slice(0, 12)}...</option>
                  ))}
                </select>
                <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="text-sm bg-background border border-border rounded px-2 py-1">
                  <option value="">Role</option>
                  <option value="admin">Admin</option>
                  <option value="moderator">Moderator</option>
                  <option value="user">User</option>
                </select>
                <button onClick={handleAssignRole} className="text-sm text-primary hover:underline px-2" disabled={actionLoading}>Assign</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-4">User</th>
                    <th className="pb-2 pr-4">Role</th>
                    <th className="pb-2 pr-4">Date</th>
                    <th className="pb-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {userRoles.map(r => (
                    <tr key={r.id} className="border-b border-border/50">
                      <td className="py-2 pr-4 font-mono text-xs">{r.user_id.slice(0, 8)}...</td>
                      <td className="py-2 pr-4">
                        <span className={`text-xs ${r.role === 'admin' ? 'text-red-500' : r.role === 'moderator' ? 'text-yellow-500' : 'text-muted-foreground'}`}>{r.role}</span>
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                      <td className="py-2">
                        <button onClick={() => handleRevokeRole(r.id)} className="text-xs text-red-500 hover:underline" disabled={actionLoading}>Revoke</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Notifications */}
        {activeTab === "notifications" && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Send to All Users ({userProfiles.length})</p>
            <Input placeholder="Title" value={notificationTitle} onChange={(e) => setNotificationTitle(e.target.value)} className="text-sm" />
            <Textarea placeholder="Message..." value={notificationMessage} onChange={(e) => setNotificationMessage(e.target.value)} rows={3} className="text-sm" />
            <button onClick={handleSendNotification} className="text-sm text-primary hover:underline" disabled={actionLoading || !notificationTitle.trim() || !notificationMessage.trim()}>
              {actionLoading ? 'Sending...' : 'Send Notification'}
            </button>
          </div>
        )}

        {/* AdMob */}
        {activeTab === "admob" && (
          <div className="space-y-3">
            <p className="text-sm font-medium">AdMob Configuration</p>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-muted-foreground">App ID *</label>
                <Input placeholder="ca-app-pub-xxx~xxx" value={admobAppId} onChange={(e) => setAdmobAppId(e.target.value)} className="text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Rewarded Ad Unit ID *</label>
                <Input placeholder="ca-app-pub-xxx/xxx" value={admobRewardedAdUnitId} onChange={(e) => setAdmobRewardedAdUnitId(e.target.value)} className="text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Banner Ad Unit ID</label>
                <Input placeholder="ca-app-pub-xxx/xxx" value={admobBannerAdUnitId} onChange={(e) => setAdmobBannerAdUnitId(e.target.value)} className="text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Interstitial Ad Unit ID</label>
                <Input placeholder="ca-app-pub-xxx/xxx" value={admobInterstitialAdUnitId} onChange={(e) => setAdmobInterstitialAdUnitId(e.target.value)} className="text-sm" />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" id="test-mode" checked={admobIsTesting} onChange={(e) => setAdmobIsTesting(e.target.checked)} />
                <label htmlFor="test-mode" className="text-sm">Test Mode</label>
              </div>
            </div>
            <button onClick={handleSaveAdmobConfig} className="text-sm text-primary hover:underline" disabled={actionLoading}>
              {actionLoading ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
