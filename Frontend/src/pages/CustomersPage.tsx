import AppHeader from "@/components/AppHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Phone, Mail, MoreHorizontal, RefreshCw, X, Eye, ShoppingBag, CreditCard, BarChart3, User, Pencil, MapPin, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { api } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePageTitle } from "@/hooks/usePageTitle";

interface Customer {
  _id: string;
  id?: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  totalOrders?: number;
  totalSpent?: number;
  createdAt?: string;
}

interface OrderItem {
  name: string;
  price: number;
  qty: number;
  pieces: number;
}

interface CustomerOrder {
  _id: string;
  id?: string;
  orderNumber: string;
  customer: string;
  status: string;
  total: number;
  paidAmount?: number;
  paymentStatus?: 'unpaid' | 'partial' | 'paid';
  date: string;
  items: (string | OrderItem)[];
  totalPieces?: number;
}

interface CustomerPayment {
  _id: string;
  paymentNumber: string;
  orderId: string;
  amount: number;
  originalAmount: number;
  currency: string;
  paymentMethod: string;
  paymentStatus: string;
  paymentDate: string;
}

const CustomersPage = () => {
  usePageTitle("Customers");
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Customer detail modal state
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [detailTab, setDetailTab] = useState("stats");
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [customerPayments, setCustomerPayments] = useState<CustomerPayment[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", phone: "", email: "", address: "" });

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await api.getCustomers();
      if (error) {
        console.error("Failed to fetch customers:", error);
        return;
      }
      const response = data as { customers?: Customer[] } | undefined;
      if (response?.customers) {
        setCustomers(response.customers);
      }
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  const normalizePhone = (value: string) => value.replace(/\D/g, "");

  // Score-based search for better relevance
  const searchCustomers = useCallback((query: string) => {
    if (!query.trim()) {
      return customers;
    }

    const lowerQuery = query.toLowerCase().trim();
    const queryDigits = normalizePhone(query);

    const scored = customers.map((customer) => {
      let score = 0;
      const nameLower = customer.name.toLowerCase();
      const phoneLower = customer.phone.toLowerCase();
      const emailLower = (customer.email || "").toLowerCase();
      const phoneDigits = normalizePhone(customer.phone);

      // Exact name match (highest priority)
      if (nameLower === lowerQuery) score += 100;
      // Name starts with query
      else if (nameLower.startsWith(lowerQuery)) score += 50;
      // Name contains query
      else if (nameLower.includes(lowerQuery)) score += 30;

      // Phone exact match
      if (phoneLower === lowerQuery || phoneDigits === queryDigits) score += 80;
      // Phone contains query
      else if (phoneLower.includes(lowerQuery) || (queryDigits.length >= 3 && phoneDigits.includes(queryDigits))) score += 40;

      // Email match
      if (emailLower && emailLower.includes(lowerQuery)) score += 25;

      return { customer, score };
    });

    return scored
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ customer }) => customer);
  }, [customers]);

  // Debounced search
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (!value.trim()) {
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchDebounceRef.current = setTimeout(() => {
      setIsSearching(false);
    }, 150);
  }, []);

  // Memoized filtered results
  const filteredCustomers = useMemo(() => {
    return searchCustomers(searchQuery);
  }, [searchCustomers, searchQuery]);

  // Open customer detail modal
  const handleViewCustomer = async (customer: Customer, tab = "stats") => {
    setDetailCustomer(customer);
    setDetailTab(tab);
    setEditForm({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || "",
      address: customer.address || "",
    });
    setDetailOpen(true);
    setIsLoadingDetail(true);

    try {
      // Fetch orders for this customer (server-side filter)
      const customerId = customer._id || customer.id;
      const [ordersRes, paymentsRes] = await Promise.all([
        api.getOrders(undefined, { customer: customer.name }),
        customerId ? api.getPayments({ customerId }) : Promise.resolve({ data: undefined }),
      ]);

      const allOrders = ((ordersRes.data as { orders?: CustomerOrder[] })?.orders) || [];
      setCustomerOrders(allOrders);

      const payments = ((paymentsRes.data as { payments?: CustomerPayment[] })?.payments) || [];
      setCustomerPayments(payments);
    } catch (error) {
      console.error("Error loading customer details:", error);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Save customer edits
  const handleSaveCustomer = async () => {
    if (!detailCustomer) return;
    if (!editForm.name.trim() || !editForm.phone.trim()) {
      alert("Name and phone are required.");
      return;
    }

    setIsSavingEdit(true);
    try {
      const customerId = detailCustomer._id || detailCustomer.id;
      if (!customerId) return;

      const { error } = await api.updateCustomer(customerId, {
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        email: editForm.email.trim() || undefined,
        address: editForm.address.trim() || undefined,
      });

      if (error) {
        alert("Failed to update customer: " + error);
        return;
      }

      // Update local state
      const updated = {
        ...detailCustomer,
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        email: editForm.email.trim() || undefined,
        address: editForm.address.trim() || undefined,
      };
      setDetailCustomer(updated);
      setCustomers((prev) =>
        prev.map((c) => ((c._id || c.id) === customerId ? { ...c, ...updated } : c))
      );
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating customer:", error);
      alert("Failed to update customer.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Computed stats
  const computeStats = () => {
    if (!detailCustomer) return null;
    const orders = customerOrders;
    const totalSales = orders.reduce((sum, o) => sum + o.total, 0);
    const paidAmount = orders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
    const unpaidAmount = totalSales - paidAmount;
    const unpaidOrders = orders.filter((o) => o.paymentStatus !== "paid").length;

    const dates = orders.map((o) => new Date(o.date).getTime()).filter(Boolean);
    const firstOrder = dates.length > 0 ? new Date(Math.min(...dates)) : null;
    const lastOrder = dates.length > 0 ? new Date(Math.max(...dates)) : null;
    const avgSpend = orders.length > 0 ? totalSales / orders.length : 0;

    // Frequency: average days between orders
    let frequency = 0;
    if (dates.length > 1) {
      const sorted = [...dates].sort((a, b) => a - b);
      const span = sorted[sorted.length - 1] - sorted[0];
      frequency = Math.round(span / (1000 * 60 * 60 * 24) / (sorted.length - 1));
    }

    // Most popular items
    const itemCounts: Record<string, number> = {};
    for (const order of orders) {
      for (const item of order.items) {
        const name = typeof item === "string" ? item : item.name;
        const qty = typeof item === "string" ? 1 : item.qty || 1;
        itemCounts[name] = (itemCounts[name] || 0) + qty;
      }
    }
    const popularItems = Object.entries(itemCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return { totalSales, paidAmount, unpaidAmount, unpaidOrders, firstOrder, lastOrder, avgSpend, frequency, popularItems, totalOrders: orders.length };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const formatShortDate = (date: Date | null) => {
    if (!date) return "—";
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" });
  };

  const handleDeleteCustomer = async (customer: Customer) => {
    const confirmed = window.confirm(`Delete customer "${customer.name}"? This cannot be undone.`);
    if (!confirmed) return;

    const customerId = customer._id || customer.id;
    if (!customerId) return;

    try {
      const { error } = await api.deleteCustomer(customerId);
      if (error) {
        alert("Failed to delete customer: " + error);
        return;
      }
      setCustomers((prev) => prev.filter((c) => (c._id || c.id) !== customerId));
    } catch (error) {
      console.error("Error deleting customer:", error);
      alert("Failed to delete customer. Please try again.");
    }
  };

  return (
    <>
      <AppHeader title="Customers" />
      <div className="flex-1 p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, or email..."
              className="pl-9 pr-9"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            {searchQuery && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => {
                  setSearchQuery("");
                  setIsSearching(false);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
            {isSearching && (
              <div className="absolute right-10 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={fetchCustomers}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button 
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => navigate("/customers/add")}
            >
              <Plus className="w-4 h-4 mr-2" /> Add Customer
            </Button>
          </div>
        </div>

        {/* Search results summary */}
        {searchQuery && !isLoading && (
          <div className="text-sm text-muted-foreground">
            {filteredCustomers.length === 0 ? (
              <span>No customers found for "{searchQuery}"</span>
            ) : (
              <span>
                Found {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''} 
                {filteredCustomers.length !== customers.length && ` (of ${customers.length} total)`}
              </span>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Loading customers...
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              {searchQuery ? `No customers match "${searchQuery}"` : 'No customers yet'}
            </p>
            {searchQuery ? (
              <Button variant="outline" size="sm" onClick={() => setSearchQuery("")}>
                Clear search
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/customers/add")}
              >
                Add your first customer
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCustomers.map((c, i) => (
              <Card key={c._id || c.id} className="hover:shadow-md transition-shadow animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="text-base font-bold text-foreground truncate">{c.name}</div>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                        <Phone className="w-3 h-3 shrink-0" /> 
                        <span className="truncate">{c.phone}</span>
                      </div>
                      {c.email && (
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                          <Mail className="w-3 h-3 shrink-0" /> 
                          <span className="truncate">{c.email}</span>
                        </div>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewCustomer(c, "stats")}>
                          <BarChart3 className="w-4 h-4 mr-2" /> Stats
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewCustomer(c, "orders")}>
                          <ShoppingBag className="w-4 h-4 mr-2" /> Orders
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewCustomer(c, "payments")}>
                          <CreditCard className="w-4 h-4 mr-2" /> Payments
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewCustomer(c, "edit")}>
                          <Pencil className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleDeleteCustomer(c)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {c.totalOrders ?? 0} orders
                    </span>
                    <div className="flex items-center gap-2">
                      {(c.totalSpent ?? 0) > 0 && (
                        <span className="text-xs font-medium text-foreground">
                          ${(c.totalSpent ?? 0).toFixed(2)}
                        </span>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-2.5"
                        onClick={() => handleViewCustomer(c)}
                      >
                        <Eye className="w-3 h-3 mr-1" /> View
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Customer Detail Modal */}
      <Dialog open={detailOpen} onOpenChange={(open) => { setDetailOpen(open); if (!open) setIsEditing(false); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
          {detailCustomer && (() => {
            const stats = computeStats();
            return (
              <>
                {/* Header */}
                <DialogHeader className="px-6 pt-6 pb-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <DialogTitle className="text-xl font-bold">{detailCustomer.name}</DialogTitle>
                      <Button
                        size="sm"
                        className="bg-accent text-accent-foreground hover:bg-accent/90 h-7 text-xs"
                        onClick={() => navigate("/orders/new")}
                      >
                        New Order
                      </Button>
                    </div>
                  </div>
                </DialogHeader>

                {/* Tabs */}
                <Tabs value={detailTab} onValueChange={setDetailTab} className="px-6 pb-6 pt-2">
                  <TabsList className="grid w-full grid-cols-5 mb-4">
                    <TabsTrigger value="stats" className="text-xs gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5" /> Stats
                    </TabsTrigger>
                    <TabsTrigger value="details" className="text-xs gap-1.5">
                      <User className="w-3.5 h-3.5" /> Details
                    </TabsTrigger>
                    <TabsTrigger value="edit" className="text-xs gap-1.5">
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </TabsTrigger>
                    <TabsTrigger value="orders" className="text-xs gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5" /> Orders
                    </TabsTrigger>
                    <TabsTrigger value="payments" className="text-xs gap-1.5">
                      <CreditCard className="w-3.5 h-3.5" /> Payments
                    </TabsTrigger>
                  </TabsList>

                  {/* Stats Tab */}
                  <TabsContent value="stats" className="space-y-5 mt-0">
                    {isLoadingDetail ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">Loading stats...</div>
                    ) : stats ? (
                      <>
                        {/* Key Metrics Row */}
                        <div className="grid grid-cols-4 gap-4">
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground">Orders</span>
                            <p className="text-2xl font-bold">{stats.totalOrders}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground">Sales</span>
                            <p className="text-2xl font-bold">${stats.totalSales.toFixed(2)}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground">Paid</span>
                            <p className="text-2xl font-bold text-green-600">${stats.paidAmount.toFixed(2)}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground">Unpaid</span>
                            <p className="text-2xl font-bold text-red-500">${stats.unpaidAmount.toFixed(2)}</p>
                            <span className="text-xs text-red-500">({stats.unpaidOrders}) orders</span>
                          </div>
                        </div>

                        {/* Date & Frequency Row */}
                        <div className="grid grid-cols-4 gap-4 border-t pt-4">
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground">Signed Up</span>
                            <p className="text-sm font-semibold">{detailCustomer.createdAt ? formatShortDate(new Date(detailCustomer.createdAt)) : "—"}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground">Last Order</span>
                            <p className="text-sm font-semibold">{formatShortDate(stats.lastOrder)}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground">Frequency</span>
                            <p className="text-sm font-semibold">{stats.frequency > 0 ? `${stats.frequency} days` : "—"}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground">Avg Spend</span>
                            <p className="text-sm font-semibold">${stats.avgSpend.toFixed(2)}</p>
                          </div>
                        </div>

                        {/* Popular Items */}
                        {stats.popularItems.length > 0 && (
                          <div className="border-t pt-4 space-y-2">
                            <h4 className="text-sm font-bold">Most Popular Items</h4>
                            <p className="text-sm text-muted-foreground">
                              {stats.popularItems.map(([name, count]) => `${name} (${count})`).join(", ")}
                            </p>
                          </div>
                        )}
                      </>
                    ) : null}
                  </TabsContent>

                  {/* Details Tab */}
                  <TabsContent value="details" className="mt-0">
                    <Card>
                      <CardContent className="p-5 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-accent/20 text-accent flex items-center justify-center text-lg font-bold">
                            {detailCustomer.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-lg font-bold">{detailCustomer.name}</h3>
                            <p className="text-xs text-muted-foreground">Customer since {detailCustomer.createdAt ? formatDate(detailCustomer.createdAt) : "—"}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Phone</p>
                              <p className="text-sm font-medium">{detailCustomer.phone}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Email</p>
                              <p className="text-sm font-medium">{detailCustomer.email || "—"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Address</p>
                              <p className="text-sm font-medium">{detailCustomer.address || "—"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Total Orders</p>
                              <p className="text-sm font-medium">{detailCustomer.totalOrders ?? 0}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Edit Tab */}
                  <TabsContent value="edit" className="mt-0">
                    <Card>
                      <CardContent className="p-5 space-y-4">
                        <div className="grid gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="edit-name">Name</Label>
                            <Input
                              id="edit-name"
                              value={editForm.name}
                              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-phone">Phone</Label>
                            <Input
                              id="edit-phone"
                              value={editForm.phone}
                              onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-email">Email</Label>
                            <Input
                              id="edit-email"
                              type="email"
                              value={editForm.email}
                              onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-address">Address</Label>
                            <Input
                              id="edit-address"
                              value={editForm.address}
                              onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditForm({
                                name: detailCustomer.name,
                                phone: detailCustomer.phone,
                                email: detailCustomer.email || "",
                                address: detailCustomer.address || "",
                              });
                            }}
                          >
                            Reset
                          </Button>
                          <Button
                            size="sm"
                            className="bg-accent text-accent-foreground hover:bg-accent/90"
                            onClick={handleSaveCustomer}
                            disabled={isSavingEdit}
                          >
                            {isSavingEdit ? "Saving..." : "Save Changes"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Orders Tab */}
                  <TabsContent value="orders" className="mt-0">
                    {isLoadingDetail ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">Loading orders...</div>
                    ) : customerOrders.length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">No orders found for this customer.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="text-left px-3 py-2 font-semibold text-muted-foreground text-xs">Order #</th>
                              <th className="text-left px-3 py-2 font-semibold text-muted-foreground text-xs">Date</th>
                              <th className="text-left px-3 py-2 font-semibold text-muted-foreground text-xs">Status</th>
                              <th className="text-left px-3 py-2 font-semibold text-muted-foreground text-xs">Payment</th>
                              <th className="text-left px-3 py-2 font-semibold text-muted-foreground text-xs">Items</th>
                              <th className="text-right px-3 py-2 font-semibold text-muted-foreground text-xs">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {customerOrders.map((order) => (
                              <tr key={order._id || order.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                <td className="px-3 py-2 font-semibold text-xs">{order.orderNumber}</td>
                                <td className="px-3 py-2 text-muted-foreground text-xs">{formatDate(order.date)}</td>
                                <td className="px-3 py-2">
                                  <Badge variant="outline" className={`text-[10px] ${
                                    order.status === "completed" ? "bg-success/10 text-success border-success/20" :
                                    order.status === "processing" ? "bg-primary/10 text-primary border-primary/20" :
                                    order.status === "cancelled" ? "bg-muted text-muted-foreground" :
                                    "bg-warning/10 text-warning border-warning/20"
                                  }`}>
                                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                  </Badge>
                                </td>
                                <td className="px-3 py-2">
                                  <Badge variant="outline" className={`text-[10px] ${
                                    order.paymentStatus === "paid" ? "bg-success/10 text-success border-success/20" :
                                    order.paymentStatus === "partial" ? "bg-warning/10 text-warning border-warning/20" :
                                    "bg-destructive/10 text-destructive border-destructive/20"
                                  }`}>
                                    {order.paymentStatus === "paid" ? "Paid" : order.paymentStatus === "partial" ? "Partial" : "Unpaid"}
                                  </Badge>
                                </td>
                                <td className="px-3 py-2 text-muted-foreground text-xs max-w-[150px] truncate">
                                  {order.items.slice(0, 2).map((item, i) => (
                                    <span key={i}>{i > 0 && ", "}{typeof item === "string" ? item : item.name}</span>
                                  ))}
                                  {order.items.length > 2 && ` +${order.items.length - 2}`}
                                </td>
                                <td className="px-3 py-2 text-right font-semibold text-xs">${order.total.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </TabsContent>

                  {/* Payments Tab */}
                  <TabsContent value="payments" className="mt-0">
                    {isLoadingDetail ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">Loading payments...</div>
                    ) : customerPayments.length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">No payments found for this customer.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="text-left px-3 py-2 font-semibold text-muted-foreground text-xs">Payment #</th>
                              <th className="text-left px-3 py-2 font-semibold text-muted-foreground text-xs">Date</th>
                              <th className="text-left px-3 py-2 font-semibold text-muted-foreground text-xs">Method</th>
                              <th className="text-left px-3 py-2 font-semibold text-muted-foreground text-xs">Status</th>
                              <th className="text-right px-3 py-2 font-semibold text-muted-foreground text-xs">Amount</th>
                              <th className="text-right px-3 py-2 font-semibold text-muted-foreground text-xs">Currency</th>
                            </tr>
                          </thead>
                          <tbody>
                            {customerPayments.map((payment) => (
                              <tr key={payment._id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                <td className="px-3 py-2 font-semibold text-xs">{payment.paymentNumber}</td>
                                <td className="px-3 py-2 text-muted-foreground text-xs">{formatDate(payment.paymentDate)}</td>
                                <td className="px-3 py-2 text-xs capitalize">{payment.paymentMethod.replace("_", " ")}</td>
                                <td className="px-3 py-2">
                                  <Badge variant="outline" className={`text-[10px] ${
                                    payment.paymentStatus === "completed" ? "bg-success/10 text-success border-success/20" :
                                    payment.paymentStatus === "refunded" ? "bg-muted text-muted-foreground" :
                                    payment.paymentStatus === "failed" ? "bg-destructive/10 text-destructive border-destructive/20" :
                                    "bg-warning/10 text-warning border-warning/20"
                                  }`}>
                                    {payment.paymentStatus.charAt(0).toUpperCase() + payment.paymentStatus.slice(1)}
                                  </Badge>
                                </td>
                                <td className="px-3 py-2 text-right font-semibold text-xs">${payment.amount.toFixed(2)}</td>
                                <td className="px-3 py-2 text-right text-muted-foreground text-xs">
                                  {payment.currency !== "USD"
                                    ? `${payment.originalAmount.toFixed(2)} ${payment.currency}`
                                    : "USD"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CustomersPage;
