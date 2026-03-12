"use client";

import { useEffect, useState } from "react";
import { Cpu, DollarSign, ShoppingCart } from "lucide-react";
import { predictionsApi } from "@/lib/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatChartDate, formatCurrency } from "@/lib/chart-utils";

const COLORS = ["#00fff5", "#ff00ff", "#b946ff"];

export default function PredictionsPage() {
  const [data, setData] = useState<{
    revenue: { historical: { date: string; revenue: number }[]; predicted: { date: string; predicted_revenue: number }[] };
    orders: { historical: { date: string; order_count: number }[]; predicted: { date: string; predicted_orders: number }[] };
    model_info: { algorithm: string; features: string[] };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const summary = await predictionsApi.summary(days);
      setData(summary);
      if (summary.revenue.message || summary.orders.message) {
        setMessage(summary.revenue.message || summary.orders.message || null);
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to load predictions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [days]); // eslint-disable-line react-hooks/exhaustive-deps

  const revenueChartData = data
    ? [
        ...(data.revenue.historical?.map((h) => ({
          date: h.date,
          revenue: h.revenue,
          predicted_revenue: undefined as number | undefined,
        })) ?? []),
        ...(data.revenue.predicted?.map((p) => ({
          date: p.date,
          revenue: undefined as number | undefined,
          predicted_revenue: p.predicted_revenue,
        })) ?? []),
      ].sort((a, b) => a.date.localeCompare(b.date))
    : [];

  const ordersChartData = data
    ? [
        ...(data.orders.historical?.map((h) => ({
          date: h.date,
          order_count: h.order_count,
          predicted_orders: undefined as number | undefined,
        })) ?? []),
        ...(data.orders.predicted?.map((p) => ({
          date: p.date,
          order_count: undefined as number | undefined,
          predicted_orders: p.predicted_orders,
        })) ?? []),
      ].sort((a, b) => a.date.localeCompare(b.date))
    : [];

  const totalPredictedRevenue = data?.revenue.predicted?.reduce((s, p) => s + p.predicted_revenue, 0) ?? 0;
  const totalPredictedOrders = data?.orders.predicted?.reduce((s, p) => s + p.predicted_orders, 0) ?? 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <header className="border-b border-primary/20 pb-6">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary/60">ML Module</p>
          <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-primary">
            Predictions
          </h1>
        </header>
        <div className="flex h-64 items-center justify-center font-mono text-muted-foreground">
          Loading predictions...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-primary/20 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary/60">ML Module</p>
          <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-primary">
            Predictions
          </h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            Ridge regression • sklearn • real ML models
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">Forecast:</span>
          {[14, 30, 60].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`border px-3 py-1 font-mono text-xs transition-colors ${
                days === d ? "border-primary bg-primary/10 text-primary" : "border-primary/30 text-muted-foreground hover:border-primary/50"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </header>

      {message && (
        <div className="border border-primary/30 bg-primary/5 p-4 font-mono text-sm text-primary">
          {message}
        </div>
      )}

      {/* Model info */}
      <div className="relative overflow-hidden rounded-none border border-primary/20 bg-card/30 p-6 hud-panel">
        <div className="hud-corner hud-corner-tl" />
        <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary/80">
          <Cpu className="h-4 w-4" />
          Model Info
        </div>
        <div className="mt-3 grid gap-4 font-mono text-sm md:grid-cols-2">
          <div>
            <span className="text-muted-foreground">Algorithm:</span>{" "}
            <span className="text-primary">{data?.model_info?.algorithm ?? "Ridge Regression"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Features:</span>{" "}
            <span className="text-foreground/80">
              {data?.model_info?.features?.join(", ") ?? "days_since_start, day_of_week, day_of_month, rolling_7d_avg"}
            </span>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex items-center justify-between border border-primary/20 bg-card/30 px-6 py-4">
          <div className="flex items-center gap-3">
            <DollarSign className="h-6 w-6 text-primary" />
            <span className="font-mono text-xs uppercase text-muted-foreground">
              Predicted Revenue ({days}d)
            </span>
          </div>
          <span className="font-mono text-2xl font-bold tabular-nums text-primary">
            ${totalPredictedRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </div>
        <div className="flex items-center justify-between border border-primary/20 bg-card/30 px-6 py-4">
          <div className="flex items-center gap-3">
            <ShoppingCart className="h-6 w-6 text-primary" />
            <span className="font-mono text-xs uppercase text-muted-foreground">
              Predicted Orders ({days}d)
            </span>
          </div>
          <span className="font-mono text-2xl font-bold tabular-nums text-primary">
            {Math.round(totalPredictedOrders)}
          </span>
        </div>
      </div>

      {/* Revenue chart */}
      <div className="relative overflow-hidden rounded-none border border-primary/20 bg-card/30 p-6 hud-panel">
        <div className="hud-corner hud-corner-tl" />
        <div className="mb-4 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary/80">
          <DollarSign className="h-4 w-4" />
          Revenue Forecast
        </div>
        {revenueChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={revenueChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(180 100% 50% / 0.1)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(180 50% 60%)", fontFamily: "JetBrains Mono, monospace" }} tickFormatter={formatChartDate} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(180 50% 60%)", fontFamily: "JetBrains Mono, monospace" }} tickFormatter={(v) => formatCurrency(v)} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(240 12% 8%)",
                  border: "1px solid hsl(180 100% 50% / 0.3)",
                  borderRadius: 0,
                  fontFamily: "JetBrains Mono, monospace",
                }}
                labelFormatter={(label) => formatChartDate(String(label ?? ""))}
                formatter={(v) => v != null && typeof v === "number" ? [`$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, null] : [null, null]}
              />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke={COLORS[0]} name="Actual" dot={false} strokeWidth={2} />
              <Line
                type="monotone"
                dataKey="predicted_revenue"
                stroke={COLORS[1]}
                strokeDasharray="5 5"
                name="Predicted"
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[320px] items-center justify-center font-mono text-sm text-muted-foreground">
            No data. Add orders and load demo data for predictions.
          </div>
        )}
      </div>

      {/* Orders chart */}
      <div className="relative overflow-hidden rounded-none border border-primary/20 bg-card/30 p-6 hud-panel">
        <div className="hud-corner hud-corner-tl" />
        <div className="mb-4 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary/80">
          <ShoppingCart className="h-4 w-4" />
          Order Count Forecast
        </div>
        {ordersChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={ordersChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(180 100% 50% / 0.1)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(180 50% 60%)", fontFamily: "JetBrains Mono, monospace" }} tickFormatter={formatChartDate} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(180 50% 60%)", fontFamily: "JetBrains Mono, monospace" }} tickFormatter={(v) => Math.round(v).toString()} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(240 12% 8%)",
                  border: "1px solid hsl(180 100% 50% / 0.3)",
                  borderRadius: 0,
                  fontFamily: "JetBrains Mono, monospace",
                }}
                labelFormatter={(label) => formatChartDate(String(label ?? ""))}
              />
              <Legend />
              <Line type="monotone" dataKey="order_count" stroke={COLORS[0]} name="Actual" dot={false} strokeWidth={2} />
              <Line
                type="monotone"
                dataKey="predicted_orders"
                stroke={COLORS[2]}
                strokeDasharray="5 5"
                name="Predicted"
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[320px] items-center justify-center font-mono text-sm text-muted-foreground">
            No data. Add orders for order count predictions.
          </div>
        )}
      </div>
    </div>
  );
}
