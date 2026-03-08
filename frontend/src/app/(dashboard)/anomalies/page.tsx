"use client";

import { useEffect, useState } from "react";
import { Activity, TrendingDown, DollarSign, ShoppingCart } from "lucide-react";
import { anomaliesApi } from "@/lib/api";

export default function AnomaliesPage() {
  const [data, setData] = useState<{
    anomalies: {
      date: string;
      type: "revenue" | "orders";
      actual: number;
      expected: number;
      deviation_pct: number;
    }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await anomaliesApi.list(days);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load anomalies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [days]);

  if (loading) {
    return (
      <div className="space-y-6">
        <header className="border-b border-primary/20 pb-6">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary/60">ML Module</p>
          <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-primary">
            Anomaly Detection
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
            Anomaly Detection
          </h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            Revenue & order drops vs 7-day rolling baseline
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">Period:</span>
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

      {error && (
        <div className="border border-destructive/50 bg-destructive/10 p-4 font-mono text-sm text-destructive">
          {error}
        </div>
      )}

      {data?.anomalies?.length === 0 ? (
        <div className="relative overflow-hidden rounded-none border border-primary/20 bg-card/30 p-8 hud-panel">
          <div className="hud-corner hud-corner-tl" />
          <div className="flex flex-col items-center justify-center gap-2 font-mono text-muted-foreground">
            <Activity className="h-12 w-12 text-primary/50" />
            <p>No anomalies detected.</p>
            <p className="text-xs">Revenue and orders are within expected ranges for the last {days} days.</p>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-none border border-primary/20 bg-card/30 p-6 hud-panel">
          <div className="hud-corner hud-corner-tl" />
          <div className="mb-4 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary/80">
            <TrendingDown className="h-4 w-4" />
            Detected Anomalies ({data?.anomalies?.length ?? 0})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-xs">
              <thead>
                <tr className="border-b border-primary/20 text-left text-muted-foreground">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4 text-right">Actual</th>
                  <th className="py-2 pr-4 text-right">Expected</th>
                  <th className="py-2 pr-4 text-right">Drop</th>
                </tr>
              </thead>
              <tbody>
                {data?.anomalies?.map((a, i) => (
                  <tr key={i} className="border-b border-primary/10">
                    <td className="py-2 pr-4">{a.date}</td>
                    <td className="py-2 pr-4">
                      <span className="inline-flex items-center gap-1">
                        {a.type === "revenue" ? (
                          <DollarSign className="h-3 w-3 text-primary" />
                        ) : (
                          <ShoppingCart className="h-3 w-3 text-primary" />
                        )}
                        {a.type}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {a.type === "revenue"
                        ? `$${a.actual.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                        : a.actual}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {a.type === "revenue"
                        ? `$${a.expected.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                        : Math.round(a.expected)}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums text-destructive">
                      -{a.deviation_pct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
