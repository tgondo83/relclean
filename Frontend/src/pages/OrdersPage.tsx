import AppHeader from "@/components/AppHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MoreHorizontal, RefreshCw, Edit, RotateCcw, Plus, Minus, X, Calendar, Pencil, Ban } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useBranch, getBranchId } from "@/context/BranchContext";
import { printReceipt } from "@/lib/printReceipt";
import { useAuth } from "@/context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Label } from "@/components/ui/label";
import { usePageTitle } from "@/hooks/usePageTitle";

interface OrderItem {
  name: string;
  price: number;
  qty: number;
  pieces: number;
}

interface Order {
  _id?: string;
  id: string;
  orderNumber: string;
  branchId: string;
  branchPrefix: string;
  customer: string;
  customerPhone?: string;
  status: string;
  total: number;
  paidAmount?: number;
  paymentStatus?: 'unpaid' | 'partial' | 'paid';
  paymentMethod?: 'cash' | 'card' | 'mobile_money' | 'bank_transfer';
  date: string;
  items: (string | OrderItem)[];
  totalPieces?: number;
}

const statusColor: Record<string, string> = {
  completed: "bg-success/10 text-success border-success/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  processing: "bg-primary/10 text-primary border-primary/20",
  cancelled: "bg-muted text-muted-foreground",
};

const paymentStatusColor: Record<string, string> = {
  paid: "bg-success/10 text-success border-success/20",
  partial: "bg-warning/10 text-warning border-warning/20",
  unpaid: "bg-destructive/10 text-destructive border-destructive/20",
};

const OrdersPage = () => {
  usePageTitle("Orders");
  const navigate = useNavigate();
  const { selectedBranch } = useBranch();
  const { user } = useAuth();
  const canEditOrders = user?.role === 'admin' || user?.role === 'manager';
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  // ...existing code...
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Filtering logic: search, status, payment, date
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    let result = orders;

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((o) => o.status === statusFilter);
    }

    // Payment status filter
    if (paymentFilter !== "all") {
      result = result.filter((o) => (o.paymentStatus || "unpaid") === paymentFilter);
    }

    // Payment method filter
    if (paymentMethodFilter !== "all") {
      result = result.filter((o) => o.paymentMethod === paymentMethodFilter);
    }

    // Date range filter
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      result = result.filter((o) => new Date(o.date) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((o) => new Date(o.date) <= to);
    }

    // Text search across multiple fields
    if (q) {
      result = result.filter((order) => {
        // Order number & ID
        if (order.orderNumber?.toLowerCase().includes(q)) return true;
        if (order.id?.toLowerCase().includes(q)) return true;
        // Customer name
        if (order.customer?.toLowerCase().includes(q)) return true;
        // Customer phone
        if (order.customerPhone?.toLowerCase().includes(q)) return true;
        // Status labels
        if (order.status?.toLowerCase().includes(q)) return true;
        if ((order.paymentStatus || "").toLowerCase().includes(q)) return true;
        // Total amount
        if (order.total?.toFixed(2).includes(q)) return true;
        // Item names
        if (order.items?.some((item) =>
          typeof item === "string"
            ? item.toLowerCase().includes(q)
            : item.name?.toLowerCase().includes(q)
        )) return true;
        return false;
      });
    }

    setFilteredOrders(result);
  }, [searchQuery, statusFilter, paymentFilter, paymentMethodFilter, dateFrom, dateTo, orders]);

  // Edit, Delete, Refund state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ customer: "", status: "" });
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [catalogItems, setCatalogItems] = useState<{ _id: string; name: string; price: number; pieces: number }[]>([]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const branchId = getBranchId(selectedBranch);
      const { data } = await api.getOrders(branchId || undefined);
      const response = data as { orders?: Order[] } | undefined;
      if (response?.orders) {
        setOrders(response.orders);
        setFilteredOrders(response.orders);
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [selectedBranch]);

  const handlePrintReceipt = async (order: Order) => {
    // Try to resolve customer phone
    let customerPhone = "";
    try {
      const { data: custData } = await api.getCustomers();
      const customers = ((custData as { customers?: { name: string; phone: string }[] })?.customers) || (custData as { name: string; phone: string }[]) || [];
      const match = customers.find((c) => c.name?.toLowerCase() === order.customer?.toLowerCase());
      if (match) customerPhone = match.phone;
    } catch { /* non-critical */ }

    // Fetch payment methods for this order
    let paymentMethods: string[] = [];
    try {
      const orderId = order._id || order.id || order.orderNumber;
      const { data: payData } = await api.getPaymentsForOrder(orderId);
      const pmts = (payData as { payments?: { paymentMethod: string }[] })?.payments || (payData as { paymentMethod: string }[]) || [];
      paymentMethods = [...new Set(pmts.map((p: { paymentMethod: string }) => p.paymentMethod).filter(Boolean))];
    } catch { /* non-critical */ }

    printReceipt({
      orderNumber: order.orderNumber,
      id: order.id,
      customer: order.customer,
      customerPhone,
      status: order.status,
      date: order.date,
      items: order.items,
      totalPieces: order.totalPieces,
      total: order.total,
      paidAmount: order.paidAmount,
      paymentStatus: order.paymentStatus,
      paymentMethod: paymentMethods,
    });
  };

  // Edit Order
  const handleOpenEditDialog = async (order: Order) => {
    setSelectedOrder(order);
    setEditForm({ customer: order.customer, status: order.status });
    const normalizedItems = order.items.map((item) =>
      typeof item === "string"
        ? { name: item, price: 0, qty: 1, pieces: 1 }
        : { ...item }
    );
    setEditItems(normalizedItems);
    setCatalogSearch("");
    setEditDialogOpen(true);
    // Fetch catalog if not yet loaded
    if (catalogItems.length === 0) {
      try {
        const { data } = await api.getItems({ isActive: true });
        if (data) setCatalogItems(data as { _id: string; name: string; price: number; pieces: number }[]);
      } catch (e) {
        console.error("Failed to load catalog:", e);
      }
    }
  };

  const handleEditItemQty = (index: number, delta: number) => {
    setEditItems((prev) => {
      const updated = [...prev];
      const newQty = (updated[index].qty || 1) + delta;
      if (newQty <= 0) return updated.filter((_, i) => i !== index);
      updated[index] = { ...updated[index], qty: newQty };
      return updated;
    });
  };

  const handleRemoveEditItem = (index: number) => {
    setEditItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddCatalogItem = (catalogItem: { _id: string; name: string; price: number; pieces: number }) => {
    setEditItems((prev) => {
      const existing = prev.findIndex((i) => i.name === catalogItem.name);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], qty: updated[existing].qty + 1 };
        return updated;
      }
      return [...prev, { name: catalogItem.name, price: catalogItem.price, qty: 1, pieces: catalogItem.pieces || 1 }];
    });
  };

  const computeEditTotal = () =>
    editItems.reduce((sum, item) => sum + item.price * item.qty, 0);

  const handleSaveEdit = async () => {
    if (!selectedOrder) return;

    setIsSavingEdit(true);
    try {
      const orderId = selectedOrder.id || selectedOrder.orderNumber;
      const { error } = await api.updateOrder(orderId, {
        customer: editForm.customer,
        status: editForm.status,
        items: editItems,
        total: computeEditTotal(),
        totalPieces: editItems.reduce((sum, item) => sum + item.pieces * item.qty, 0),
      });

      if (error) {
        alert("Failed to update order: " + error);
        return;
      }

      setOrders((prev) =>
        prev.map((o) =>
          o.id === selectedOrder.id
            ? { ...o, customer: editForm.customer, status: editForm.status, items: editItems, total: computeEditTotal() }
            : o
        )
      );
      setEditDialogOpen(false);
      fetchOrders();
    } catch (error) {
      console.error("Error updating order:", error);
      alert("Failed to update order. Please try again.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Cancel Order
  const handleOpenDeleteDialog = (order: Order) => {
    setSelectedOrder(order);
    setDeleteDialogOpen(true);
  };

  const handleDeleteOrder = async () => {
    if (!selectedOrder) return;

    setIsDeleting(true);
    try {
      const orderId = selectedOrder.id || selectedOrder.orderNumber;
      const { error } = await api.updateOrder(orderId, { status: 'cancelled' });

      if (error) {
        alert("Failed to cancel order: " + error);
        return;
      }

      setOrders((prev) => prev.map((o) => o.id === selectedOrder.id ? { ...o, status: 'cancelled' } : o));
      setDeleteDialogOpen(false);
      fetchOrders();
    } catch (error) {
      console.error("Error cancelling order:", error);
      alert("Failed to cancel order. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Refund Order
  const handleOpenRefundDialog = (order: Order) => {
    setSelectedOrder(order);
    setRefundDialogOpen(true);
  };

  const handleRefundOrder = async () => {
    if (!selectedOrder) return;

    setIsRefunding(true);
    try {
      const orderId = selectedOrder.id || selectedOrder.orderNumber;
      
      // Mark order as cancelled and update payment status
      const { error } = await api.updateOrder(orderId, {
        status: "cancelled",
        paymentStatus: "unpaid",
        paidAmount: 0,
      });

      if (error) {
        alert("Failed to refund order: " + error);
        return;
      }

      // Try to mark any payments as refunded
      try {
        const { data: paymentsData } = await api.getPaymentsForOrder(orderId);
        const payments = (paymentsData as { payments?: { _id: string }[] })?.payments || [];
        for (const payment of payments) {
          await api.updatePaymentStatus(payment._id, "refunded");
        }
      } catch (paymentError) {
        console.error("Could not update payment statuses:", paymentError);
      }

      setOrders((prev) =>
        prev.map((o) =>
          o.id === selectedOrder.id
            ? { ...o, status: "cancelled", paymentStatus: "unpaid" as const, paidAmount: 0 }
            : o
        )
      );
      setRefundDialogOpen(false);
      fetchOrders();
    } catch (error) {
      console.error("Error refunding order:", error);
      alert("Failed to refund order. Please try again.");
    } finally {
      setIsRefunding(false);
    }
  };

  const handleViewDetails = (order: Order) => {
    const id = order._id || order.id || order.orderNumber;
    navigate(`/payment?orderId=${id}`);
  };

  const handleOpenStatusDialog = (order: Order) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setStatusDialogOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedOrder || !newStatus) return;
    setIsUpdatingStatus(true);
    try {
      const orderId = selectedOrder._id || selectedOrder.id || selectedOrder.orderNumber;
      const { error } = await api.updateOrder(orderId, { status: newStatus });
      if (error) {
        alert("Failed to update status: " + error);
        return;
      }
      setOrders((prev) =>
        prev.map((o) => o.id === selectedOrder.id ? { ...o, status: newStatus } : o)
      );
      setStatusDialogOpen(false);
      fetchOrders();
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status. Please try again.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <>
      <AppHeader title="Orders" />
      <div className="flex-1 p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by order #, customer, phone, item, amount..." 
              className="pl-9" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={fetchOrders}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Link to="/orders/new">
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                + New Order
              </Button>
            </Link>
          </div>
        </div>



        {/* Filters stacked vertically as shown in image */}
        <div className="flex flex-col gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Status:</span>
            {["all", "processing", "completed", "pending", "cancelled"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  statusFilter === s
                    ? "bg-destructive text-white border-destructive"
                    : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Payment:</span>
            {["all", "unpaid", "partial", "paid"].map((p) => (
              <button
                key={p}
                onClick={() => setPaymentFilter(p)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  paymentFilter === p
                    ? "bg-destructive text-white border-destructive"
                    : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                {p === "all" ? "All" : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Method:</span>
            {[
              { value: "all", label: "All" },
              { value: "cash", label: "Cash" },
              { value: "card", label: "Card" },
              { value: "mobile_money", label: "Mobile Money" },
              { value: "bank_transfer", label: "Bank Transfer" },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setPaymentMethodFilter(value)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  paymentMethodFilter === value
                    ? "bg-destructive text-white border-destructive"
                    : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground font-medium">Date:</span>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 text-xs w-36"
              placeholder="dd/mm/yyyy"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-8 text-xs w-36"
              placeholder="dd/mm/yyyy"
            />
            <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
          </div>
          <span className="text-xs text-muted-foreground">{filteredOrders.length} of {orders.length} orders</span>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Loading orders...
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  {(searchQuery || statusFilter !== "all" || paymentFilter !== "all" || paymentMethodFilter !== "all") ? 'No orders match your search or filters' : 'No orders yet'}
                </p>
                {!(searchQuery || statusFilter !== "all" || paymentFilter !== "all" || paymentMethodFilter !== "all") && (
                  <Link to="/orders/new">
                    <Button variant="outline" size="sm">
                      Create your first order
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Order #</th>
                      <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Customer</th>
                      <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Phone</th>
                      <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Date</th>
                      <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Status</th>
                      <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Payment</th>
                      <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Items</th>
                      <th className="text-right px-5 py-3 font-semibold text-muted-foreground">Total</th>
                      <th className="w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3.5 font-semibold text-foreground">{order.orderNumber || `ORD-${order.id}`}</td>
                        <td className="px-5 py-3.5 text-foreground">{order.customer}</td>
                        <td className="px-5 py-3.5 text-muted-foreground text-xs">{order.customerPhone || '—'}</td>
                        <td className="px-5 py-3.5 text-muted-foreground">{formatDate(order.date)}</td>
                        <td className="px-5 py-3.5">
                          <Badge variant="outline" className={statusColor[order.status] || statusColor.pending}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant="outline" className={paymentStatusColor[order.paymentStatus || 'unpaid']}>
                            {order.paymentStatus === 'partial' ? 'Partial' : order.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-muted-foreground text-xs">
                          {order.items.slice(0, 2).map((item, i) => (
                            <span key={i}>
                              {i > 0 && ', '}
                              {typeof item === 'string' ? item : item.name}
                            </span>
                          ))}
                          {order.items.length > 2 && ` +${order.items.length - 2} more`}
                          {order.totalPieces && <span className="ml-1">({order.totalPieces} pcs)</span>}
                        </td>
                        <td className="px-5 py-3.5 text-right font-semibold text-foreground">
                          ${order.total.toFixed(2)}
                        </td>
                        <td className="px-2 py-3.5">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewDetails(order)}>
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenStatusDialog(order)}>
                                Update Status
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePrintReceipt(order)}>
                                Print Receipt
                              </DropdownMenuItem>
                              {canEditOrders && <DropdownMenuSeparator />}
                              {canEditOrders && (
                                <DropdownMenuItem onClick={() => handleOpenEditDialog(order)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit Order
                                </DropdownMenuItem>
                              )}
                              {order.paymentStatus === 'paid' && canEditOrders && (
                                <DropdownMenuItem onClick={() => handleOpenRefundDialog(order)}>
                                  <RotateCcw className="w-4 h-4 mr-2" />
                                  Refund Order
                                </DropdownMenuItem>
                              )}
                              {canEditOrders && order.status !== 'cancelled' && (
                                <DropdownMenuItem 
                                  onClick={() => handleOpenDeleteDialog(order)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Ban className="w-4 h-4 mr-2" />
                                  Cancel Order
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Update Status Dialog */}
        <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Order Status</DialogTitle>
              <DialogDescription>
                Change the status for order {selectedOrder?.orderNumber || selectedOrder?.id}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpdateStatus}
                disabled={isUpdatingStatus || newStatus === selectedOrder?.status}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {isUpdatingStatus ? "Updating..." : "Update Status"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Order Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Order</DialogTitle>
              <DialogDescription>
                Edit order {selectedOrder?.orderNumber || selectedOrder?.id}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* Customer + Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editCustomer">Customer</Label>
                  <Input
                    id="editCustomer"
                    value={editForm.customer}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, customer: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editStatus">Status</Label>
                  <Select value={editForm.status} onValueChange={(v) => setEditForm((prev) => ({ ...prev, status: v }))}>
                    <SelectTrigger id="editStatus">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2">
                <Label>Order Items</Label>
                <div className="border border-border rounded-md divide-y divide-border">
                  {editItems.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-muted-foreground text-center">No items. Add items below.</p>
                  ) : (
                    editItems.map((item, index) => (
                      <div key={index} className="flex items-center justify-between px-3 py-2 gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">${item.price.toFixed(2)} × {item.qty} = ${(item.price * item.qty).toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button type="button" variant="outline" size="icon" className="h-6 w-6" onClick={() => handleEditItemQty(index, -1)}>
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-6 text-center text-sm font-semibold">{item.qty}</span>
                          <Button type="button" variant="outline" size="icon" className="h-6 w-6" onClick={() => handleEditItemQty(index, 1)}>
                            <Plus className="w-3 h-3" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => handleRemoveEditItem(index)}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {editItems.length > 0 && (
                  <p className="text-sm font-semibold text-right text-foreground">
                    New Total: ${computeEditTotal().toFixed(2)}
                  </p>
                )}
              </div>

              {/* Add from catalog */}
              {catalogItems.length > 0 && (
                <div className="space-y-2">
                  <Label>Add Item from Catalog</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search catalog items..."
                      className="pl-8 h-8 text-sm"
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                    {catalogItems
                      .filter((ci) => ci.name.toLowerCase().includes(catalogSearch.toLowerCase()))
                      .map((ci) => (
                        <button
                          key={ci._id}
                          type="button"
                          onClick={() => handleAddCatalogItem(ci)}
                          className="flex items-center justify-between px-2 py-1.5 text-left text-sm border border-border rounded hover:bg-accent/10 transition-colors"
                        >
                          <span className="truncate text-foreground">{ci.name}</span>
                          <span className="text-xs text-muted-foreground ml-1">${ci.price.toFixed(2)}</span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={isSavingEdit || editItems.length === 0}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {isSavingEdit ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cancel Order Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Order</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to cancel order {selectedOrder?.orderNumber || selectedOrder?.id}? 
                The order will remain visible with a Cancelled status.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Go Back</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteOrder}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? "Cancelling..." : "Cancel Order"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Refund Order Confirmation */}
        <AlertDialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Refund Order</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to refund order {selectedOrder?.orderNumber || selectedOrder?.id}?
                This will cancel the order and mark all payments as refunded.
                Total amount: ${selectedOrder?.total.toFixed(2)}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isRefunding}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRefundOrder}
                disabled={isRefunding}
                className="bg-warning text-warning-foreground hover:bg-warning/90"
              >
                {isRefunding ? "Processing Refund..." : "Confirm Refund"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
};

export default OrdersPage;
