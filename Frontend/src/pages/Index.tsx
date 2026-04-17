import AppHeader from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ShoppingCart, Users, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import RevenueChart from "@/components/dashboard/RevenueChart";
import RecentOrders from "@/components/dashboard/RecentOrders";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { useBranch, getBranchId } from "@/context/BranchContext";
import { usePageTitle } from "@/hooks/usePageTitle";

interface CurrencyRevenue {
  currency: string;
  name: string;
  symbol: string;
  originalAmount: number;
  usdAmount: number;
  count: number;
  color: string;
}

const Dashboard = () => {
  usePageTitle("Dashboard");
  const { selectedBranch } = useBranch();
  const [metrics, setMetrics] = useState<any>(null);
  const [revenueByCurrency, setRevenueByCurrency] = useState<CurrencyRevenue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiStatus, setApiStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');

  useEffect(() => {
    const fetchMetrics = async () => {
      setIsLoading(true);
      try {
        // Test API connection
        const healthCheck = await api.healthCheck();
        if (healthCheck.data) {
          setApiStatus('connected');
        } else {
          setApiStatus('disconnected');
        }

        // Fetch dashboard metrics filtered by branch
        const branchId = getBranchId(selectedBranch);
        const [dashRes, currencyRes] = await Promise.all([
          api.getDashboardMetrics(branchId || undefined),
          api.getRevenueByCurrency(branchId || undefined),
        ]);
        if (dashRes.data) {
          setMetrics(dashRes.data);
        }
        if (currencyRes.data) {
          setRevenueByCurrency((currencyRes.data as any).byCurrency || []);
        }
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
        setApiStatus('disconnected');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, [selectedBranch]);

  const stats = [
    {
      label: "Total Revenue",
      value: metrics ? `$${metrics.revenue?.total.toLocaleString()}` : "$125,430",
      change: metrics ? `+${metrics.revenue?.change}%` : "+12.5%",
      icon: DollarSign,
      link: "/orders",
      color: "text-success",
    },
    {
      label: "Total Orders",
      value: metrics ? metrics.orders?.total : "342",
      change: metrics ? `${metrics.orders?.pending} pending` : "23 pending",
      icon: ShoppingCart,
      link: "/orders",
      color: "text-primary",
    },
    {
      label: "Total Customers",
      value: metrics ? metrics.customers?.total : "89",
      change: metrics ? `${metrics.customers?.new} new` : "12 new",
      icon: Users,
      link: "/customers",
      color: "text-warning",
    },
    {
      label: "Inventory Items",
      value: metrics ? metrics.inventory?.totalItems : "156",
      change: metrics ? `${metrics.inventory?.lowStock} low stock` : "8 low stock",
      icon: TrendingUp,
      link: "/hardware",
      color: "text-accent",
    },
  ];
  return (
    <>
      <AppHeader title="Dashboard" />
      <div className="flex-1 p-6 space-y-6">
        {/* API Status Indicator */}
        <div className="flex items-center gap-2 text-sm">
          <div className={`w-2 h-2 rounded-full ${
            apiStatus === 'connected' ? 'bg-green-500' : 
            apiStatus === 'disconnected' ? 'bg-red-500' : 
            'bg-yellow-500 animate-pulse'
          }`} />
          <span className="text-muted-foreground">
            Backend API: {apiStatus === 'connected' ? 'Connected' : apiStatus === 'disconnected' ? 'Disconnected' : 'Checking...'}
          </span>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <Link key={stat.label} to={stat.link}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer animate-fade-in group" style={{ animationDelay: `${i * 80}ms` }}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {stat.label}
                    </span>
                    <div className={`w-9 h-9 rounded-lg bg-secondary flex items-center justify-center ${stat.color} group-hover:scale-110 transition-transform`}>
                      <stat.icon className="w-4.5 h-4.5" />
                    </div>
                  </div>
                  <div className="text-2xl font-extrabold text-foreground">{stat.value}</div>
                  <span className="text-xs font-medium text-success">{stat.change} this month</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Charts & Recent */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 animate-fade-in" style={{ animationDelay: "320ms" }}>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Monthly Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <RevenueChart />
            </CardContent>
          </Card>

          <div className="space-y-6">
            {/* Revenue by Currency */}
            <Card className="animate-fade-in" style={{ animationDelay: "360ms" }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Revenue by Currency</CardTitle>
              </CardHeader>
              <CardContent>
                {revenueByCurrency.length > 0 ? (
                  <div className="space-y-3">
                    {revenueByCurrency.map((item) => (
                      <div key={item.currency} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                          <span className="text-sm font-medium">{item.currency}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold">
                            {item.symbol}{item.originalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ≈ ${item.usdAmount.toFixed(2)} USD
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    No payment data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Orders */}
            <Card className="animate-fade-in" style={{ animationDelay: "400ms" }}>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Recent Orders</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <RecentOrders />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
