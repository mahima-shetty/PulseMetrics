"use client";

import { useEffect, useState } from "react";
import {
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  dashboardApi,
  aiApi,
  predictionsApi,
  seedApi,
} from "@/lib/api";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const COLORS = ["#00fff5", "#ff00ff", "#b946ff", "#00ff88", "#ff6b35"];

export default function DashboardPage() {
  const [kpis, setKpis] = useState<{
    total_revenue: number;
    total_orders: number;
    total_customers: number;
    monthly_growth: number;
  } | null>(null);
  const [revenueChart, setRevenueChart] = useState<{ date: string; revenue: number }[]>([]);
  const [ordersChart, setOrdersChart] = useState<{ date: string; orders: number }[]>([]);
  const [topProducts, setTopProducts] = useState<{ product: string; revenue: number; quantity: number }[]>([]);
  const [recentOrders, setRecentOrders] = useState<
    { id: string; order_id: string; product: string; total: number; customer_name: string }[]
  >([]);
  const [recentCustomers, setRecentCustomers] = useState<
    { id: string; name: string; email: string; total_purchases: number }[]
  >([]);
  const [insights, setInsights] = useState<string | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [predictions, setPredictions] = useState<{
    historical: { date: string; revenue: number }[];
    predicted: { date: string; predicted_revenue: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [k, rc, oc, tp, ro, rc2, pred] = await Promise.all([
        dashboardApi.kpis(),
        dashboardApi.revenueChart(30),
        dashboardApi.ordersChart(14),
        dashboardApi.topProducts(5),
        dashboardApi.recentOrders(10),
        dashboardApi.recentCustomers(10),
        predictionsApi.revenue(30),
      ]);
      setKpis(k);
      setRevenueChart(rc);
      setOrdersChart(oc);
      setTopProducts(tp);
      setRecentOrders(ro);
      setRecentCustomers(rc2);
      setPredictions(pred);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    async function load() {
      try {
        await loadData();
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const loadDemoData = async () => {
    setSeedLoading(true);
    setSeedSuccess(null);
    try {
      const res = await seedApi.demoData();
      setSeedSuccess(`Added ${res.customers_created} customers and ${res.orders_created} orders`);
      await loadData();
      setTimeout(() => setSeedSuccess(null), 4000);
    } catch (e) {
      setSeedSuccess("Error: " + (e instanceof Error ? e.message : "Failed to load demo data"));
    } finally {
      setSeedLoading(false);
    }
  };

  const generateInsights = async () => {
    setInsightsLoading(true);
    setInsights(null);
    try {
      const res = await aiApi.generateInsights();
      setInsights(res.insights);
    } catch (e) {
      setInsights("Failed to generate insights. " + (e instanceof Error ? e.message : ""));
    } finally {
      setInsightsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-[60vh] grid-cols-1 gap-4 lg:grid-cols-12 lg:grid-rows-[auto_1fr_1fr]">
        <div className="lg:col-span-8">
          <Skeleton className="h-48 w-full" />
        </div>
        <div className="space-y-4 lg:col-span-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const combinedChartData = predictions?.predicted?.length
    ? [
        ...(predictions.historical?.map((h) => ({
          date: h.date,
          revenue: h.revenue,
          predicted: undefined as number | undefined,
        })) ?? []),
        ...(predictions.predicted?.map((p) => ({
          date: p.date,
          revenue: undefined as number | undefined,
          predicted: p.predicted_revenue,
        })) ?? []),
      ].sort((a, b) => a.date.localeCompare(b.date))
    : revenueChart.map((r) => ({ date: r.date, revenue: r.revenue, predicted: undefined as number | undefined }));

  return (
    <div className="space-y-6">
      {/* Header: Brutalist style */}
      <header className="flex flex-col gap-4 border-b border-primary/20 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary/60">PulseMetrics</p>
          <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-primary md:text-4xl">
            Command Center
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {seedSuccess && (
            <span className="font-mono text-xs text-primary/80">{seedSuccess}</span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={loadDemoData}
            disabled={seedLoading}
            className="font-mono text-xs"
          >
            {seedLoading ? "..." : "Add sample data"}
          </Button>
        </div>
      </header>

      {/* Asymmetric Bento Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:grid-rows-[200px_auto_auto]">
        {/* Hero: Revenue - dominates left side */}
        <div className="relative overflow-hidden rounded-none border border-primary/30 bg-card/50 p-6 lg:col-span-8 lg:row-span-1 hud-panel">
          <div className="hud-corner hud-corner-tl" />
          <div className="hud-corner hud-corner-tr" />
          <div className="hud-corner hud-corner-bl" />
          <div className="hud-corner hud-corner-br" />
          <p className="font-mono text-xs uppercase tracking-widest text-primary/60">Total Revenue</p>
          <p className="font-mono mt-2 text-4xl font-bold tabular-nums text-primary md:text-5xl lg:text-6xl">
            ${kpis?.total_revenue?.toLocaleString() ?? 0}
          </p>
          <div className="mt-3 flex gap-6 font-mono text-sm">
            <span className={kpis?.monthly_growth && kpis.monthly_growth >= 0 ? "text-[#00ff88]" : "text-destructive"}>
              {kpis?.monthly_growth ?? 0}% MoM
            </span>
          </div>
        </div>

        {/* Right rail: stacked metrics */}
        <div className="flex flex-col gap-4 lg:col-span-4 lg:row-span-1">
          {[
            { label: "Orders", value: kpis?.total_orders ?? 0, icon: ShoppingCart },
            { label: "Customers", value: kpis?.total_customers ?? 0, icon: Users },
          ].map((m) => (
            <div
              key={m.label}
              className="flex items-center justify-between border border-primary/20 bg-card/30 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <m.icon className="h-5 w-5 text-primary/70" />
                <span className="font-mono text-xs uppercase text-muted-foreground">{m.label}</span>
              </div>
              <span className="font-mono text-2xl font-bold tabular-nums text-primary">{m.value}</span>
            </div>
          ))}
        </div>

        {/* Revenue chart - full width */}
        <div className="relative overflow-hidden rounded-none border border-primary/20 bg-card/30 p-6 lg:col-span-12 hud-panel">
          <div className="hud-corner hud-corner-tl" />
          <div className="hud-corner hud-corner-br" />
          <CardTitle className="mb-4 font-mono text-xs uppercase tracking-widest text-primary/80">
            Revenue Over Time
          </CardTitle>
          {combinedChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={combinedChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(180 100% 50% / 0.1)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(180 50% 60%)" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(180 50% 60%)" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(240 12% 8%)",
                    border: "1px solid hsl(180 100% 50% / 0.3)",
                    borderRadius: 0,
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke={COLORS[0]} name="Actual" dot={false} strokeWidth={2} />
                {predictions?.predicted?.length ? (
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    stroke={COLORS[1]}
                    strokeDasharray="5 5"
                    name="Predicted"
                    dot={false}
                    strokeWidth={2}
                  />
                ) : null}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[280px] items-center justify-center font-mono text-sm text-muted-foreground">
              No revenue data yet
            </div>
          )}
        </div>

        {/* Orders chart + Top products - asymmetric */}
        <div className="relative overflow-hidden rounded-none border border-primary/20 bg-card/30 p-6 lg:col-span-7 hud-panel">
          <div className="hud-corner hud-corner-tl" />
          <CardTitle className="mb-4 font-mono text-xs uppercase tracking-widest text-primary/80">
            Orders per Day
          </CardTitle>
          {ordersChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ordersChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(180 100% 50% / 0.1)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(180 50% 60%)" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(180 50% 60%)" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(240 12% 8%)",
                    border: "1px solid hsl(180 100% 50% / 0.3)",
                    borderRadius: 0,
                  }}
                />
                <Bar dataKey="orders" fill={COLORS[0]} name="Orders" radius={[0, 0, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[220px] items-center justify-center font-mono text-sm text-muted-foreground">
              No order data yet
            </div>
          )}
        </div>

        <div className="relative overflow-hidden rounded-none border border-primary/20 bg-card/30 p-6 lg:col-span-5 hud-panel">
          <div className="hud-corner hud-corner-tr" />
          <CardTitle className="mb-4 font-mono text-xs uppercase tracking-widest text-primary/80">
            Top Products
          </CardTitle>
          {topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={topProducts}
                  dataKey="revenue"
                  nameKey="product"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                >
                  {topProducts.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => `$${v?.toLocaleString() ?? 0}`}
                  contentStyle={{
                    backgroundColor: "hsl(240 12% 8%)",
                    border: "1px solid hsl(180 100% 50% / 0.3)",
                    borderRadius: 0,
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[220px] items-center justify-center font-mono text-sm text-muted-foreground">
              No product data yet
            </div>
          )}
        </div>

        {/* Recent activity - two columns */}
        <div className="relative overflow-hidden rounded-none border border-primary/20 bg-card/30 p-6 lg:col-span-6">
          <CardTitle className="mb-4 font-mono text-xs uppercase tracking-widest text-primary/80">
            Recent Orders
          </CardTitle>
          {recentOrders.length > 0 ? (
            <div className="space-y-2 max-h-[200px] overflow-y-auto font-mono text-sm">
              {recentOrders.map((o) => (
                <div key={o.id} className="flex justify-between border-b border-primary/10 py-2 last:border-0">
                  <span className="text-foreground">{o.order_id}</span>
                  <span className="tabular-nums text-primary">${o.total.toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-[200px] items-center justify-center font-mono text-sm text-muted-foreground">
              No recent orders
            </div>
          )}
        </div>

        <div className="relative overflow-hidden rounded-none border border-primary/20 bg-card/30 p-6 lg:col-span-6">
          <CardTitle className="mb-4 font-mono text-xs uppercase tracking-widest text-primary/80">
            Recent Customers
          </CardTitle>
          {recentCustomers.length > 0 ? (
            <div className="space-y-2 max-h-[200px] overflow-y-auto font-mono text-sm">
              {recentCustomers.map((c) => (
                <div key={c.id} className="flex justify-between border-b border-primary/10 py-2 last:border-0">
                  <div>
                    <span className="text-foreground">{c.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{c.email}</span>
                  </div>
                  <span className="tabular-nums text-primary">${c.total_purchases?.toLocaleString() ?? 0}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-[200px] items-center justify-center font-mono text-sm text-muted-foreground">
              No recent customers
            </div>
          )}
        </div>
      </div>

      {/* AI Insights - full width terminal-style block */}
      <div className="relative overflow-hidden rounded-none border-2 border-primary/40 bg-black/50 p-6 hud-panel">
        <div className="hud-corner hud-corner-tl" />
        <div className="hud-corner hud-corner-tr" />
        <div className="hud-corner hud-corner-bl" />
        <div className="hud-corner hud-corner-br" />
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-mono text-xs uppercase tracking-widest text-primary">AI Insights</span>
          </div>
          <Button
            onClick={generateInsights}
            disabled={insightsLoading}
            className="font-mono text-xs"
          >
            {insightsLoading ? "RUNNING..." : "GENERATE"}
          </Button>
        </div>
        <div className="min-h-[120px] font-mono text-sm leading-relaxed text-foreground/90">
          {insights ? (
            <p className="whitespace-pre-wrap">{insights}</p>
          ) : (
            <p className="text-muted-foreground">
              &gt; Click GENERATE to run AI analysis on your metrics...
            </p>
          )}
        </div>
      </div>

      {/* Status bar */}
      <footer className="flex items-center justify-between border-t border-primary/20 py-2 font-mono text-xs text-muted-foreground">
        <span>SYSTEM OK</span>
        <span>PulseMetrics v1.0</span>
      </footer>
    </div>
  );
}
