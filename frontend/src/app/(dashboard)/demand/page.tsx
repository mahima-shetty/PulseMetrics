"use client";

import { useEffect, useState } from "react";
import { BarChart3, Package } from "lucide-react";
import { demandApi } from "@/lib/api";
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
import { formatChartDate } from "@/lib/chart-utils";

const COLORS = ["#00fff5", "#ff00ff", "#b946ff"];

export default function DemandPage() {
  const [data, setData] = useState<{
    products: {
      product: string;
      historical: { date: string; quantity: number }[];
      predicted: { date: string; predicted_quantity: number }[];
      message?: string;
    }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await demandApi.list(days);
      setData(res);
      if (res.products.length > 0) {
        const valid = res.products.some((p) => p.product === selectedProduct);
        if (!valid) setSelectedProduct(res.products[0].product);
      } else {
        setSelectedProduct(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load demand forecast");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [days]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentProduct = data?.products?.find((p) => p.product === selectedProduct) ?? data?.products?.[0];
  const chartData = currentProduct
    ? [
        ...(currentProduct.historical?.map((h) => ({
          date: h.date,
          quantity: h.quantity,
          predicted_quantity: undefined as number | undefined,
        })) ?? []),
        ...(currentProduct.predicted?.map((p) => ({
          date: p.date,
          quantity: undefined as number | undefined,
          predicted_quantity: p.predicted_quantity,
        })) ?? []),
      ].sort((a, b) => a.date.localeCompare(b.date))
    : [];

  const totalPredicted = currentProduct?.predicted?.reduce((s, p) => s + p.predicted_quantity, 0) ?? 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <header className="border-b border-primary/20 pb-6">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary/60">ML Module</p>
          <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-primary">
            Demand Forecast
          </h1>
        </header>
        <div className="flex h-64 items-center justify-center font-mono text-muted-foreground">
          Loading...
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
            Demand Forecast
          </h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            Expected units sold per product — plan inventory and restock
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">Product:</span>
            <select
              value={selectedProduct ?? ""}
              onChange={(e) => setSelectedProduct(e.target.value || null)}
              className="border border-primary/30 bg-background px-3 py-1 font-mono text-xs text-foreground"
            >
              <option value="">—</option>
              {data?.products?.map((p) => (
                <option key={p.product} value={p.product}>
                  {p.product}
                </option>
              ))}
            </select>
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
        </div>
      </header>

      {error && (
        <div className="border border-destructive/50 bg-destructive/10 p-4 font-mono text-sm text-destructive">
          {error}
        </div>
      )}

      {data?.products?.length === 0 ? (
        <div className="relative overflow-hidden rounded-none border border-primary/20 bg-card/30 p-8 hud-panel">
          <div className="hud-corner hud-corner-tl" />
          <div className="flex flex-col items-center justify-center gap-2 font-mono text-muted-foreground">
            <Package className="h-12 w-12 text-primary/50" />
            <p>No product data available.</p>
            <p className="text-xs">Add orders to see demand forecasts.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between border border-primary/20 bg-card/30 px-6 py-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-6 w-6 text-primary" />
              <span className="font-mono text-xs uppercase text-muted-foreground">
                Predicted demand ({days}d) — {currentProduct?.product ?? ""}
              </span>
            </div>
            <span className="font-mono text-2xl font-bold tabular-nums text-primary">
              {totalPredicted.toLocaleString(undefined, { maximumFractionDigits: 1 })}
            </span>
          </div>

          {currentProduct?.message && (
            <div className="border border-primary/30 bg-primary/5 p-4 font-mono text-sm text-primary">
              {currentProduct.message}
            </div>
          )}

          <div className="relative overflow-hidden rounded-none border border-primary/20 bg-card/30 p-6 hud-panel">
            <div className="hud-corner hud-corner-tl" />
            <div className="mb-4 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary/80">
              <Package className="h-4 w-4" />
              Units sold — actual vs predicted
            </div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={chartData}>
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
                  <Line type="monotone" dataKey="quantity" stroke={COLORS[0]} name="Actual" dot={false} strokeWidth={2} />
                  <Line
                    type="monotone"
                    dataKey="predicted_quantity"
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
                Need at least 3 days of data for this product.
              </div>
            )}
          </div>

          <div className="relative overflow-hidden rounded-none border border-primary/20 bg-card/30 p-6 hud-panel">
            <div className="hud-corner hud-corner-tl" />
            <div className="mb-4 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary/80">
              Top products by volume
            </div>
            <div className="flex flex-wrap gap-2">
              {data?.products?.map((p) => (
                <button
                  key={p.product}
                  onClick={() => setSelectedProduct(p.product)}
                  className={`border px-3 py-2 font-mono text-xs transition-colors ${
                    selectedProduct === p.product
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-primary/30 text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {p.product}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
