import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";

const RevenueChart = () => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchChartData = async () => {
      setIsLoading(true);
      try {
        const { data } = await api.getDashboardMetrics();
        if (data?.revenue?.chartData) {
          setChartData(data.revenue.chartData);
        }
      } catch (error) {
        console.error('Failed to fetch chart data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChartData();
  }, []);

  if (isLoading) {
    return (
      <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
        Loading chart data...
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 20% 90%)" />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(215 15% 48%)" }} />
        <YAxis tick={{ fontSize: 12, fill: "hsl(215 15% 48%)" }} />
        <Tooltip
          contentStyle={{
            background: "hsl(0 0% 100%)",
            border: "1px solid hsl(215 20% 90%)",
            borderRadius: "8px",
            fontSize: 13,
          }}
        />
        <Bar dataKey="value" name="Revenue" fill="hsl(218 55% 22%)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default RevenueChart;
