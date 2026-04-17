import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UserPlus,
  Search,
  Shield,
  Clock,
  Activity,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  KeyRound,
  Mail,
  Phone,
  AlertCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useBranch } from "@/context/BranchContext";
import { Checkbox } from "@/components/ui/checkbox";
import { usePageTitle } from "@/hooks/usePageTitle";

// ─── Permission definitions ───────────────────────────────────────────────────

const PAGE_OPTIONS = [
  { key: "dashboard",  label: "Dashboard" },
  { key: "new-order",  label: "New Order" },
  { key: "orders",     label: "Orders" },
  { key: "customers",  label: "Customers" },
  { key: "metrics",    label: "Metrics" },
  { key: "settings",   label: "Settings" },
  { key: "admin",      label: "Admin / Item Catalog" },
  { key: "hardware",   label: "Hardware" },
  { key: "users",      label: "User Management" },
];

const ACTION_OPTIONS = [
  { key: "create-order",    label: "Create New Order" },
  { key: "process-payment", label: "Process Payment" },
  { key: "add-customer",    label: "Add Customer" },
  { key: "delete-order",    label: "Delete / Void Order" },
  { key: "apply-discount",  label: "Apply Discount" },
  { key: "export-csv",      label: "Export CSV (Metrics)" },
  { key: "print-receipt",   label: "Print Receipt" },
];

const DEFAULT_PAGES   = ["dashboard", "orders", "new-order", "customers"];
const DEFAULT_ACTIONS = ["create-order", "process-payment", "add-customer"];

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface MappedUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  branch: string;
  status: string;
  lastLogin: string | null;
  createdAt: string;
  permissions: { pages: string[]; actions: string[] };
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const toDisplayRole = (r: string) =>
  r === "admin" ? "Admin" : r === "manager" ? "Manager" : "Cashier";

const toApiRole = (r: string) =>
  r === "Admin" ? "admin" : r === "Manager" ? "manager" : "user";

const roleColor = (role: string) => {
  switch (role) {
    case "Admin":    return "bg-accent text-accent-foreground";
    case "Manager":  return "bg-primary text-primary-foreground";
    default:         return "bg-muted text-muted-foreground";
  }
};

const mapUser = (u: any): MappedUser => ({
  id:        u._id || u.id || "",
  name:      u.username || u.name || "Unknown User",
  email:     u.email   || "",
  phone:     u.phone   || "",
  role:      toDisplayRole(u.role || "user"),
  branch:    u.branch  || "-",
  status:    u.status  || "active",
  lastLogin: u.lastLogin ? new Date(u.lastLogin).toLocaleString() : null,
  createdAt: u.createdAt
    ? new Date(u.createdAt).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10),
  permissions: {
    pages:   Array.isArray(u.permissions?.pages)   ? u.permissions.pages   : [...DEFAULT_PAGES],
    actions: Array.isArray(u.permissions?.actions) ? u.permissions.actions : [...DEFAULT_ACTIONS],
  },
});

// â”€â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const UserManagementPage = () => {
  usePageTitle("User Management");
  const { user: currentUser } = useAuth();
  const { branches } = useBranch();

  // â”€â”€ State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [users, setUsers]           = useState<MappedUser[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [search, setSearch]         = useState("");
  const [filterUser, setFilterUser] = useState<string | null>(null);

  // Add user
  const [isAddOpen, setIsAddOpen]       = useState(false);
  const [isCreating, setIsCreating]     = useState(false);
  const blankNew = () => ({
    name: "", email: "", phone: "",
    role: "Cashier", branch: branches[0]?.name || "",
    tempPassword: "",
  });
  const [newUser, setNewUser] = useState(blankNew);

  // Edit user
  const [editingUser, setEditingUser]   = useState<MappedUser | null>(null);
  const [isEditOpen, setIsEditOpen]     = useState(false);
  const [isSaving, setIsSaving]         = useState(false);
  const [editForm, setEditForm]         = useState({
    role: "", status: "", branch: "",
    permPages: [] as string[], permActions: [] as string[],
  });

  // Reset password
  const [resetTarget, setResetTarget]   = useState<MappedUser | null>(null);
  const [isResetOpen, setIsResetOpen]   = useState(false);
  const [newPassword, setNewPassword]   = useState("");
  const [isResetting, setIsResetting]   = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<MappedUser | null>(null);
  const [isDeleting, setIsDeleting]     = useState(false);

  // â”€â”€ Role guard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const canManage =
    currentUser?.role === "admin" || currentUser?.role === "manager";

  // â”€â”€ Fetch users â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchUsers = async () => {
    setIsLoading(true);
    const { data, error } = await api.getUsers();
    const raw = data as any;
    if (!error && raw?.users && Array.isArray(raw.users)) {
      setUsers((raw.users as any[]).map(mapUser));
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  // â”€â”€ Derived lists â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  // Login history: one row per user (sorted most-recent first)
  const loginRows = [...users]
    .filter((u) => !filterUser || u.id === filterUser)
    .filter((u) => u.lastLogin !== null)
    .sort((a, b) => {
      if (!a.lastLogin) return 1;
      if (!b.lastLogin) return -1;
      return new Date(b.lastLogin).getTime() - new Date(a.lastLogin).getTime();
    });

  const filterLabel = filterUser
    ? users.find((u) => u.id === filterUser)?.name
    : null;

  // â”€â”€ Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleCreateUser = async () => {
    if (!newUser.name.trim() || !newUser.email.trim()) {
      return alert("Name and email are required.");
    }
    if (!newUser.tempPassword.trim() || newUser.tempPassword.length < 4) {
      return alert("Temporary password must be at least 4 characters.");
    }
    setIsCreating(true);
    const { data, error } = await api.createUser({
      username: newUser.name,
      email:    newUser.email,
      role:     toApiRole(newUser.role),
      phone:    newUser.phone,
      branch:   newUser.branch,
      password: newUser.tempPassword,
    });
    if (error) {
      alert("Failed to create user: " + error);
      setIsCreating(false);
      return;
    }
    if (data) setUsers((prev) => [mapUser(data), ...prev]);
    setIsAddOpen(false);
    setNewUser(blankNew());
    setIsCreating(false);
  };

  const openEdit = (u: MappedUser) => {
    setEditingUser(u);
    setEditForm({
      role: u.role,
      status: u.status,
      branch: u.branch,
      permPages:   [...u.permissions.pages],
      permActions: [...u.permissions.actions],
    });
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setIsSaving(true);
    const { data, error } = await api.updateUser(editingUser.id, {
      role:   toApiRole(editForm.role),
      status: editForm.status,
      branch: editForm.branch,
      permissions: {
        pages:   editForm.permPages,
        actions: editForm.permActions,
      },
    });
    if (error) {
      alert("Failed to save changes: " + error);
      setIsSaving(false);
      return;
    }
    if (data) {
      setUsers((prev) =>
        prev.map((u) => (u.id === editingUser.id ? mapUser(data) : u))
      );
    }
    setIsEditOpen(false);
    setEditingUser(null);
    setIsSaving(false);
  };

  const handleToggleStatus = async (u: MappedUser) => {
    const newStatus = u.status === "active" ? "inactive" : "active";
    const { data, error } = await api.updateUser(u.id, { status: newStatus });
    if (error) return alert("Failed to update status: " + error);
    if (data) {
      setUsers((prev) => prev.map((x) => (x.id === u.id ? mapUser(data) : x)));
    }
  };

  const openReset = (u: MappedUser) => {
    setResetTarget(u);
    setNewPassword("");
    setIsResetOpen(true);
  };

  const handleResetPassword = async () => {
    if (!resetTarget) return;
    if (!newPassword || newPassword.length < 4) {
      return alert("Password must be at least 4 characters.");
    }
    setIsResetting(true);
    const { error } = await api.resetUserPassword(resetTarget.id, newPassword);
    if (error) {
      alert("Failed to reset password: " + error);
      setIsResetting(false);
      return;
    }
    alert(`Password reset successfully for ${resetTarget.name}.`);
    setIsResetOpen(false);
    setResetTarget(null);
    setIsResetting(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const { error } = await api.deleteUser(deleteTarget.id);
    if (error) {
      alert("Failed to delete user: " + error);
      setIsDeleting(false);
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
    setDeleteTarget(null);
    setIsDeleting(false);
  };


  // ── Activity Log State ─────────────────────────────
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // ── Fetch Audit Logs ───────────────────────────────
  const fetchAuditLogs = async () => {
    setIsLoadingLogs(true);
    const params = filterUser ? { userId: filterUser } : {};
    const { data, error } = await api.getAuditLogs(params);
    if (!error && data?.logs) setAuditLogs(data.logs);
    setIsLoadingLogs(false);
  };

  useEffect(() => {
    fetchAuditLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterUser]);

  if (!canManage) {
    return (
      <>
        <AppHeader title="User Management" />
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-sm w-full">
            <CardContent className="pt-6 flex flex-col items-center gap-3 text-center">
              <AlertCircle className="w-10 h-10 text-destructive" />
              <p className="font-medium text-foreground">Access Denied</p>
              <p className="text-sm text-muted-foreground">
                You need Admin or Manager access to manage users.
              </p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const branchNames =
    branches.length > 0
      ? branches.map((b: any) => b.name || b._id)
      : ["Main Branch"];

  return (
    <>
      <AppHeader title="User Management" />
      <div className="flex-1 p-6 space-y-6">
        <Tabs defaultValue="users" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <TabsList>
              <TabsTrigger value="users" className="gap-1.5">
                <Shield className="w-4 h-4" /> Users
              </TabsTrigger>
              <TabsTrigger value="logins" className="gap-1.5">
                <Clock className="w-4 h-4" /> Login History
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-1.5">
                <Activity className="w-4 h-4" /> Activity Log
              </TabsTrigger>
            </TabsList>

            {filterLabel && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilterUser(null)}
              >
                Viewing: {filterLabel} âœ•
              </Button>
            )}
          </div>

          {/* â”€â”€ USERS TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <TabsContent value="users" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search usersâ€¦"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* ADD USER DIALOG */}
              <Dialog
                open={isAddOpen}
                onOpenChange={(o) => {
                  setIsAddOpen(o);
                  if (!o) setNewUser(blankNew());
                }}
              >
                <DialogTrigger asChild>
                  <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                    <UserPlus className="w-4 h-4 mr-1.5" /> Add User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New User</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label>Full Name / Username</Label>
                      <Input
                        placeholder="e.g. John Doe"
                        value={newUser.name}
                        onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        placeholder="john@example.com"
                        value={newUser.email}
                        onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        placeholder="+263 77 000 0000"
                        value={newUser.phone}
                        onChange={(e) => setNewUser((p) => ({ ...p, phone: e.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select
                          value={newUser.role}
                          onValueChange={(v) => setNewUser((p) => ({ ...p, role: v }))}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Admin">Admin</SelectItem>
                            <SelectItem value="Manager">Manager</SelectItem>
                            <SelectItem value="Cashier">Cashier</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Branch</Label>
                        <Select
                          value={newUser.branch}
                          onValueChange={(v) => setNewUser((p) => ({ ...p, branch: v }))}
                        >
                          <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                          <SelectContent>
                            {branchNames.map((b: string) => (
                              <SelectItem key={b} value={b}>{b}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Temporary Password</Label>
                      <Input
                        type="password"
                        placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                        value={newUser.tempPassword}
                        onChange={(e) => setNewUser((p) => ({ ...p, tempPassword: e.target.value }))}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                    <Button
                      className="bg-primary text-primary-foreground"
                      onClick={handleCreateUser}
                      disabled={isCreating}
                    >
                      {isCreating ? "Creatingâ€¦" : "Create User"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* USERS TABLE */}
            <Card className="animate-fade-in">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="py-12 flex items-center justify-center text-muted-foreground text-sm">
                    Loading usersâ€¦
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="py-12 flex items-center justify-center text-muted-foreground text-sm">
                    No users found.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Branch</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium text-foreground">{u.name}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
                                {u.email && (
                                  <span className="flex items-center gap-1">
                                    <Mail className="w-3 h-3" />{u.email}
                                  </span>
                                )}
                                {u.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3 h-3" />{u.phone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={roleColor(u.role)}>{u.role}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{u.branch}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                u.status === "active"
                                  ? "border-success text-success"
                                  : "border-destructive text-destructive"
                              }
                            >
                              {u.status === "active" ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {u.lastLogin ?? "Never"}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setFilterUser(u.id)}>
                                  <Eye className="w-4 h-4 mr-2" /> View Activity
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEdit(u)}>
                                  <Pencil className="w-4 h-4 mr-2" /> Edit User
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openReset(u)}>
                                  <KeyRound className="w-4 h-4 mr-2" /> Reset Password
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleToggleStatus(u)}>
                                  {u.status === "active" ? "Deactivate" : "Activate"}
                                </DropdownMenuItem>
                                {currentUser?.role === "admin" && (
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => setDeleteTarget(u)}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" /> Delete User
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* â”€â”€ LOGIN HISTORY TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <TabsContent value="logins" className="space-y-4">
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  {filterLabel
                    ? `Login History â€” ${filterLabel}`
                    : "Login History â€” All Users"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loginRows.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    No login records found.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Branch</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loginRows.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell>
                            <div className="font-medium text-foreground">{u.name}</div>
                            <div className="text-xs text-muted-foreground">{u.email}</div>
                          </TableCell>
                          <TableCell>
                            <Badge className={roleColor(u.role)}>{u.role}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{u.branch}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{u.lastLogin}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                u.status === "active"
                                  ? "border-success text-success"
                                  : "border-destructive text-destructive"
                              }
                            >
                              {u.status === "active" ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── ACTIVITY LOG TAB ─────────────────────────────── */}
          <TabsContent value="activity" className="space-y-4">
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-5 h-5 text-accent" />
                  {filterLabel
                    ? `Activity Log — ${filterLabel}`
                    : "Activity Log — All Users"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoadingLogs ? (
                  <div className="py-10 text-center text-muted-foreground text-sm">
                    Loading activity log…
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground text-sm">
                    No activity log entries found.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Date/Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.map((log) => (
                        <TableRow key={log._id || log.id}>
                          <TableCell>
                            <div className="font-medium text-foreground">{log.userName || log.user || "-"}</div>
                            <div className="text-xs text-muted-foreground">{log.userEmail || ""}</div>
                          </TableCell>
                          <TableCell>{log.action}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {typeof log.details === "object"
                              ? JSON.stringify(log.details)
                              : log.details || "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {log.timestamp
                              ? new Date(log.timestamp).toLocaleString()
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* â”€â”€ EDIT USER DIALOG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User â€” {editingUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[68vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={editForm.role}
                onValueChange={(v) => setEditForm((p) => ({ ...p, role: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Manager">Manager</SelectItem>
                  <SelectItem value="Cashier">Cashier</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(v) => setEditForm((p) => ({ ...p, status: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Branch</Label>
              <Select
                value={editForm.branch}
                onValueChange={(v) => setEditForm((p) => ({ ...p, branch: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>
                  {branchNames.map((b: string) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ── Permissions (Cashier only) ─────────────────────────── */}
            {editForm.role === "Cashier" ? (
              <div className="space-y-4 rounded-lg border border-border p-4 bg-secondary/30">
                <p className="text-sm font-semibold text-foreground">Permissions</p>

                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase text-muted-foreground tracking-wide">
                    Page Access
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {PAGE_OPTIONS.map((pg) => (
                      <div key={pg.key} className="flex items-center gap-2">
                        <Checkbox
                          id={`pg-${pg.key}`}
                          checked={editForm.permPages.includes(pg.key)}
                          onCheckedChange={(checked) =>
                            setEditForm((p) => ({
                              ...p,
                              permPages: checked
                                ? [...p.permPages, pg.key]
                                : p.permPages.filter((k) => k !== pg.key),
                            }))
                          }
                        />
                        <label
                          htmlFor={`pg-${pg.key}`}
                          className="text-sm cursor-pointer select-none"
                        >
                          {pg.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase text-muted-foreground tracking-wide">
                    Allowed Actions
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {ACTION_OPTIONS.map((act) => (
                      <div key={act.key} className="flex items-center gap-2">
                        <Checkbox
                          id={`act-${act.key}`}
                          checked={editForm.permActions.includes(act.key)}
                          onCheckedChange={(checked) =>
                            setEditForm((p) => ({
                              ...p,
                              permActions: checked
                                ? [...p.permActions, act.key]
                                : p.permActions.filter((k) => k !== act.key),
                            }))
                          }
                        />
                        <label
                          htmlFor={`act-${act.key}`}
                          className="text-sm cursor-pointer select-none"
                        >
                          {act.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground bg-secondary rounded-md px-3 py-2">
                ℹ️ Admin and Manager users always have full access to all pages and actions.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button
              className="bg-primary text-primary-foreground"
              onClick={handleSaveEdit}
              disabled={isSaving}
            >
              {isSaving ? "Savingâ€¦" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* â”€â”€ RESET PASSWORD DIALOG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password â€” {resetTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Enter a new password for this user. They should change it after
              their next login.
            </p>
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type="password"
                placeholder="Min. 4 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetOpen(false)}>Cancel</Button>
            <Button
              className="bg-primary text-primary-foreground"
              onClick={handleResetPassword}
              disabled={isResetting}
            >
              {isResetting ? "Resettingâ€¦" : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* â”€â”€ DELETE CONFIRMATION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete{" "}
              <strong>{deleteTarget?.name}</strong>? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deletingâ€¦" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default UserManagementPage;
