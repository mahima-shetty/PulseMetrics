"use client";

import { useEffect, useState } from "react";
import { GitCompare, DollarSign, ShoppingCart, Users, TrendingUp, TrendingDown } from "lucide-react";
import { comparisonApi } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { formatCurrencyFull } from "@/lib/chart-utils";

type Mode = "month" | "week";

const CHART_STYLE = {
  grid: { stroke: "hsl(180 100% 50% / 0.1)" },
  tick: { fill: "hsl(180 100% 50% / 0.8)", fontFamily: "JetBrains Mono, monospace", fontSize: 11 },
  tooltip: {
    backgroundColor: "hsl(240 12% 8%)",
    border: "1px solid hsl(180 100% 50% / 0.3)",
    borderRadius: 0,
    fontFamily: "JetBrains Mono, monospace",
  },
};

export default function ComparisonPage() {
  const [mode, setMode] = useState<Mode>("month");
  const [data, setData] = useState<Awaited<ReturnType<typeof comparisonApi.get>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await comparisonApi.get(mode);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load comparison");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [mode]);

  const periodLabel = mode === "month" ? "This month vs last month" : "This week vs last week";

  if (loading) {
    return (
      <div className="space-y-6">
        <header className="border-b border-primary/20 pb-6">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary/60">Analytics</p>
          <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-primary">
            Period Compare
          </h1>
        </header>
        <div className="flex h-64 items-center justify-center font-mono text-muted-foreground">
          Loading...
        </div>
      </div>
    );
  }

  const revenueData = data
    ? [
        { period: "This", value: data.revenue.this, fill: "#00fff5" },
        { period: "Prev", value: data.revenue.prev, fill: "#00ff88" },
      ]
    : [];
  const ordersData = data
    ? [
        { period: "This", value: data.orders.this, fill: "#00fff5" },
        { period: "Prev", value: data.orders.prev, fill: "#00ff88" },
      ]
    : [];
  const customersData = data
    ? [
        { period: "This", value: data.new_customers.this, fill: "#00fff5" },
        { period: "Prev", value: data.new_customers.prev, fill: "#00ff88" },
      ]
    : [];

  const ChangeBadge = ({ pct }: { pct: number }) => {
    const up = pct >= 0;
    const Icon = up ? TrendingUp : TrendingDown;
    const color = up ? "text-emerald-500" : "text-destructive";
    return (
      <span className={`inline-flex items-center gap-1 font-mono text-sm tabular-nums ${color}`}>
        <Icon className="h-3.5 w-3.5" />
        {up ? "+" : ""}
        {pct}%
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-primary/20 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary/60">Analytics</p>
          <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-primary">
            Period Compare
          </h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {periodLabel} — see if you&apos;re growing or slipping
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setMode("week")}
            className={`border px-3 py-1.5 font-mono text-xs transition-colors ${
              mode === "week"
                ? "border-primary bg-primary/20 text-primary"
                : "border-primary/30 text-muted-foreground hover:border-primary/50 hover:text-foreground"
            }`}
          >
            By week
          </button>
          <button
            onClick={() => setMode("month")}
            className={`border px-3 py-1.5 font-mono text-xs transition-colors ${
              mode === "month"
                ? "border-primary bg-primary/20 text-primary"
                : "border-primary/30 text-muted-foreground hover:border-primary/50 hover:text-foreground"
            }`}
          >
            By month
          </button>
        </div>
      </header>

      {error && (
        <div className="border border-destructive/50 bg-destructive/10 p-4 font-mono text-sm text-destructive">
          {error}
        </div>
      )}

      {data && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative overflow-hidden rounded-none border border-primary/20 bg-card/30 p-6 hud-panel">
              <div className="hud-corner hud-corner-tl" />
              <div className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary/80">
                <DollarSign className="h-4 w-4" />
                Revenue
              </div>
              <div className="mb-1 font-mono text-2xl font-bold tabular-nums text-primary">
                ${data.revenue.this.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
                <span>vs {formatCurrencyFull(data.revenue.prev)}</span>
                <ChangeBadge pct={data.revenue.change_pct} />
              </div>
            </div>

            <div className="relative overflow-hidden rounded-none border border-primary/20 bg-card/30 p-6 hud-panel">
              <div className="hud-corner hud-corner-tl" />
              <div className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary/80">
                <ShoppingCart className="h-4 w-4" />
                Orders
              </div>
              <div className="mb-1 font-mono text-2xl font-bold tabular-nums text-primary">
                {data.orders.this}
              </div>
              <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
                <span>vs {data.orders.prev}</span>
                <ChangeBadge pct={data.orders.change_pct} />
              </div>
            </div>

            <div className="relative overflow-hidden rounded-none border border-primary/20 bg-card/30 p-6 hud-panel">
              <div className="hud-corner hud-corner-tl" />
              <div className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary/80">
                <Users className="h-4 w-4" />
                New customers
              </div>
              <div className="mb-1 font-mono text-2xl font-bold tabular-nums text-primary">
                {data.new_customers.this}
              </div>
              <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
                <span>vs {data.new_customers.prev}</span>
                <ChangeBadge pct={data.new_customers.change_pct} />
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-none border border-primary/20 bg-card/30 p-6 hud-panel">
            <div className="hud-corner hud-corner-tl" />
            <div className="mb-4 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary/80">
              <GitCompare className="h-4 w-4" />
              Side-by-side (each metric has its own scale)
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <p className="mb-2 font-mono text-xs text-muted-foreground">Revenue</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={revenueData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_STYLE.grid.stroke} horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => formatCurrencyFull(v)} tick={CHART_STYLE.tick} />
                    <YAxis type="category" dataKey="period" width={40} tick={CHART_STYLE.tick} />
                    <Tooltip contentStyle={CHART_STYLE.tooltip} formatter={(v: number) => [formatCurrencyFull(v), null]} />
                    <Bar dataKey="value" radius={[0, 0, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <p className="mb-2 font-mono text-xs text-muted-foreground">Orders</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={ordersData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_STYLE.grid.stroke} horizontal={false} />
                    <XAxis type="number" tick={CHART_STYLE.tick} />
                    <YAxis type="category" dataKey="period" width={40} tick={CHART_STYLE.tick} />
                    <Tooltip contentStyle={CHART_STYLE.tooltip} />
                    <Bar dataKey="value" radius={[0, 0, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <p className="mb-2 font-mono text-xs text-muted-foreground">New customers</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={customersData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_STYLE.grid.stroke} horizontal={false} />
                    <XAxis type="number" tick={CHART_STYLE.tick} allowDecimals={false} />
                    <YAxis type="category" dataKey="period" width={40} tick={CHART_STYLE.tick} />
                    <Tooltip contentStyle={CHART_STYLE.tooltip} />
                    <Bar dataKey="value" radius={[0, 0, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
