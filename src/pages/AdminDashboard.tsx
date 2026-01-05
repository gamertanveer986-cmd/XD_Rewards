import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Shield, Users, UserCheck, Loader2, ArrowLeft, CreditCard, Trash2, Search, DollarSign, Activity, Bell, Send, CheckCircle, Clock, Smartphone, Save, Gift } from "lucide-react";

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

interface AuthUser {
  id: string;
  email: string;
  created_at: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authUsers, setAuthUsers] = useState<AuthUser[]>([]);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [searchEmail, setSearchEmail] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Notification state
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [sendingNotification, setSendingNotification] = useState(false);

  // AdMob config state
  const [admobAppId, setAdmobAppId] = useState("");
  const [admobRewardedAdUnitId, setAdmobRewardedAdUnitId] = useState("");
  const [admobBannerAdUnitId, setAdmobBannerAdUnitId] = useState("");
  const [admobInterstitialAdUnitId, setAdmobInterstitialAdUnitId] = useState("");
  const [admobIsTesting, setAdmobIsTesting] = useState(false);
  const [savingAdmob, setSavingAdmob] = useState(false);

  // Daily rewards state
  const [dailyRewards, setDailyRewards] = useState<DailyReward[]>([]);

  // Stats
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

      await loadData();
      await loadAdmobConfig();
      await loadDailyRewards();
    } catch (error) {
      console.error("Error checking admin access:", error);
      navigate("/admin/login");
    }
  };

  const loadAdmobConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("admob_config")
        .select("*")
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;

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
      const { data, error } = await supabase
        .from("daily_rewards")
        .select("*")
        .order("total_claimed", { ascending: false });

      if (error) throw error;
      setDailyRewards(data || []);
    } catch (error) {
      console.error("Error loading daily rewards:", error);
    }
  };

  const handleSaveAdmobConfig = async () => {
    if (!admobAppId.trim() || !admobRewardedAdUnitId.trim()) {
      toast.error("App ID and Rewarded Ad Unit ID are required");
      return;
    }

    try {
      setSavingAdmob(true);
      const { data: { user } } = await supabase.auth.getUser();

      // Check if config exists
      const { data: existing } = await supabase
        .from("admob_config")
        .select("id")
        .limit(1)
        .single();

      if (existing) {
        // Update existing config
        const { error } = await supabase
          .from("admob_config")
          .update({
            app_id: admobAppId,
            rewarded_ad_unit_id: admobRewardedAdUnitId,
            banner_ad_unit_id: admobBannerAdUnitId || null,
            interstitial_ad_unit_id: admobInterstitialAdUnitId || null,
            is_testing: admobIsTesting,
            updated_at: new Date().toISOString(),
            updated_by: user?.id
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Insert new config
        const { error } = await supabase
          .from("admob_config")
          .insert({
            app_id: admobAppId,
            rewarded_ad_unit_id: admobRewardedAdUnitId,
            banner_ad_unit_id: admobBannerAdUnitId || null,
            interstitial_ad_unit_id: admobInterstitialAdUnitId || null,
            is_testing: admobIsTesting,
            updated_by: user?.id
          });

        if (error) throw error;
      }

      toast.success("AdMob configuration saved successfully");
    } catch (error) {
      console.error("Error saving AdMob config:", error);
      toast.error("Failed to save AdMob configuration");
    } finally {
      setSavingAdmob(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);

      // Fetch all user profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("user_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;
      setUserProfiles(profilesData || []);

      // Fetch all user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("*")
        .order("created_at", { ascending: false });

      if (rolesError) throw rolesError;
      setUserRoles(rolesData || []);

      // Fetch all transactions
      const { data: txData, error: txError } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (txError) throw txError;
      setTransactions(txData || []);

      // Calculate stats
      const totalEarnings = profilesData?.reduce((sum, p) => sum + Number(p.total_earnings), 0) || 0;
      const totalWithdrawals = txData?.filter(t => t.transaction_type === 'withdrawal').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const totalAdsWatched = profilesData?.reduce((sum, p) => sum + p.ads_watched, 0) || 0;
      const pendingPayments = profilesData?.filter(p => (p as any).payment_status === 'pending' && Number(p.withdrawable_balance) >= 50).length || 0;
      const totalPayable = profilesData?.filter(p => Number(p.withdrawable_balance) >= 50).reduce((sum, p) => sum + Number(p.withdrawable_balance), 0) || 0;

      setStats({
        totalUsers: profilesData?.length || 0,
        totalEarnings,
        totalWithdrawals,
        totalAdsWatched,
        pendingPayments,
        totalPayable
      });

      // Create user list from profiles
      const users = profilesData?.map(p => ({
        id: p.user_id,
        email: `User ${p.user_id.slice(0, 8)}...`,
        created_at: p.created_at
      })) || [];
      
      setAuthUsers(users);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRole = async () => {
    if (!selectedUserId || !selectedRole) {
      toast.error("Please select both user and role");
      return;
    }

    try {
      setActionLoading(true);
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: selectedUserId, role: selectedRole as any });

      if (error) throw error;

      toast.success("Role assigned successfully");
      setSelectedUserId("");
      setSelectedRole("");
      await loadData();
    } catch (error: any) {
      console.error("Error assigning role:", error);
      if (error.code === "23505") {
        toast.error("User already has this role");
      } else {
        toast.error("Failed to assign role");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignRoleByEmail = async () => {
    if (!newUserEmail || !selectedRole) {
      toast.error("Please enter email and select role");
      return;
    }

    try {
      setActionLoading(true);
      
      // Note: In production, you'd need an edge function to look up user by email
      toast.info("Use user ID from profiles to assign roles");
      
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to assign role");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeRole = async (roleId: string) => {
    try {
      setActionLoading(true);
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", roleId);

      if (error) throw error;

      toast.success("Role revoked successfully");
      await loadData();
    } catch (error) {
      console.error("Error revoking role:", error);
      toast.error("Failed to revoke role");
    } finally {
      setActionLoading(false);
    }
  };

  const getUserEmail = (userId: string) => {
    return `${userId.slice(0, 8)}...`;
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "moderator":
        return "default";
      default:
        return "secondary";
    }
  };

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case "withdrawal":
        return "destructive";
      case "bonus":
        return "default";
      case "ad_earning":
        return "secondary";
      case "referral":
        return "outline";
      default:
        return "secondary";
    }
  };

  const filteredProfiles = userProfiles.filter(p => 
    p.user_id.toLowerCase().includes(searchEmail.toLowerCase())
  );

  // Send notification to all users
  const handleSendNotification = async () => {
    if (!notificationTitle.trim() || !notificationMessage.trim()) {
      toast.error("Please enter title and message");
      return;
    }

    try {
      setSendingNotification(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create notification
      const { data: notification, error: notifError } = await supabase
        .from("notifications")
        .insert({
          title: notificationTitle,
          message: notificationMessage,
          sent_by: user?.id
        })
        .select()
        .single();

      if (notifError) throw notifError;

      // Create user_notifications for all users
      const userNotifications = userProfiles.map(profile => ({
        user_id: profile.user_id,
        notification_id: notification.id
      }));

      const { error: userNotifError } = await supabase
        .from("user_notifications")
        .insert(userNotifications);

      if (userNotifError) throw userNotifError;

      toast.success(`Notification sent to ${userProfiles.length} users`);
      setNotificationTitle("");
      setNotificationMessage("");
    } catch (error) {
      console.error("Error sending notification:", error);
      toast.error("Failed to send notification");
    } finally {
      setSendingNotification(false);
    }
  };

  // Update payment status
  const handleUpdatePaymentStatus = async (userId: string, status: string) => {
    try {
      setActionLoading(true);
      const { error } = await supabase
        .from("user_profiles")
        .update({ payment_status: status })
        .eq("user_id", userId);

      if (error) throw error;

      toast.success(`Payment status updated to ${status}`);
      await loadData();
    } catch (error) {
      console.error("Error updating payment status:", error);
      toast.error("Failed to update payment status");
    } finally {
      setActionLoading(false);
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return "default";
      case "processing":
        return "secondary";
      default:
        return "destructive";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-gradient-red">Admin Dashboard</h1>
              <p className="text-muted-foreground">Complete admin control panel</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="card-glow border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="card-glow border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-success" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Earnings</p>
                  <p className="text-2xl font-bold text-success">₹{stats.totalEarnings.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="card-glow border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CreditCard className="h-8 w-8 text-warning" />
                <div>
                  <p className="text-sm text-muted-foreground">Withdrawals</p>
                  <p className="text-2xl font-bold">₹{stats.totalWithdrawals.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="card-glow border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Activity className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Ads Watched</p>
                  <p className="text-2xl font-bold">{stats.totalAdsWatched}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="notifications">Notify</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="transactions">Txns</TabsTrigger>
            <TabsTrigger value="admob">AdMob</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card className="card-glow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  All Users
                </CardTitle>
                <CardDescription>Manage user accounts and balances</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by user ID..."
                      value={searchEmail}
                      onChange={(e) => setSearchEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User ID</TableHead>
                        <TableHead>UPI ID</TableHead>
                        <TableHead>Total Earnings</TableHead>
                        <TableHead>Payable Amount</TableHead>
                        <TableHead>Payment Status</TableHead>
                        <TableHead>Ads Watched</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProfiles.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground">
                            No users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredProfiles.map((profile) => (
                          <TableRow key={profile.id}>
                            <TableCell className="font-mono text-sm">
                              {profile.user_id.slice(0, 12)}...
                            </TableCell>
                            <TableCell className="font-medium text-primary">
                              {profile.upi_id || <span className="text-muted-foreground">Not set</span>}
                            </TableCell>
                            <TableCell className="text-success font-medium">
                              ₹{Number(profile.total_earnings).toFixed(2)}
                            </TableCell>
                            <TableCell className="font-bold text-warning">
                              ₹{Number(profile.withdrawable_balance).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getPaymentStatusBadge(profile.payment_status || 'pending')}>
                                {profile.payment_status || 'pending'}
                              </Badge>
                            </TableCell>
                            <TableCell>{profile.ads_watched}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4">
            <Card className="card-glow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Send Notification to All Users
                </CardTitle>
                <CardDescription>Broadcast a notification to all registered users</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    placeholder="Notification title..."
                    value={notificationTitle}
                    onChange={(e) => setNotificationTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Message</label>
                  <Textarea
                    placeholder="Write your notification message..."
                    value={notificationMessage}
                    onChange={(e) => setNotificationMessage(e.target.value)}
                    rows={4}
                  />
                </div>
                <Button 
                  onClick={handleSendNotification}
                  disabled={sendingNotification || !notificationTitle.trim() || !notificationMessage.trim()}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {sendingNotification ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send to All Users ({userProfiles.length})
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Roles Tab */}
          <TabsContent value="roles" className="space-y-4">
            <Card className="card-glow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-primary" />
                  Assign Role
                </CardTitle>
                <CardDescription>Grant admin, moderator, or user roles</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">User</label>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                      <SelectContent>
                        {userProfiles.map((profile) => (
                          <SelectItem key={profile.user_id} value={profile.user_id}>
                            {profile.user_id.slice(0, 12)}...
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Role</label>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="moderator">Moderator</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button 
                      onClick={handleAssignRole} 
                      disabled={actionLoading}
                      className="w-full bg-primary hover:bg-primary/90"
                    >
                      {actionLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Assign Role"
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-glow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  All User Roles
                </CardTitle>
                <CardDescription>View and manage all assigned roles</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User ID</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Assigned At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userRoles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No roles assigned yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      userRoles.map((userRole) => (
                        <TableRow key={userRole.id}>
                          <TableCell className="font-mono text-sm">
                            {userRole.user_id.slice(0, 12)}...
                          </TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(userRole.role)}>
                              {userRole.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {userRole.created_at ? new Date(userRole.created_at).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRevokeRole(userRole.id)}
                              disabled={actionLoading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-4">
            <Card className="card-glow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Payment Management
                </CardTitle>
                <CardDescription>Manage user payments with UPI details and status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-4 mb-6">
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Total Paid Out</p>
                      <p className="text-2xl font-bold text-primary">₹{stats.totalWithdrawals.toFixed(2)}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-warning" />
                        <p className="text-sm text-muted-foreground">Pending</p>
                      </div>
                      <p className="text-2xl font-bold text-warning">{stats.pendingPayments}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Total Payable</p>
                      <p className="text-2xl font-bold text-destructive">₹{stats.totalPayable.toFixed(2)}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Platform Earnings</p>
                      <p className="text-2xl font-bold text-success">₹{stats.totalEarnings.toFixed(2)}</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User ID</TableHead>
                        <TableHead>UPI ID</TableHead>
                        <TableHead>Payable Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userProfiles.filter(p => Number(p.withdrawable_balance) >= 50).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            No users eligible for payment (min ₹50)
                          </TableCell>
                        </TableRow>
                      ) : (
                        userProfiles
                          .filter(p => Number(p.withdrawable_balance) >= 50)
                          .map((profile) => (
                            <TableRow key={profile.id}>
                              <TableCell className="font-mono text-sm">
                                {profile.user_id.slice(0, 12)}...
                              </TableCell>
                              <TableCell className="font-medium">
                                {profile.upi_id ? (
                                  <span className="text-primary">{profile.upi_id}</span>
                                ) : (
                                  <span className="text-muted-foreground italic">Not provided</span>
                                )}
                              </TableCell>
                              <TableCell className="text-success font-bold">
                                ₹{Number(profile.withdrawable_balance).toFixed(2)}
                              </TableCell>
                              <TableCell>
                                <Badge variant={getPaymentStatusBadge(profile.payment_status || 'pending')}>
                                  {profile.payment_status || 'pending'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex gap-2 justify-end">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleUpdatePaymentStatus(profile.user_id, 'processing')}
                                    disabled={actionLoading || profile.payment_status === 'processing'}
                                  >
                                    <Clock className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleUpdatePaymentStatus(profile.user_id, 'paid')}
                                    disabled={actionLoading || profile.payment_status === 'paid'}
                                    className="bg-success hover:bg-success/90"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Daily Rewards Tab */}
          <TabsContent value="daily" className="space-y-4">
            <Card className="card-glow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-warning" />
                  Daily Rewards Data
                </CardTitle>
                <CardDescription>View all user daily reward streaks and claims</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Total Users Claimed</p>
                      <p className="text-2xl font-bold text-warning">{dailyRewards.length}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Total Rewards Given</p>
                      <p className="text-2xl font-bold text-success">
                        ₹{dailyRewards.reduce((sum, d) => sum + Number(d.total_claimed), 0).toFixed(2)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Active Streaks (7 days)</p>
                      <p className="text-2xl font-bold text-primary">
                        {dailyRewards.filter(d => d.current_streak >= 7).length}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User ID</TableHead>
                      <TableHead>Current Streak</TableHead>
                      <TableHead>Last Claim</TableHead>
                      <TableHead>Total Claimed</TableHead>
                      <TableHead>Started</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailyRewards.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No daily reward claims yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      dailyRewards.map((reward) => (
                        <TableRow key={reward.id}>
                          <TableCell className="font-mono text-sm">
                            {reward.user_id.slice(0, 12)}...
                          </TableCell>
                          <TableCell>
                            <Badge variant={reward.current_streak >= 7 ? "default" : "secondary"}>
                              Day {reward.current_streak}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {reward.last_claim_date || 'Never'}
                          </TableCell>
                          <TableCell className="text-success font-medium">
                            ₹{Number(reward.total_claimed).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {reward.created_at ? new Date(reward.created_at).toLocaleDateString() : 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-4">
            <Card className="card-glow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Recent Transactions
                </CardTitle>
                <CardDescription>View all platform transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No transactions yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="font-mono text-sm">
                            {tx.user_id.slice(0, 12)}...
                          </TableCell>
                          <TableCell>
                            <Badge variant={getTransactionBadge(tx.transaction_type)}>
                              {tx.transaction_type}
                            </Badge>
                          </TableCell>
                          <TableCell className={tx.transaction_type === 'withdrawal' ? 'text-destructive' : 'text-success'}>
                            {tx.transaction_type === 'withdrawal' ? '-' : '+'}₹{Number(tx.amount).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-muted-foreground max-w-[200px] truncate">
                            {tx.description || '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {tx.created_at ? new Date(tx.created_at).toLocaleString() : 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AdMob Tab */}
          <TabsContent value="admob" className="space-y-4">
            <Card className="card-glow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-primary" />
                  AdMob Configuration
                </CardTitle>
                <CardDescription>
                  Manage AdMob settings. Changes apply without app rebuild.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">App ID *</label>
                    <Input
                      placeholder="ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX"
                      value={admobAppId}
                      onChange={(e) => setAdmobAppId(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Your AdMob App ID from the AdMob console
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Rewarded Ad Unit ID *</label>
                    <Input
                      placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX"
                      value={admobRewardedAdUnitId}
                      onChange={(e) => setAdmobRewardedAdUnitId(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Ad unit ID for rewarded video ads (required for earning)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Banner Ad Unit ID (Optional)</label>
                    <Input
                      placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX"
                      value={admobBannerAdUnitId}
                      onChange={(e) => setAdmobBannerAdUnitId(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Interstitial Ad Unit ID (Optional)</label>
                    <Input
                      placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX"
                      value={admobInterstitialAdUnitId}
                      onChange={(e) => setAdmobInterstitialAdUnitId(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <input
                      type="checkbox"
                      id="admob-testing"
                      checked={admobIsTesting}
                      onChange={(e) => setAdmobIsTesting(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <label htmlFor="admob-testing" className="text-sm">
                      Enable Test Mode (use test ads)
                    </label>
                  </div>
                </div>

                <Button
                  onClick={handleSaveAdmobConfig}
                  disabled={savingAdmob}
                  className="gap-2"
                >
                  {savingAdmob ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Configuration
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;