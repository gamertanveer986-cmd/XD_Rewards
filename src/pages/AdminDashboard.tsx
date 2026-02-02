import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
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
}

interface GiftCard {
  id: string;
  code: string;
  value: number;
  is_redeemed: boolean;
  redeemed_by: string | null;
  redeemed_at: string | null;
  created_at: string;
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
  email: string | null;
  product?: GiftCardProduct;
}

type TabType = "overview" | "users" | "leaderboard" | "transactions" | "payments" | "daily" | "giftcards" | "roles" | "notifications" | "admob" | "support";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null); // null = checking, false = denied, true = granted
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [txFilter, setTxFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedPayments, setSelectedPayments] = useState<Set<string>>(new Set());

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
  const [purchaseEmailFilter, setPurchaseEmailFilter] = useState("");

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalEarnings: 0,
    totalWithdrawals: 0,
    totalAdsWatched: 0,
    pendingPayments: 0,
    totalPayable: 0
  });

  useEffect(() => {
    let isMounted = true;

    const checkAdminAccess = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          if (isMounted) {
            setIsAdmin(false);
            setLoading(false);
          }
          return;
        }

        const { data: roleData, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (!isMounted) return;

        if (error || !roleData) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        setIsAdmin(true);
        // Load data only after admin access is confirmed
        await loadAllDataInternal();
        if (isMounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error("Error checking admin access:", error);
        if (isMounted) {
          setIsAdmin(false);
          setLoading(false);
        }
      }
    };

    checkAdminAccess();

    return () => {
      isMounted = false;
    };
  }, []);

  const loadAllDataInternal = async () => {
    await Promise.all([loadData(), loadAdmobConfig(), loadDailyRewards(), loadGiftCardsData()]);
  };

  const loadAllData = async () => {
    setLoading(true);
    await loadAllDataInternal();
    setLoading(false);
  };

  const loadData = async () => {
    const { data: profilesData } = await supabase.from("user_profiles").select("*").order("created_at", { ascending: false });
    setUserProfiles(profilesData || []);

    const { data: rolesData } = await supabase.from("user_roles").select("*").order("created_at", { ascending: false });
    setUserRoles(rolesData || []);

    const { data: txData } = await supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(200);
    setTransactions(txData || []);

    const totalEarnings = profilesData?.reduce((sum, p) => sum + Number(p.total_earnings), 0) || 0;
    const totalWithdrawals = txData?.filter(t => t.transaction_type === 'withdrawal').reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0) || 0;
    const totalAdsWatched = profilesData?.reduce((sum, p) => sum + p.ads_watched, 0) || 0;
    const pendingPayments = profilesData?.filter(p => p.payment_status === 'pending' && Number(p.withdrawable_balance) >= 50).length || 0;
    const totalPayable = profilesData?.filter(p => Number(p.withdrawable_balance) >= 50).reduce((sum, p) => sum + Number(p.withdrawable_balance), 0) || 0;

    setStats({ totalUsers: profilesData?.length || 0, totalEarnings, totalWithdrawals, totalAdsWatched, pendingPayments, totalPayable });
  };

  const loadAdmobConfig = async () => {
    const { data } = await supabase.from("admob_config").select("*").limit(1).maybeSingle();
    if (data) {
      setAdmobAppId(data.app_id || "");
      setAdmobRewardedAdUnitId(data.rewarded_ad_unit_id || "");
      setAdmobBannerAdUnitId(data.banner_ad_unit_id || "");
      setAdmobInterstitialAdUnitId(data.interstitial_ad_unit_id || "");
      setAdmobIsTesting(data.is_testing || false);
    }
  };

  const loadDailyRewards = async () => {
    const { data } = await supabase.from("daily_rewards").select("*").order("total_claimed", { ascending: false });
    setDailyRewards(data || []);
  };

  const loadGiftCardsData = async () => {
    const [cardsRes, productsRes, purchasesRes] = await Promise.all([
      supabase.from("gift_cards").select("*").order("created_at", { ascending: false }),
      supabase.from("gift_card_products").select("*").order("brand", { ascending: true }),
      supabase.from("gift_card_purchases").select("*, product:gift_card_products(*)").order("created_at", { ascending: false })
    ]);
    if (cardsRes.data) setGiftCards(cardsRes.data);
    if (productsRes.data) setGiftCardProducts(productsRes.data);
    if (purchasesRes.data) setGiftCardPurchases(purchasesRes.data);
  };

  const handleSendNotification = async () => {
    if (!notificationTitle.trim() || !notificationMessage.trim()) {
      toast.error("Enter title and message");
      return;
    }
    setActionLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: notification, error } = await supabase.from("notifications").insert({ title: notificationTitle, message: notificationMessage, sent_by: user?.id }).select().single();
    if (error) {
      toast.error("Failed to send");
      setActionLoading(false);
      return;
    }
    const userNotifications = userProfiles.map(profile => ({ user_id: profile.user_id, notification_id: notification.id }));
    await supabase.from("user_notifications").insert(userNotifications);
    toast.success(`Sent to ${userProfiles.length} users`);
    setNotificationTitle("");
    setNotificationMessage("");
    setActionLoading(false);
  };

  const handleSaveAdmobConfig = async () => {
    if (!admobAppId.trim() || !admobRewardedAdUnitId.trim()) {
      toast.error("App ID and Rewarded Unit ID required");
      return;
    }
    setActionLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: existing } = await supabase.from("admob_config").select("id").limit(1).maybeSingle();
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
    setActionLoading(false);
  };

  const handleUpdatePaymentStatus = async (userId: string, status: string) => {
    setActionLoading(true);
    await supabase.from("user_profiles").update({ payment_status: status }).eq("user_id", userId);
    toast.success(`Status updated: ${status}`);
    await loadData();
    setActionLoading(false);
  };

  const handleBulkPaymentStatus = async (status: string) => {
    if (selectedPayments.size === 0) {
      toast.error("No users selected");
      return;
    }
    setActionLoading(true);
    const userIds = Array.from(selectedPayments);
    const { error } = await supabase.from("user_profiles").update({ payment_status: status }).in("user_id", userIds);
    if (error) {
      toast.error("Failed to update some records");
    } else {
      toast.success(`${userIds.length} users marked as ${status}`);
    }
    setSelectedPayments(new Set());
    await loadData();
    setActionLoading(false);
  };

  const togglePaymentSelection = (userId: string) => {
    setSelectedPayments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const toggleAllPayments = (userIds: string[]) => {
    setSelectedPayments(prev => {
      if (prev.size === userIds.length) {
        return new Set();
      }
      return new Set(userIds);
    });
  };

  const handleAssignRole = async () => {
    if (!selectedUserId || !selectedRole) {
      toast.error("Select user and role");
      return;
    }
    setActionLoading(true);
    const { error } = await supabase.from("user_roles").insert({ user_id: selectedUserId, role: selectedRole as "admin" | "moderator" | "user" });
    if (error?.code === "23505") {
      toast.error("User already has this role");
    } else if (error) {
      toast.error("Failed to assign role");
    } else {
      toast.success("Role assigned");
      setSelectedUserId("");
      setSelectedRole("");
      await loadData();
    }
    setActionLoading(false);
  };

  const handleRevokeRole = async (roleId: string) => {
    setActionLoading(true);
    await supabase.from("user_roles").delete().eq("id", roleId);
    toast.success("Role revoked");
    await loadData();
    setActionLoading(false);
  };

  const handleCreateGiftCard = async () => {
    if (!newGiftCardCode.trim() || !newGiftCardValue) {
      toast.error("Enter code and value");
      return;
    }
    setActionLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("gift_cards").insert({ code: newGiftCardCode.toUpperCase(), value: parseFloat(newGiftCardValue), created_by: user?.id });
    if (error?.code === "23505") {
      toast.error("Code already exists");
    } else if (error) {
      toast.error("Failed to create");
    } else {
      toast.success("Gift card created");
      setNewGiftCardCode("");
      setNewGiftCardValue("");
      await loadGiftCardsData();
    }
    setActionLoading(false);
  };

  const handleDeleteGiftCard = async (id: string) => {
    await supabase.from("gift_cards").delete().eq("id", id);
    toast.success("Deleted");
    await loadGiftCardsData();
  };

  const handleCreateProduct = async () => {
    if (!newProductName.trim() || !newProductBrand.trim() || !newProductDenomination || !newProductPrice) {
      toast.error("Fill all fields");
      return;
    }
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
    setActionLoading(false);
  };

  const handleToggleProductStatus = async (id: string, currentStatus: boolean) => {
    await supabase.from("gift_card_products").update({ is_active: !currentStatus }).eq("id", id);
    toast.success(!currentStatus ? "Activated" : "Deactivated");
    await loadGiftCardsData();
  };

  const handleUpdatePurchaseStatus = async (id: string, status: string, code?: string) => {
    const updateData: { status: string; processed_at: string; redemption_code?: string } = { status, processed_at: new Date().toISOString() };
    if (code) updateData.redemption_code = code;
    await supabase.from("gift_card_purchases").update(updateData).eq("id", id);
    toast.success(`Status: ${status}`);
    await loadGiftCardsData();
  };

  const filteredProfiles = userProfiles.filter(p =>
    p.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.upi_id && p.upi_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.display_name && p.display_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredTransactions = transactions.filter(tx => {
    if (txFilter === "all") return true;
    return tx.transaction_type === txFilter;
  });

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
    { key: "support", label: "Support" },
    { key: "admob", label: "AdMob" }
  ];

  // Show loading state while checking access
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Show access denied if not admin
  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔒</span>
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-sm text-muted-foreground mb-6">
            You do not have administrator privileges to access this panel.
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background border-b border-border">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm font-semibold">DXRewards Admin</span>
          <div className="flex items-center gap-3">
            <button onClick={loadAllData} className="text-xs text-muted-foreground hover:text-foreground">Refresh</button>
            <button onClick={() => navigate("/dashboard")} className="text-xs text-primary">Exit</button>
          </div>
        </div>
        {/* Tab Navigation */}
        <div className="overflow-x-auto px-3 pb-2">
          <div className="flex gap-4 min-w-max">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`text-xs py-1 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? "border-primary text-primary font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 pb-20 max-w-3xl mx-auto">

        {/* Overview */}
        {activeTab === "overview" && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase">Dashboard Stats</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <StatBox label="Users" value={stats.totalUsers} />
              <StatBox label="Earnings (value)" value={stats.totalEarnings.toFixed(0)} highlight />
              <StatBox label="Tasks Done" value={stats.totalAdsWatched} />
              <StatBox label="Pending" value={stats.pendingPayments} />
              <StatBox label="Payable (value)" value={stats.totalPayable.toFixed(0)} highlight />
              <StatBox label="Withdrawals (value)" value={stats.totalWithdrawals.toFixed(0)} />
            </div>
          </div>
        )}

        {/* Users */}
        {activeTab === "users" && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase">Users ({userProfiles.length})</p>
            <Input placeholder="Search user ID, UPI, name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-8 text-xs" />
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-2 font-medium">User</th>
                    <th className="py-2 pr-2 font-medium">UPI</th>
                    <th className="py-2 pr-2 font-medium">Earnings</th>
                    <th className="py-2 pr-2 font-medium">Balance</th>
                    <th className="py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProfiles.slice(0, 50).map(p => (
                    <tr key={p.id} className="border-b border-border/50">
                      <td className="py-2 pr-2 font-mono">{p.user_id.slice(0, 8)}</td>
                      <td className="py-2 pr-2 text-primary">{p.upi_id || "-"}</td>
                      <td className="py-2 pr-2">{Number(p.total_earnings).toFixed(2)} val</td>
                      <td className="py-2 pr-2">{Number(p.withdrawable_balance).toFixed(2)} val</td>
                      <td className="py-2">{p.payment_status || "pending"}</td>
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
            <p className="text-xs font-medium text-muted-foreground uppercase">Top 20 Users</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-2 font-medium w-8">#</th>
                    <th className="py-2 pr-2 font-medium">User</th>
                    <th className="py-2 pr-2 font-medium">Earnings</th>
                    <th className="py-2 pr-2 font-medium">Refs</th>
                    <th className="py-2 font-medium">Ads</th>
                  </tr>
                </thead>
                <tbody>
                  {[...userProfiles]
                    .sort((a, b) => Number(b.total_earnings) - Number(a.total_earnings))
                    .slice(0, 20)
                    .map((p, i) => (
                      <tr key={p.id} className="border-b border-border/50">
                        <td className="py-2 pr-2 font-bold text-primary">{i + 1}</td>
                        <td className="py-2 pr-2 font-mono">{p.user_id.slice(0, 8)}</td>
                        <td className="py-2 pr-2">{Number(p.total_earnings).toFixed(2)} val</td>
                        <td className="py-2 pr-2">{p.referrals_count}</td>
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
            <p className="text-xs font-medium text-muted-foreground uppercase">Transactions ({filteredTransactions.length})</p>
            <div className="flex gap-2 flex-wrap">
              {["all", "earning", "bonus", "referral", "daily_reward", "withdrawal", "gift_card"].map(f => (
                <button
                  key={f}
                  onClick={() => setTxFilter(f)}
                  className={`text-xs px-2 py-1 rounded ${txFilter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  {f === "all" ? "All" : f.replace("_", " ")}
                </button>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-2 font-medium">User</th>
                    <th className="py-2 pr-2 font-medium">Type</th>
                    <th className="py-2 pr-2 font-medium">Amount</th>
                    <th className="py-2 pr-2 font-medium">Description</th>
                    <th className="py-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.slice(0, 100).map(tx => (
                    <tr key={tx.id} className="border-b border-border/50">
                      <td className="py-2 pr-2 font-mono">{tx.user_id.slice(0, 8)}</td>
                      <td className="py-2 pr-2">{tx.transaction_type}</td>
                      <td className="py-2 pr-2">{Math.abs(Number(tx.amount)).toFixed(2)} val</td>
                      <td className="py-2 pr-2 max-w-[100px] truncate">{tx.description || "-"}</td>
                      <td className="py-2 text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payments */}
        {activeTab === "payments" && (() => {
          const eligibleUsers = userProfiles.filter(p => Number(p.withdrawable_balance) >= 50);
          const eligibleUserIds = eligibleUsers.map(p => p.user_id);
          return (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase">Withdrawal Requests (Balance ≥ 50 value)</p>
              <div className="grid grid-cols-3 gap-2">
                <StatBox label="Pending" value={stats.pendingPayments} />
                <StatBox label="Payable (val)" value={stats.totalPayable.toFixed(0)} highlight />
                <StatBox label="Total Earnings (val)" value={stats.totalEarnings.toFixed(0)} />
              </div>
              {/* Bulk Actions */}
              {selectedPayments.size > 0 && (
                <div className="flex items-center gap-3 p-2 bg-muted rounded text-xs">
                  <span className="text-muted-foreground">{selectedPayments.size} selected</span>
                  <button onClick={() => handleBulkPaymentStatus("processing")} className="text-yellow-500 hover:underline" disabled={actionLoading}>Mark Processing</button>
                  <button onClick={() => handleBulkPaymentStatus("paid")} className="text-green-500 hover:underline" disabled={actionLoading}>Mark Paid</button>
                  <button onClick={() => setSelectedPayments(new Set())} className="text-muted-foreground hover:underline">Clear</button>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-2 pr-2 font-medium w-8">
                        <input
                          type="checkbox"
                          checked={eligibleUsers.length > 0 && selectedPayments.size === eligibleUsers.length}
                          onChange={() => toggleAllPayments(eligibleUserIds)}
                          className="h-3 w-3"
                        />
                      </th>
                      <th className="py-2 pr-2 font-medium">User</th>
                      <th className="py-2 pr-2 font-medium">UPI</th>
                      <th className="py-2 pr-2 font-medium">Amount</th>
                      <th className="py-2 pr-2 font-medium">Status</th>
                      <th className="py-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eligibleUsers.map(p => (
                      <tr key={p.id} className={`border-b border-border/50 ${selectedPayments.has(p.user_id) ? "bg-muted/50" : ""}`}>
                        <td className="py-2 pr-2">
                          <input
                            type="checkbox"
                            checked={selectedPayments.has(p.user_id)}
                            onChange={() => togglePaymentSelection(p.user_id)}
                            className="h-3 w-3"
                          />
                        </td>
                        <td className="py-2 pr-2 font-mono">{p.user_id.slice(0, 8)}</td>
                        <td className="py-2 pr-2 text-primary">{p.upi_id || "-"}</td>
                        <td className="py-2 pr-2">{Number(p.withdrawable_balance).toFixed(2)} val</td>
                        <td className="py-2 pr-2">{p.payment_status || "pending"}</td>
                        <td className="py-2">
                          <span className="flex gap-2">
                            <button onClick={() => handleUpdatePaymentStatus(p.user_id, "processing")} className="text-xs text-yellow-500 hover:underline" disabled={actionLoading}>Process</button>
                            <button onClick={() => handleUpdatePaymentStatus(p.user_id, "paid")} className="text-xs text-green-500 hover:underline" disabled={actionLoading}>Paid</button>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* Daily Rewards */}
        {activeTab === "daily" && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase">Daily Rewards ({dailyRewards.length})</p>
            <div className="grid grid-cols-3 gap-2">
              <StatBox label="Claimers" value={dailyRewards.length} />
              <StatBox label="Total Given (val)" value={dailyRewards.reduce((s, d) => s + Number(d.total_claimed), 0).toFixed(0)} highlight />
              <StatBox label="7-Day Streaks" value={dailyRewards.filter(d => d.current_streak >= 7).length} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-2 font-medium">User</th>
                    <th className="py-2 pr-2 font-medium">Streak</th>
                    <th className="py-2 pr-2 font-medium">Last Claim</th>
                    <th className="py-2 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyRewards.map(d => (
                    <tr key={d.id} className="border-b border-border/50">
                      <td className="py-2 pr-2 font-mono">{d.user_id.slice(0, 8)}</td>
                      <td className="py-2 pr-2">Day {d.current_streak}</td>
                      <td className="py-2 pr-2 text-muted-foreground">{d.last_claim_date || "-"}</td>
                      <td className="py-2">{Number(d.total_claimed).toFixed(2)} val</td>
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
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase">Create Gift Card Code</p>
              <div className="flex gap-2">
                <Input placeholder="CODE" value={newGiftCardCode} onChange={(e) => setNewGiftCardCode(e.target.value.toUpperCase())} className="h-8 text-xs flex-1 font-mono" />
                <Input type="number" placeholder="Value" value={newGiftCardValue} onChange={(e) => setNewGiftCardValue(e.target.value)} className="h-8 text-xs w-20" />
                <button onClick={handleCreateGiftCard} disabled={actionLoading} className="px-3 h-8 bg-primary text-primary-foreground text-xs rounded">Add</button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase">Codes ({giftCards.length})</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-2 pr-2 font-medium">Code</th>
                      <th className="py-2 pr-2 font-medium">Value</th>
                      <th className="py-2 pr-2 font-medium">Status</th>
                      <th className="py-2 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {giftCards.map(gc => (
                      <tr key={gc.id} className="border-b border-border/50">
                        <td className="py-2 pr-2 font-mono">{gc.code}</td>
                        <td className="py-2 pr-2">{Number(gc.value).toFixed(0)} val</td>
                        <td className="py-2 pr-2">{gc.is_redeemed ? "Redeemed" : "Active"}</td>
                        <td className="py-2">{!gc.is_redeemed && <button onClick={() => handleDeleteGiftCard(gc.id)} className="text-xs text-primary hover:underline">Delete</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase">Create Product</p>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Product Name" value={newProductName} onChange={(e) => setNewProductName(e.target.value)} className="h-8 text-xs" />
                <Input placeholder="Brand" value={newProductBrand} onChange={(e) => setNewProductBrand(e.target.value)} className="h-8 text-xs" />
                <Input type="number" placeholder="Denomination (val)" value={newProductDenomination} onChange={(e) => setNewProductDenomination(e.target.value)} className="h-8 text-xs" />
                <Input type="number" placeholder="Price (val)" value={newProductPrice} onChange={(e) => setNewProductPrice(e.target.value)} className="h-8 text-xs" />
              </div>
              <button onClick={handleCreateProduct} disabled={actionLoading} className="px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded">Create</button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase">Products ({giftCardProducts.length})</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-2 pr-2 font-medium">Name</th>
                      <th className="py-2 pr-2 font-medium">Brand</th>
                      <th className="py-2 pr-2 font-medium">Value</th>
                      <th className="py-2 pr-2 font-medium">Price</th>
                      <th className="py-2 font-medium">Toggle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {giftCardProducts.map(p => (
                      <tr key={p.id} className="border-b border-border/50">
                        <td className="py-2 pr-2">{p.name}</td>
                        <td className="py-2 pr-2">{p.brand}</td>
                        <td className="py-2 pr-2">{Number(p.denomination).toFixed(0)} val</td>
                        <td className="py-2 pr-2">{Number(p.price).toFixed(0)} val</td>
                        <td className="py-2"><button onClick={() => handleToggleProductStatus(p.id, p.is_active)} className={`text-xs hover:underline ${p.is_active ? "text-green-500" : "text-muted-foreground"}`}>{p.is_active ? "Active" : "Inactive"}</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase">Purchase Requests ({giftCardPurchases.length})</p>
              <Input 
                placeholder="Search by email..." 
                value={purchaseEmailFilter} 
                onChange={(e) => setPurchaseEmailFilter(e.target.value)} 
                className="h-8 text-xs mb-2" 
              />
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-2 pr-2 font-medium">User</th>
                      <th className="py-2 pr-2 font-medium">Email</th>
                      <th className="py-2 pr-2 font-medium">Product</th>
                      <th className="py-2 pr-2 font-medium">Paid</th>
                      <th className="py-2 pr-2 font-medium">Status</th>
                      <th className="py-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {giftCardPurchases
                      .filter(p => !purchaseEmailFilter || (p.email && p.email.toLowerCase().includes(purchaseEmailFilter.toLowerCase())))
                      .sort((a, b) => {
                        // Sort pending first
                        if (a.status === "pending" && b.status !== "pending") return -1;
                        if (a.status !== "pending" && b.status === "pending") return 1;
                        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                      })
                      .map(p => {
                        const isEmailMissing = !p.email || !p.email.trim();
                        const isEmailInvalid = p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email);
                        const hasEmailIssue = isEmailMissing || isEmailInvalid;
                        
                        return (
                          <tr key={p.id} className={`border-b border-border/50 ${hasEmailIssue ? "bg-destructive/10" : ""}`}>
                            <td className="py-2 pr-2 font-mono">{p.user_id.slice(0, 8)}</td>
                            <td className={`py-2 pr-2 ${hasEmailIssue ? "text-destructive font-medium" : ""}`}>
                              {isEmailMissing ? (
                                <span className="text-destructive italic">Missing</span>
                              ) : isEmailInvalid ? (
                                <span className="text-destructive">{p.email} ⚠️</span>
                              ) : (
                                p.email
                              )}
                            </td>
                            <td className="py-2 pr-2">{p.product?.name || "-"}</td>
                            <td className="py-2 pr-2">{Number(p.amount_paid).toFixed(0)} val</td>
                            <td className="py-2 pr-2">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                p.status === "pending" ? "bg-warning/20 text-warning" :
                                p.status === "processing" ? "bg-blue-500/20 text-blue-500" :
                                p.status === "completed" ? "bg-success/20 text-success" :
                                p.status === "rejected" ? "bg-destructive/20 text-destructive" :
                                "bg-muted text-muted-foreground"
                              }`}>
                                {p.status}
                              </span>
                            </td>
                            <td className="py-2">
                              {p.status === "pending" && (
                                <span className="flex gap-2">
                                  <button onClick={() => handleUpdatePurchaseStatus(p.id, "processing")} className="text-xs text-yellow-500 hover:underline">Process</button>
                                  <button onClick={() => handleUpdatePurchaseStatus(p.id, "completed", "CODE_" + Date.now())} className="text-xs text-green-500 hover:underline">Complete</button>
                                  <button onClick={() => handleUpdatePurchaseStatus(p.id, "rejected")} className="text-xs text-destructive hover:underline">Reject</button>
                                </span>
                              )}
                              {p.status === "processing" && (
                                <span className="flex gap-2">
                                  <button onClick={() => handleUpdatePurchaseStatus(p.id, "completed", "CODE_" + Date.now())} className="text-xs text-green-500 hover:underline">Complete</button>
                                  <button onClick={() => handleUpdatePurchaseStatus(p.id, "rejected")} className="text-xs text-destructive hover:underline">Reject</button>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Roles */}
        {activeTab === "roles" && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase">Role Management</p>
            <div className="flex gap-2 flex-wrap">
              <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} className="flex-1 min-w-[120px] h-8 text-xs bg-background border border-border rounded px-2">
                <option value="">Select User</option>
                {userProfiles.map(p => (
                  <option key={p.user_id} value={p.user_id}>{p.user_id.slice(0, 16)}...</option>
                ))}
              </select>
              <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="h-8 text-xs bg-background border border-border rounded px-2">
                <option value="">Role</option>
                <option value="admin">Admin</option>
                <option value="moderator">Moderator</option>
                <option value="user">User</option>
              </select>
              <button onClick={handleAssignRole} disabled={actionLoading} className="px-3 h-8 bg-primary text-primary-foreground text-xs rounded">Assign</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-2 font-medium">User</th>
                    <th className="py-2 pr-2 font-medium">Role</th>
                    <th className="py-2 pr-2 font-medium">Assigned</th>
                    <th className="py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {userRoles.map(r => (
                    <tr key={r.id} className="border-b border-border/50">
                      <td className="py-2 pr-2 font-mono">{r.user_id.slice(0, 8)}</td>
                      <td className="py-2 pr-2">{r.role}</td>
                      <td className="py-2 pr-2 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                      <td className="py-2"><button onClick={() => handleRevokeRole(r.id)} className="text-xs text-primary hover:underline" disabled={actionLoading}>Revoke</button></td>
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
            <p className="text-xs font-medium text-muted-foreground uppercase">Send Notification to All Users ({userProfiles.length})</p>
            <Input placeholder="Title" value={notificationTitle} onChange={(e) => setNotificationTitle(e.target.value)} className="h-8 text-xs" />
            <Textarea placeholder="Message..." value={notificationMessage} onChange={(e) => setNotificationMessage(e.target.value)} rows={4} className="text-xs resize-none" />
            <button onClick={handleSendNotification} disabled={actionLoading || !notificationTitle.trim() || !notificationMessage.trim()} className="w-full py-2 bg-primary text-primary-foreground text-xs rounded disabled:opacity-50">
              {actionLoading ? "Sending..." : "Send to All"}
            </button>
          </div>
        )}

        {/* Support */}
        {activeTab === "support" && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase">Support Team Panel</p>
            <div className="grid grid-cols-2 gap-2">
              <StatBox label="Total Users" value={stats.totalUsers} />
              <StatBox label="Active Today" value={dailyRewards.filter(d => d.last_claim_date === new Date().toISOString().split('T')[0]).length} />
            </div>
            <div className="border border-border rounded p-3 space-y-2">
              <p className="text-xs font-medium">Quick Actions</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setActiveTab("users")} className="text-xs text-primary hover:underline">View Users</button>
                <button onClick={() => setActiveTab("transactions")} className="text-xs text-primary hover:underline">Check Transactions</button>
                <button onClick={() => setActiveTab("payments")} className="text-xs text-primary hover:underline">Process Payments</button>
                <button onClick={() => setActiveTab("notifications")} className="text-xs text-primary hover:underline">Send Notification</button>
              </div>
            </div>
            <div className="border border-border rounded p-3 space-y-2">
              <p className="text-xs font-medium">Recent Activity</p>
              <div className="space-y-1">
                {transactions.slice(0, 5).map(tx => (
                  <p key={tx.id} className="text-xs text-muted-foreground">
                    {tx.user_id.slice(0, 8)} - {tx.transaction_type} - {Math.abs(Number(tx.amount)).toFixed(2)} val
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* AdMob */}
        {activeTab === "admob" && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase">AdMob Configuration</p>
            <div className="space-y-2">
              <div>
                <label className="text-[10px] text-muted-foreground uppercase">App ID *</label>
                <Input placeholder="ca-app-pub-xxxxxxxx~xxxxxxxxxx" value={admobAppId} onChange={(e) => setAdmobAppId(e.target.value)} className="h-8 text-xs font-mono mt-1" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase">Rewarded Ad Unit ID *</label>
                <Input placeholder="ca-app-pub-xxxxxxxx/xxxxxxxxxx" value={admobRewardedAdUnitId} onChange={(e) => setAdmobRewardedAdUnitId(e.target.value)} className="h-8 text-xs font-mono mt-1" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase">Banner Ad Unit ID</label>
                <Input placeholder="ca-app-pub-xxxxxxxx/xxxxxxxxxx" value={admobBannerAdUnitId} onChange={(e) => setAdmobBannerAdUnitId(e.target.value)} className="h-8 text-xs font-mono mt-1" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase">Interstitial Ad Unit ID</label>
                <Input placeholder="ca-app-pub-xxxxxxxx/xxxxxxxxxx" value={admobInterstitialAdUnitId} onChange={(e) => setAdmobInterstitialAdUnitId(e.target.value)} className="h-8 text-xs font-mono mt-1" />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" id="test-mode" checked={admobIsTesting} onChange={(e) => setAdmobIsTesting(e.target.checked)} className="w-4 h-4 rounded border-border" />
                <label htmlFor="test-mode" className="text-xs">Enable Test Mode</label>
              </div>
            </div>
            <button onClick={handleSaveAdmobConfig} disabled={actionLoading} className="w-full py-2 bg-primary text-primary-foreground text-xs rounded disabled:opacity-50">
              {actionLoading ? "Saving..." : "Save Configuration"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const StatBox = ({ label, value, highlight = false }: { label: string; value: string | number; highlight?: boolean }) => (
  <div className="border border-border rounded p-2">
    <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
    <p className={`text-sm font-semibold ${highlight ? "text-primary" : "text-foreground"}`}>{value}</p>
  </div>
);

export default AdminDashboard;
