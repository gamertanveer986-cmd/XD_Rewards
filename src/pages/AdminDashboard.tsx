import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";

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

  const filteredProfiles = userProfiles.filter(p => 
    p.user_id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.upi_id && p.upi_id.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const tabs: { key: TabType; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "users", label: "Users" },
    { key: "leaderboard", label: "Leaderboard" },
    { key: "transactions", label: "Transactions" },
    { key: "payments", label: "Payments" },
    { key: "daily", label: "Daily" },
    { key: "giftcards", label: "Cards" },
    { key: "roles", label: "Roles" },
    { key: "notifications", label: "Notify" },
    { key: "admob", label: "AdMob" }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  const StatCard = ({ label, value, color = "text-foreground" }: { label: string; value: string | number; color?: string }) => (
    <div className="bg-card border border-border rounded-lg p-3">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );

  const SectionHeader = ({ title, count }: { title: string; count?: number }) => (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {count !== undefined && <span className="text-xs text-muted-foreground">({count})</span>}
    </div>
  );

  const ActionBtn = ({ onClick, label, color = "text-primary", disabled = false }: { onClick: () => void; label: string; color?: string; disabled?: boolean }) => (
    <button 
      onClick={onClick} 
      disabled={disabled || actionLoading}
      className={`text-xs ${color} hover:opacity-80 disabled:opacity-50 transition-opacity`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-base font-bold text-foreground">DXRewards Admin</h1>
          <div className="flex items-center gap-3">
            <button 
              onClick={loadAllData} 
              className="text-muted-foreground hover:text-foreground transition-colors"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => navigate("/dashboard")} className="text-xs text-primary hover:opacity-80">
              ← Exit
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="px-4 pb-2 overflow-x-auto scrollbar-hide">
          <div className="flex gap-1 min-w-max">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  activeTab === tab.key 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      {/* Content */}
      <main className="p-4 pb-20 max-w-4xl mx-auto">
        
        {/* Overview */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            <SectionHeader title="Dashboard Overview" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatCard label="Total Users" value={stats.totalUsers} />
              <StatCard label="Total Earnings" value={`₹${stats.totalEarnings.toFixed(2)}`} color="text-green-500" />
              <StatCard label="Ads Watched" value={stats.totalAdsWatched} />
              <StatCard label="Pending Payments" value={stats.pendingPayments} color="text-yellow-500" />
              <StatCard label="Total Payable" value={`₹${stats.totalPayable.toFixed(2)}`} color="text-primary" />
              <StatCard label="Total Withdrawals" value={`₹${stats.totalWithdrawals.toFixed(2)}`} />
            </div>
          </div>
        )}

        {/* Users */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <SectionHeader title="User Management" count={userProfiles.length} />
            <Input 
              placeholder="Search by User ID or UPI..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="h-9 text-sm"
            />
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr className="text-left text-muted-foreground">
                    <th className="px-3 py-2 font-medium">User</th>
                    <th className="px-3 py-2 font-medium">UPI</th>
                    <th className="px-3 py-2 font-medium">Earnings</th>
                    <th className="px-3 py-2 font-medium">Balance</th>
                    <th className="px-3 py-2 font-medium">Ads</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredProfiles.slice(0, 50).map(p => (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2 font-mono">{p.user_id.slice(0, 8)}</td>
                      <td className="px-3 py-2 text-primary">{p.upi_id || "-"}</td>
                      <td className="px-3 py-2 text-green-500">₹{Number(p.total_earnings).toFixed(2)}</td>
                      <td className="px-3 py-2">₹{Number(p.withdrawable_balance).toFixed(2)}</td>
                      <td className="px-3 py-2">{p.ads_watched}</td>
                      <td className="px-3 py-2">
                        <span className={p.payment_status === 'paid' ? 'text-green-500' : p.payment_status === 'processing' ? 'text-yellow-500' : 'text-muted-foreground'}>
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
          <div className="space-y-4">
            <SectionHeader title="Leaderboard Management" count={20} />
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr className="text-left text-muted-foreground">
                    <th className="px-3 py-2 font-medium w-10">#</th>
                    <th className="px-3 py-2 font-medium">User</th>
                    <th className="px-3 py-2 font-medium">Earnings</th>
                    <th className="px-3 py-2 font-medium">Referrals</th>
                    <th className="px-3 py-2 font-medium">Ads</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[...userProfiles]
                    .sort((a, b) => Number(b.total_earnings) - Number(a.total_earnings))
                    .slice(0, 20)
                    .map((p, i) => (
                      <tr key={p.id} className="hover:bg-muted/30">
                        <td className="px-3 py-2 font-bold text-primary">{i + 1}</td>
                        <td className="px-3 py-2 font-mono">{p.user_id.slice(0, 8)}</td>
                        <td className="px-3 py-2 text-green-500 font-medium">₹{Number(p.total_earnings).toFixed(2)}</td>
                        <td className="px-3 py-2">{p.referrals_count}</td>
                        <td className="px-3 py-2">{p.ads_watched}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Transactions */}
        {activeTab === "transactions" && (
          <div className="space-y-4">
            <SectionHeader title="Transactions Monitor" count={transactions.length} />
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr className="text-left text-muted-foreground">
                    <th className="px-3 py-2 font-medium">User</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Amount</th>
                    <th className="px-3 py-2 font-medium">Description</th>
                    <th className="px-3 py-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2 font-mono">{tx.user_id.slice(0, 8)}</td>
                      <td className="px-3 py-2">
                        <span className={tx.transaction_type === 'withdrawal' ? 'text-primary' : 'text-green-500'}>
                          {tx.transaction_type}
                        </span>
                      </td>
                      <td className={`px-3 py-2 font-medium ${tx.transaction_type === 'withdrawal' ? 'text-primary' : 'text-green-500'}`}>
                        {tx.transaction_type === 'withdrawal' ? '-' : '+'}₹{Math.abs(Number(tx.amount)).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground max-w-[120px] truncate">{tx.description || '-'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payments / Wallet Control */}
        {activeTab === "payments" && (
          <div className="space-y-4">
            <SectionHeader title="Wallet Control & Payments" />
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Pending" value={stats.pendingPayments} color="text-yellow-500" />
              <StatCard label="Payable" value={`₹${stats.totalPayable.toFixed(0)}`} color="text-primary" />
              <StatCard label="Earnings" value={`₹${stats.totalEarnings.toFixed(0)}`} color="text-green-500" />
            </div>
            <p className="text-[10px] text-muted-foreground">Users with withdrawable balance ≥ ₹50</p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr className="text-left text-muted-foreground">
                    <th className="px-3 py-2 font-medium">User</th>
                    <th className="px-3 py-2 font-medium">UPI</th>
                    <th className="px-3 py-2 font-medium">Amount</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {userProfiles.filter(p => Number(p.withdrawable_balance) >= 50).map(p => (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2 font-mono">{p.user_id.slice(0, 8)}</td>
                      <td className="px-3 py-2 text-primary">{p.upi_id || "-"}</td>
                      <td className="px-3 py-2 text-green-500 font-medium">₹{Number(p.withdrawable_balance).toFixed(2)}</td>
                      <td className="px-3 py-2">
                        <span className={p.payment_status === 'paid' ? 'text-green-500' : p.payment_status === 'processing' ? 'text-yellow-500' : 'text-muted-foreground'}>
                          {p.payment_status || 'pending'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <ActionBtn onClick={() => handleUpdatePaymentStatus(p.user_id, 'processing')} label="Process" color="text-yellow-500" />
                          <ActionBtn onClick={() => handleUpdatePaymentStatus(p.user_id, 'paid')} label="Paid" color="text-green-500" />
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
          <div className="space-y-4">
            <SectionHeader title="Daily Rewards Tracker" count={dailyRewards.length} />
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Claimers" value={dailyRewards.length} />
              <StatCard label="Total Given" value={`₹${dailyRewards.reduce((sum, d) => sum + Number(d.total_claimed), 0).toFixed(2)}`} color="text-green-500" />
              <StatCard label="7-Day Streaks" value={dailyRewards.filter(d => d.current_streak >= 7).length} color="text-primary" />
            </div>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr className="text-left text-muted-foreground">
                    <th className="px-3 py-2 font-medium">User</th>
                    <th className="px-3 py-2 font-medium">Streak</th>
                    <th className="px-3 py-2 font-medium">Last Claim</th>
                    <th className="px-3 py-2 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {dailyRewards.map(d => (
                    <tr key={d.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2 font-mono">{d.user_id.slice(0, 8)}</td>
                      <td className="px-3 py-2">Day {d.current_streak}</td>
                      <td className="px-3 py-2 text-muted-foreground">{d.last_claim_date || '-'}</td>
                      <td className="px-3 py-2 text-green-500">₹{Number(d.total_claimed).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Gift Cards */}
        {activeTab === "giftcards" && (
          <div className="space-y-6">
            {/* Create Code */}
            <div className="space-y-3">
              <SectionHeader title="Create Gift Card Code" />
              <div className="flex gap-2">
                <Input 
                  placeholder="CODE" 
                  value={newGiftCardCode} 
                  onChange={(e) => setNewGiftCardCode(e.target.value.toUpperCase())} 
                  className="h-9 text-sm flex-1 font-mono"
                />
                <Input 
                  type="number" 
                  placeholder="₹ Value" 
                  value={newGiftCardValue} 
                  onChange={(e) => setNewGiftCardValue(e.target.value)} 
                  className="h-9 text-sm w-24"
                />
                <button 
                  onClick={handleCreateGiftCard} 
                  disabled={actionLoading}
                  className="px-4 h-9 bg-primary text-primary-foreground text-xs font-medium rounded-md hover:opacity-90 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Codes List */}
            <div className="space-y-3">
              <SectionHeader title="Gift Card Codes" count={giftCards.length} />
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr className="text-left text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Code</th>
                      <th className="px-3 py-2 font-medium">Value</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {giftCards.map(gc => (
                      <tr key={gc.id} className="hover:bg-muted/30">
                        <td className="px-3 py-2 font-mono font-medium">{gc.code}</td>
                        <td className="px-3 py-2">₹{Number(gc.value).toFixed(0)}</td>
                        <td className="px-3 py-2">
                          <span className={gc.is_redeemed ? 'text-green-500' : 'text-yellow-500'}>
                            {gc.is_redeemed ? 'Redeemed' : 'Active'}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {!gc.is_redeemed && (
                            <ActionBtn onClick={() => handleDeleteGiftCard(gc.id)} label="Delete" color="text-primary" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Create Product */}
            <div className="space-y-3 pt-4 border-t border-border">
              <SectionHeader title="Create Product for Purchase" />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Product Name" value={newProductName} onChange={(e) => setNewProductName(e.target.value)} className="h-9 text-sm" />
                <Input placeholder="Brand (Amazon, Flipkart)" value={newProductBrand} onChange={(e) => setNewProductBrand(e.target.value)} className="h-9 text-sm" />
                <Input type="number" placeholder="Denomination (₹)" value={newProductDenomination} onChange={(e) => setNewProductDenomination(e.target.value)} className="h-9 text-sm" />
                <Input type="number" placeholder="Price (₹)" value={newProductPrice} onChange={(e) => setNewProductPrice(e.target.value)} className="h-9 text-sm" />
              </div>
              <button 
                onClick={handleCreateProduct} 
                disabled={actionLoading}
                className="px-4 py-2 bg-primary text-primary-foreground text-xs font-medium rounded-md hover:opacity-90 disabled:opacity-50"
              >
                Create Product
              </button>
            </div>

            {/* Products */}
            <div className="space-y-3">
              <SectionHeader title="Products" count={giftCardProducts.length} />
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr className="text-left text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">Brand</th>
                      <th className="px-3 py-2 font-medium">Value</th>
                      <th className="px-3 py-2 font-medium">Price</th>
                      <th className="px-3 py-2 font-medium">Toggle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {giftCardProducts.map(p => (
                      <tr key={p.id} className="hover:bg-muted/30">
                        <td className="px-3 py-2">{p.name}</td>
                        <td className="px-3 py-2">{p.brand}</td>
                        <td className="px-3 py-2">₹{Number(p.denomination).toFixed(0)}</td>
                        <td className="px-3 py-2">₹{Number(p.price).toFixed(0)}</td>
                        <td className="px-3 py-2">
                          <ActionBtn 
                            onClick={() => handleToggleProductStatus(p.id, p.is_active)} 
                            label={p.is_active ? 'Deactivate' : 'Activate'}
                            color={p.is_active ? 'text-green-500' : 'text-muted-foreground'}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Purchase Requests */}
            <div className="space-y-3 pt-4 border-t border-border">
              <SectionHeader title="Purchase Requests" count={giftCardPurchases.length} />
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr className="text-left text-muted-foreground">
                      <th className="px-3 py-2 font-medium">User</th>
                      <th className="px-3 py-2 font-medium">Product</th>
                      <th className="px-3 py-2 font-medium">Paid</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {giftCardPurchases.map(p => (
                      <tr key={p.id} className="hover:bg-muted/30">
                        <td className="px-3 py-2 font-mono">{p.user_id.slice(0, 8)}</td>
                        <td className="px-3 py-2">{p.product?.name || '-'}</td>
                        <td className="px-3 py-2">₹{Number(p.amount_paid).toFixed(0)}</td>
                        <td className="px-3 py-2">
                          <span className={p.status === 'completed' ? 'text-green-500' : p.status === 'processing' ? 'text-yellow-500' : 'text-muted-foreground'}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {p.status === 'pending' && (
                            <div className="flex gap-2">
                              <ActionBtn onClick={() => handleUpdatePurchaseStatus(p.id, 'processing')} label="Process" color="text-yellow-500" />
                              <ActionBtn onClick={() => handleUpdatePurchaseStatus(p.id, 'completed', 'CODE_' + Date.now())} label="Complete" color="text-green-500" />
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
            <SectionHeader title="Role Management" />
            <div className="flex gap-2 flex-wrap">
              <select 
                value={selectedUserId} 
                onChange={(e) => setSelectedUserId(e.target.value)} 
                className="flex-1 min-w-[140px] h-9 text-xs bg-background border border-border rounded-md px-2"
              >
                <option value="">Select User</option>
                {userProfiles.map(p => (
                  <option key={p.user_id} value={p.user_id}>{p.user_id.slice(0, 16)}...</option>
                ))}
              </select>
              <select 
                value={selectedRole} 
                onChange={(e) => setSelectedRole(e.target.value)} 
                className="h-9 text-xs bg-background border border-border rounded-md px-2"
              >
                <option value="">Role</option>
                <option value="admin">Admin</option>
                <option value="moderator">Moderator</option>
                <option value="user">User</option>
              </select>
              <button 
                onClick={handleAssignRole} 
                disabled={actionLoading}
                className="px-4 h-9 bg-primary text-primary-foreground text-xs font-medium rounded-md hover:opacity-90 disabled:opacity-50"
              >
                Assign
              </button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr className="text-left text-muted-foreground">
                    <th className="px-3 py-2 font-medium">User</th>
                    <th className="px-3 py-2 font-medium">Role</th>
                    <th className="px-3 py-2 font-medium">Assigned</th>
                    <th className="px-3 py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {userRoles.map(r => (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2 font-mono">{r.user_id.slice(0, 8)}</td>
                      <td className="px-3 py-2">
                        <span className={r.role === 'admin' ? 'text-primary font-medium' : r.role === 'moderator' ? 'text-yellow-500' : 'text-muted-foreground'}>
                          {r.role}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                      <td className="px-3 py-2">
                        <ActionBtn onClick={() => handleRevokeRole(r.id)} label="Revoke" color="text-primary" />
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
          <div className="space-y-4">
            <SectionHeader title="Send Notification" count={userProfiles.length} />
            <p className="text-[10px] text-muted-foreground -mt-2">Broadcast to all {userProfiles.length} users</p>
            <Input 
              placeholder="Notification Title" 
              value={notificationTitle} 
              onChange={(e) => setNotificationTitle(e.target.value)} 
              className="h-9 text-sm"
            />
            <Textarea 
              placeholder="Enter your message here..." 
              value={notificationMessage} 
              onChange={(e) => setNotificationMessage(e.target.value)} 
              rows={4} 
              className="text-sm resize-none"
            />
            <button 
              onClick={handleSendNotification} 
              disabled={actionLoading || !notificationTitle.trim() || !notificationMessage.trim()}
              className="w-full py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 disabled:opacity-50"
            >
              {actionLoading ? 'Sending...' : 'Send to All Users'}
            </button>
          </div>
        )}

        {/* AdMob */}
        {activeTab === "admob" && (
          <div className="space-y-4">
            <SectionHeader title="AdMob Configuration" />
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wide">App ID *</label>
                <Input 
                  placeholder="ca-app-pub-xxxxxxxx~xxxxxxxxxx" 
                  value={admobAppId} 
                  onChange={(e) => setAdmobAppId(e.target.value)} 
                  className="h-9 text-sm font-mono mt-1"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Rewarded Ad Unit ID *</label>
                <Input 
                  placeholder="ca-app-pub-xxxxxxxx/xxxxxxxxxx" 
                  value={admobRewardedAdUnitId} 
                  onChange={(e) => setAdmobRewardedAdUnitId(e.target.value)} 
                  className="h-9 text-sm font-mono mt-1"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Banner Ad Unit ID</label>
                <Input 
                  placeholder="ca-app-pub-xxxxxxxx/xxxxxxxxxx" 
                  value={admobBannerAdUnitId} 
                  onChange={(e) => setAdmobBannerAdUnitId(e.target.value)} 
                  className="h-9 text-sm font-mono mt-1"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Interstitial Ad Unit ID</label>
                <Input 
                  placeholder="ca-app-pub-xxxxxxxx/xxxxxxxxxx" 
                  value={admobInterstitialAdUnitId} 
                  onChange={(e) => setAdmobInterstitialAdUnitId(e.target.value)} 
                  className="h-9 text-sm font-mono mt-1"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="test-mode" 
                  checked={admobIsTesting} 
                  onChange={(e) => setAdmobIsTesting(e.target.checked)}
                  className="w-4 h-4 rounded border-border"
                />
                <label htmlFor="test-mode" className="text-sm text-foreground">Enable Test Mode</label>
              </div>
            </div>
            <button 
              onClick={handleSaveAdmobConfig} 
              disabled={actionLoading}
              className="w-full py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 disabled:opacity-50"
            >
              {actionLoading ? 'Saving...' : 'Save AdMob Configuration'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
