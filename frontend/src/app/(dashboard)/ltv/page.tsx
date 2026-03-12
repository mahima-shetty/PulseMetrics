"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Banknote, DollarSign } from "lucide-react";
import { ltvApi } from "@/lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const COLORS = ["#00fff5", "#ff00ff", "#b946ff"];

export default function LTVPage() {
  const [data, setData] = useState<{
    customers: {
      id: string;
      name: string;
      email: string;
      historical_ltv: number;
      order_count: number;
      predicted_ltv_6m: number;
      predicted_ltv_12m: number;
    }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ltvApi.list();
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load LTV");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const chartData = data?.customers?.slice(0, 10).map((c) => ({
    name: c.name,
    fullName: c.name,
    historical: Math.round(c.historical_ltv),
    predicted_6m: Math.round(c.predicted_ltv_6m),
    predicted_12m: Math.round(c.predicted_ltv_12m),
    displayName: c.name.length > 20 ? c.name.slice(0, 20) + "…" : c.name,
  })) ?? [];

  if (loading) {
    return (
      <div className="space-y-6">
        <header className="border-b border-primary/20 pb-6">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary/60">ML Module</p>
          <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-primary">
            Lifetime Value (LTV)
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
      <header className="border-b border-primary/20 pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary/60">ML Module</p>
        <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-primary">
            Lifetime Value (LTV)
          </h1>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          Predicted spend per customer over next 6 and 12 months — use for marketing budget
        </p>
      </header>

      {error && (
        <div className="border border-destructive/50 bg-destructive/10 p-4 font-mono text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-none border border-primary/20 bg-primary/5 p-4 font-mono text-xs text-muted-foreground">
        <strong className="text-primary">How it works:</strong> Predicted LTV = (historical spend ÷ months as customer) × future months. Sorted by predicted 12m value.
      </div>

      {data?.customers?.length === 0 ? (
        <div className="relative overflow-hidden rounded-none border border-primary/20 bg-card/30 p-8 hud-panel">
          <div className="hud-corner hud-corner-tl" />
          <div className="flex flex-col items-center justify-center gap-2 font-mono text-muted-foreground">
            <Banknote className="h-12 w-12 text-primary/50" />
            <p>No customers with orders.</p>
            <p className="text-xs">Add orders to see LTV predictions.</p>
          </div>
        </div>
      ) : (
        <>
          {chartData.length > 0 && (
            <div className="relative overflow-hidden rounded-none border border-primary/20 bg-card/30 p-6 hud-panel">
              <div className="hud-corner hud-corner-tl" />
              <div className="mb-4 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary/80">
                <DollarSign className="h-4 w-4" />
                Top 10 by Predicted LTV (12m)
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 120, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(180 100% 50% / 0.1)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: "hsl(180 50% 60%)" }}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    domain={[0, "auto"]}
                  />
                  <YAxis
                    type="category"
                    dataKey="displayName"
                    width={115}
                    tick={{ fontSize: 11, fill: "hsl(180 50% 60%)" }}
                    interval={0}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(240 12% 8%)",
                      border: "1px solid hsl(180 100% 50% / 0.3)",
                      borderRadius: 0,
                    }}
                    formatter={(value, name) => [value != null ? `$${Number(value).toLocaleString()}` : "", name]}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ""}
                  />
                  <Legend />
                  <Bar
                    dataKey="predicted_12m"
                    fill={COLORS[2]}
                    name="Predicted 12m"
                    barSize={24}
                    radius={[0, 4, 4, 0]}
                  />
                  <Bar
                    dataKey="historical"
                    fill={COLORS[0]}
                    name="Historical (to date)"
                    barSize={24}
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="relative overflow-hidden rounded-none border border-primary/20 bg-card/30 p-6 hud-panel">
            <div className="hud-corner hud-corner-tl" />
            <div className="mb-4 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary/80">
              <Banknote className="h-4 w-4" />
              All Customers
            </div>
            <div className="overflow-x-auto">
              <table className="w-full font-mono text-xs">
                <thead>
                  <tr className="border-b border-primary/20 text-left text-muted-foreground">
                    <th className="py-2 pr-4">Customer</th>
                    <th className="py-2 pr-4 text-right">Orders</th>
                    <th className="py-2 pr-4 text-right">Historical</th>
                    <th className="py-2 pr-4 text-right">Pred. 6m</th>
                    <th className="py-2 pr-4 text-right">Pred. 12m</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.customers?.map((c) => (
                    <tr key={c.id} className="border-b border-primary/10">
                      <td className="py-2 pr-4">
                        <Link href={`/customers/${c.id}`} className="text-primary hover:underline">
                          {c.name}
                        </Link>
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">{c.order_count}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        ${c.historical_ltv.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums text-primary">
                        ${c.predicted_ltv_6m.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums text-primary">
                        ${c.predicted_ltv_12m.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
