import AppHeader from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Download, TrendingUp, DollarSign, Users, ShoppingCart } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useBranch, getBranchId } from "@/context/BranchContext";
import { api } from "@/lib/api";

interface DashboardMetrics {
  revenue: { total: number; change: number; chartData: { month: string; value: number }[] };
  orders: { total: number; pending: number; processing: number; completed: number; cancelled: number };
  customers: { total: number; new: number; active: number };
  inventory: { totalItems: number; lowStock: number; outOfStock: number };
}

interface SalesMetrics {
  daily: number;
  weekly: number;
  monthly: number;
  topProducts: { name: string; sales: number; revenue: number }[];
}

interface RevenueByPaymentType {
  byPaymentType: { method: string; name: string; amount: number; count: number; color: string }[];
  total: number;
}

interface RevenueByCurrency {
  byCurrency: { currency: string; name: string; symbol: string; originalAmount: number; usdAmount: number; count: number; color: string }[];
  totalUsd: number;
}

interface TopCustomersResponse {
  topCustomers: { name: string; orders: number; spent: number }[];
}

interface DailyOrdersResponse {
  dailyOrders: { day: string; date: string; orders: number }[];
}

const MetricsPage = () => {
  const { branches } = useBranch();
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [reportBranch, setReportBranch] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null);
  const [salesMetrics, setSalesMetrics] = useState<SalesMetrics | null>(null);
  const [revenueByPaymentType, setRevenueByPaymentType] = useState<RevenueByPaymentType | null>(null);
  const [revenueByCurrency, setRevenueByCurrency] = useState<RevenueByCurrency | null>(null);
  const [topCustomersData, setTopCustomersData] = useState<TopCustomersResponse | null>(null);
  const [dailyOrdersData, setDailyOrdersData] = useState<DailyOrdersResponse | null>(null);

  const fetchMetrics = useCallback(async () => {
    setIsLoading(true);
    try {
      const branchId = reportBranch === "all" ? undefined : reportBranch;
      const [dashRes, salesRes, paymentTypeRes, currencyRes, topCustRes, dailyRes] = await Promise.all([
        api.getDashboardMetrics(branchId, dateFrom, dateTo),
        api.getSalesMetrics(branchId, dateFrom, dateTo),
        api.getRevenueByPaymentType(branchId, dateFrom, dateTo),
        api.getRevenueByCurrency(branchId, dateFrom, dateTo),
        api.getTopCustomers(branchId, dateFrom, dateTo, 10),
        api.getDailyOrders(branchId, 7),
      ]);
      if (dashRes.data) setDashboardMetrics(dashRes.data as DashboardMetrics);
      if (salesRes.data) setSalesMetrics(salesRes.data as SalesMetrics);
      if (paymentTypeRes.data) setRevenueByPaymentType(paymentTypeRes.data as RevenueByPaymentType);
      if (currencyRes.data) setRevenueByCurrency(currencyRes.data as RevenueByCurrency);
      if (topCustRes.data) setTopCustomersData(topCustRes.data as TopCustomersResponse);
      if (dailyRes.data) setDailyOrdersData(dailyRes.data as DailyOrdersResponse);
    } catch (error) {
      console.error("Failed to fetch metrics:", error);
    } finally {
      setIsLoading(false);
    }
  }, [reportBranch, dateFrom, dateTo]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Derived data for charts
  const revenueByMonth = dashboardMetrics?.revenue.chartData || [];
  
  const ordersByStatus = dashboardMetrics ? [
    { name: "Completed", value: dashboardMetrics.orders.completed, color: "hsl(142 70% 45%)" },
    { name: "Processing", value: dashboardMetrics.orders.processing, color: "hsl(218 55% 50%)" },
    { name: "Pending", value: dashboardMetrics.orders.pending, color: "hsl(45 93% 47%)" },
    { name: "Cancelled", value: dashboardMetrics.orders.cancelled, color: "hsl(355 80% 52%)" },
  ].filter(s => s.value > 0) : [];

  const topItems = salesMetrics?.topProducts.map((p) => ({
    item: p.name,
    qty: p.sales,
    revenue: `$${p.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  })) || [];

  const dailyOrders = dailyOrdersData?.dailyOrders || [];

  const topCustomers = topCustomersData?.topCustomers.map((c) => ({

    name: c.name,
    orders: c.orders,
    spent: `$${c.spent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  })) || [];

  // ── Export CSV ────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const branchLabel =
      reportBranch === "all"
        ? "All Branches"
        : (branches.find((b) => getBranchId(b) === reportBranch)?.name ?? reportBranch);

    const rows: string[][] = [];
    const push = (...cols: (string | number)[]) => rows.push(cols.map(String));
    const blank = () => rows.push([]);
    const section = (title: string) => { blank(); push(title); };

    // ── Report header
    push("Reliable Laundry — Metrics Report");
    push("Generated", new Date().toLocaleString());
    push("Period", `${dateFrom} to ${dateTo}`);
    push("Branch", branchLabel);

    // ── Overview
    section("OVERVIEW");
    push("Metric", "Value");
    push("Total Revenue (USD)", (dashboardMetrics?.revenue.total ?? 0).toFixed(2));
    push("Revenue Change vs Last Month", `${dashboardMetrics?.revenue.change ?? 0}%`);
    push("Total Orders", dashboardMetrics?.orders.total ?? 0);
    push("  – Completed", dashboardMetrics?.orders.completed ?? 0);
    push("  – Processing", dashboardMetrics?.orders.processing ?? 0);
    push("  – Pending", dashboardMetrics?.orders.pending ?? 0);
    push("  – Cancelled", dashboardMetrics?.orders.cancelled ?? 0);
    push("Total Customers", dashboardMetrics?.customers.total ?? 0);
    push("Active Customers (30d)", dashboardMetrics?.customers.active ?? 0);
    push("New Customers (30d)", dashboardMetrics?.customers.new ?? 0);

    // ── Sales summary
    section("SALES SUMMARY");
    push("Period", "USD");
    push("Today", (salesMetrics?.daily ?? 0).toFixed(2));
    push("This Week", (salesMetrics?.weekly ?? 0).toFixed(2));
    push("This Month", (salesMetrics?.monthly ?? 0).toFixed(2));

    // ── Revenue by month
    if (revenueByMonth.length > 0) {
      section("MONTHLY REVENUE");
      push("Month", "USD");
      revenueByMonth.forEach((r) => push(r.month, (r.value as number).toFixed(2)));
    }

    // ── Revenue by currency
    if (revenueByCurrency && revenueByCurrency.byCurrency.length > 0) {
      section("REVENUE BY CURRENCY");
      push("Currency", "Original Amount", "USD Equivalent", "Transactions");
      revenueByCurrency.byCurrency.forEach((r) =>
        push(r.currency, r.originalAmount.toFixed(2), r.usdAmount.toFixed(2), r.count)
      );
      push("TOTAL (USD)", "", revenueByCurrency.totalUsd.toFixed(2), "");
    }

    // ── Revenue by payment type
    if (revenueByPaymentType && revenueByPaymentType.byPaymentType.length > 0) {
      section("REVENUE BY PAYMENT METHOD");
      push("Method", "USD Amount", "Transactions");
      revenueByPaymentType.byPaymentType.forEach((r) =>
        push(r.name, r.amount.toFixed(2), r.count)
      );
    }

    // ── Top items
    if (salesMetrics && salesMetrics.topProducts.length > 0) {
      section("TOP ITEMS BY REVENUE");
      push("Item", "Qty Sold", "Revenue (USD)");
      salesMetrics.topProducts.forEach((p) =>
        push(p.name, p.sales, p.revenue.toFixed(2))
      );
    }

    // ── Daily orders (last 7 days)
    if (dailyOrders.length > 0) {
      section("DAILY ORDER VOLUME (LAST 7 DAYS)");
      push("Day", "Date", "Orders");
      dailyOrders.forEach((d) => push(d.day, d.date, d.orders));
    }

    // ── Top customers
    if (topCustomersData && topCustomersData.topCustomers.length > 0) {
      section("TOP CUSTOMERS BY SPEND");
      push("#", "Customer", "Orders", "Total Spent (USD)");
      topCustomersData.topCustomers.forEach((c, i) =>
        push(i + 1, c.name, c.orders, c.spent.toFixed(2))
      );
    }

    // ── Build CSV string
    const csv = rows
      .map((row) =>
        row
          .map((cell) => {
            const str = String(cell);
            return str.includes(",") || str.includes('"') || str.includes("\n")
              ? `"${str.replace(/"/g, '""')}"`
              : str;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `metrics_${branchLabel.replace(/\s+/g, "_")}_${dateFrom}_to_${dateTo}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <AppHeader title="Metrics & Reports" />
      <div className="flex-1 p-6 space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1">
                <Label className="text-xs">From</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">To</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Branch</Label>
                <Select value={reportBranch} onValueChange={setReportBranch}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={getBranchId(branch)} value={getBranchId(branch)}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={isLoading}>
                <Download className="w-4 h-4 mr-1" /> Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview"><TrendingUp className="w-4 h-4 mr-1" /> Overview</TabsTrigger>
            <TabsTrigger value="revenue"><DollarSign className="w-4 h-4 mr-1" /> Revenue</TabsTrigger>
            <TabsTrigger value="orders"><ShoppingCart className="w-4 h-4 mr-1" /> Orders</TabsTrigger>
            <TabsTrigger value="customers"><Users className="w-4 h-4 mr-1" /> Customers</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">Loading metrics...</div>
            ) : (
            <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Revenue", value: `$${(dashboardMetrics?.revenue.total || 0).toLocaleString()}`, icon: DollarSign, sub: `${dashboardMetrics?.revenue.change || 0}% vs last month` },
                { label: "Total Orders", value: `${dashboardMetrics?.orders.total || 0}`, icon: ShoppingCart, sub: "Period total" },
                { label: "Avg Order Value", value: dashboardMetrics?.orders.total ? `$${(dashboardMetrics.revenue.total / dashboardMetrics.orders.total).toFixed(0)}` : "$0", icon: TrendingUp, sub: "Per order" },
                { label: "Active Customers", value: `${dashboardMetrics?.customers.active || 0}`, icon: Users, sub: `${dashboardMetrics?.customers.new || 0} new` },
              ].map((s) => (
                <Card key={s.label}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</span>
                      <s.icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="text-2xl font-extrabold text-foreground">{s.value}</div>
                    <span className="text-xs text-muted-foreground">{s.sub}</span>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Orders by Status</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={ordersByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                        {ordersByStatus.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Daily Order Volume</CardTitle></CardHeader>
                <CardContent>
                  {dailyOrders.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={dailyOrders}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 20% 90%)" />
                        <XAxis dataKey="day" tick={{ fontSize: 12, fill: "hsl(215 15% 48%)" }} />
                        <YAxis tick={{ fontSize: 12, fill: "hsl(215 15% 48%)" }} allowDecimals={false} />
                        <Tooltip />
                        <Line type="monotone" dataKey="orders" stroke="hsl(218 55% 22%)" strokeWidth={2} dot={{ fill: "hsl(355 80% 52%)" }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[250px] text-muted-foreground">No order data available</div>
                  )}
                </CardContent>
              </Card>
            </div>
            </>
            )}
          </TabsContent>

          {/* Revenue Tab */}
          <TabsContent value="revenue" className="space-y-4">
            {/* Sales Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "Today's Sales", value: salesMetrics?.daily || 0 },
                { label: "This Week", value: salesMetrics?.weekly || 0 },
                { label: "This Month", value: salesMetrics?.monthly || 0 },
              ].map((s) => (
                <Card key={s.label}>
                  <CardContent className="p-5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</span>
                    <div className="text-2xl font-extrabold text-foreground mt-1">${s.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Monthly Revenue</CardTitle>
                  <CardDescription>Revenue by month (USD)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={revenueByMonth} barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 20% 90%)" />
                      <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(215 15% 48%)" }} />
                      <YAxis tick={{ fontSize: 12, fill: "hsl(215 15% 48%)" }} />
                      <Tooltip />
                      <Bar dataKey="value" name="USD" fill="hsl(218 55% 22%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Revenue by Currency</CardTitle>
                  <CardDescription>Breakdown by payment currency</CardDescription>
                </CardHeader>
                <CardContent>
                  {revenueByCurrency && revenueByCurrency.byCurrency.length > 0 ? (
                    <div className="space-y-4">
                      {revenueByCurrency.byCurrency.map((item) => (
                        <div key={item.currency} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                              <span className="text-sm font-medium">{item.currency}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">{item.count} transactions</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-semibold">
                              {item.symbol}{item.originalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              ≈ ${item.usdAmount.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                      <div className="border-t pt-3 mt-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Total (USD)</span>
                          <span className="text-lg font-bold">${revenueByCurrency.totalUsd.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                      No currency data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Revenue by Payment Type</CardTitle>
                  <CardDescription>Breakdown by payment method</CardDescription>
                </CardHeader>
                <CardContent>
                  {revenueByPaymentType && revenueByPaymentType.byPaymentType.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={revenueByPaymentType.byPaymentType}
                            dataKey="amount"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {revenueByPaymentType.byPaymentType.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2 mt-2">
                        {revenueByPaymentType.byPaymentType.map((item) => (
                          <div key={item.method} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                              <span>{item.name}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-semibold">${item.amount.toFixed(2)}</span>
                              <span className="text-muted-foreground text-xs ml-2">({item.count} txns)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                      No payment data available
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Top Revenue Items</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Qty Sold</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topItems.map((item) => (
                        <TableRow key={item.item}>
                          <TableCell className="font-medium">{item.item}</TableCell>
                          <TableCell className="text-right">{item.qty}</TableCell>
                          <TableCell className="text-right font-semibold">{item.revenue}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            {/* Order Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Total", value: dashboardMetrics?.orders.total || 0, color: "text-foreground" },
                { label: "Processing", value: dashboardMetrics?.orders.processing || 0, color: "text-blue-600" },
                { label: "Completed", value: dashboardMetrics?.orders.completed || 0, color: "text-green-600" },
                { label: "Cancelled", value: dashboardMetrics?.orders.cancelled || 0, color: "text-red-600" },
              ].map((s) => (
                <Card key={s.label}>
                  <CardContent className="p-4 text-center">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</span>
                    <div className={`text-2xl font-extrabold mt-1 ${s.color}`}>{s.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Order Status Distribution</CardTitle></CardHeader>
                <CardContent>
                  {ordersByStatus.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie data={ordersByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90}>
                            {ordersByStatus.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-wrap gap-3 mt-2 justify-center">
                        {ordersByStatus.map((s) => (
                          <div key={s.name} className="flex items-center gap-1.5 text-xs">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                            {s.name} ({s.value})
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-[250px] text-muted-foreground">No orders in selected period</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Weekly Order Trend</CardTitle></CardHeader>
                <CardContent>
                  {dailyOrders.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={dailyOrders}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 20% 90%)" />
                        <XAxis dataKey="day" tick={{ fontSize: 12, fill: "hsl(215 15% 48%)" }} />
                        <YAxis tick={{ fontSize: 12, fill: "hsl(215 15% 48%)" }} allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="orders" fill="hsl(218 55% 22%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[250px] text-muted-foreground">No order data available</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers" className="space-y-4">
            {/* Customer summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "Total Customers", value: `${dashboardMetrics?.customers.total || 0}` },
                { label: "Active (30 days)", value: `${dashboardMetrics?.customers.active || 0}` },
                { label: "New (30 days)", value: `${dashboardMetrics?.customers.new || 0}` },
              ].map((s) => (
                <Card key={s.label}>
                  <CardContent className="p-5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</span>
                    <div className="text-2xl font-extrabold text-foreground mt-1">{s.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base">Top Customers by Spend</CardTitle></CardHeader>
              <CardContent className="p-0">
                {topCustomers.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead className="text-right">Orders</TableHead>
                        <TableHead className="text-right">Total Spent</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topCustomers.map((c, i) => (
                        <TableRow key={c.name}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell className="text-right">{c.orders}</TableCell>
                          <TableCell className="text-right font-semibold">{c.spent}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">No customer data available</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default MetricsPage;
