import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Shield, Users, UserCheck, Loader2, ArrowLeft } from "lucide-react";

interface User {
  id: string;
  email: string;
  created_at: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: "admin" | "moderator" | "user";
  created_at: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [actionLoading, setActionLoading] = useState(false);

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

      // Fetch all user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("*")
        .order("created_at", { ascending: false });

      if (rolesError) throw rolesError;
      setUserRoles(rolesData || []);

      // Get unique user IDs from roles
      const userIds = [...new Set(rolesData?.map(r => r.user_id) || [])];
      
      // Note: In production, you'd typically have a profiles table
      // For now, we'll show user IDs since we can't query auth.users directly
      const usersData = userIds.map(id => ({
        id,
        email: `User ${id.slice(0, 8)}...`,
        created_at: new Date().toISOString()
      }));
      
      setUsers(usersData);
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
              <p className="text-muted-foreground">Manage users and roles</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Assign Role Panel */}
        <Card className="card-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Assign Role
            </CardTitle>
            <CardDescription>Grant roles to users</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">User ID</label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.email}
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

        {/* All Roles Panel */}
        <Card className="card-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
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
                        {userRole.user_id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(userRole.role)}>
                          {userRole.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(userRole.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRevokeRole(userRole.id)}
                          disabled={actionLoading}
                        >
                          Revoke
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
