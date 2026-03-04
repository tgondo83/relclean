import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { useBranch, getBranchId } from "@/context/BranchContext";

interface Order {
  id: string;
  orderNumber?: string;
  customer: string;
  total: number;
  status: string;
  date: string;
  items: string[];
}

const statusColor: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  completed: "bg-success/10 text-success border-success/20",
  cancelled: "bg-muted text-muted-foreground",
  processing: "bg-primary/10 text-primary border-primary/20",
};

const RecentOrders = () => {
  const { selectedBranch } = useBranch();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      try {
        const branchId = getBranchId(selectedBranch);
        const { data } = await api.getOrders(branchId || undefined);
        if (data?.orders) {
          // Get only the most recent 5 orders
          setOrders(data.orders.slice(0, 5));
        }
      } catch (error) {
        console.error('Failed to fetch orders:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [selectedBranch]);

  if (isLoading) {
    return (
      <div className="p-5 text-center text-sm text-muted-foreground">
        Loading orders...
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="p-5 text-center text-sm text-muted-foreground">
        No recent orders
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {orders.map((order) => (
        <Link
          key={order.id}
          to={`/orders`}
          className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/50 transition-colors"
        >
          <div>
            <div className="text-sm font-semibold text-foreground">{order.orderNumber || `ORD-${order.id}`}</div>
            <div className="text-xs text-muted-foreground">
              {order.customer} · {new Date(order.date).toLocaleDateString()}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-foreground">
              ${order.total.toFixed(2)}
            </span>
            <Badge variant="outline" className={statusColor[order.status] || statusColor.pending}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </Badge>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default RecentOrders;
