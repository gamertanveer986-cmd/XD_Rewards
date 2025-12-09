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
import { toast } from "sonner";
import { Shield, Users, UserCheck, Loader2, ArrowLeft, CreditCard, Eye, Trash2, Search, DollarSign, Activity } from "lucide-react";

interface UserProfile {
  id: string;
  user_id: string;
  total_earnings: number;
  withdrawable_balance: number;
  non_withdrawable_balance: number;
  ads_watched: number;
  referrals_count: number;
  created_at: string;
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

  // Stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalEarnings: 0,
    totalWithdrawals: 0,
    totalAdsWatched: 0
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
    } catch (error) {
      console.error("Error checking admin access:", error);
      navigate("/admin/login");
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

      setStats({
        totalUsers: profilesData?.length || 0,
        totalEarnings,
        totalWithdrawals,
        totalAdsWatched
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
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

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User ID</TableHead>
                      <TableHead>Total Earnings</TableHead>
                      <TableHead>Withdrawable</TableHead>
                      <TableHead>Non-Withdrawable</TableHead>
                      <TableHead>Ads Watched</TableHead>
                      <TableHead>Referrals</TableHead>
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
                          <TableCell className="text-success font-medium">
                            ₹{Number(profile.total_earnings).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            ₹{Number(profile.withdrawable_balance).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            ₹{Number(profile.non_withdrawable_balance).toFixed(2)}
                          </TableCell>
                          <TableCell>{profile.ads_watched}</TableCell>
                          <TableCell>{profile.referrals_count}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
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
                  Payment Overview
                </CardTitle>
                <CardDescription>Track all withdrawals and payouts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Total Paid Out</p>
                      <p className="text-2xl font-bold text-primary">₹{stats.totalWithdrawals.toFixed(2)}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Pending Withdrawals</p>
                      <p className="text-2xl font-bold text-warning">₹0.00</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Platform Earnings</p>
                      <p className="text-2xl font-bold text-success">₹{stats.totalEarnings.toFixed(2)}</p>
                    </CardContent>
                  </Card>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User ID</TableHead>
                      <TableHead>Withdrawable Balance</TableHead>
                      <TableHead>Total Earned</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userProfiles.filter(p => Number(p.withdrawable_balance) >= 50).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No users eligible for withdrawal (min ₹50)
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
                            <TableCell className="text-success font-medium">
                              ₹{Number(profile.withdrawable_balance).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              ₹{Number(profile.total_earnings).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">Eligible</Badge>
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
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;