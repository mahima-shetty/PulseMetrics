"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, User } from "lucide-react";
import { atRiskApi } from "@/lib/api";

export default function AtRiskPage() {
  const [data, setData] = useState<{
    customers: {
      id: string;
      name: string;
      email: string;
      days_since_order: number;
      last_purchase_date: string | null;
      order_count: number;
      total_purchases: number;
      score: number;
      reason: string;
    }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(60);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await atRiskApi.list(days);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load at-risk customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [days]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="space-y-6">
        <header className="border-b border-primary/20 pb-6">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary/60">ML Module</p>
          <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-primary">
            At-Risk Customers
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
            At-Risk Customers
          </h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            Customers with no orders recently — reach out before they leave
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">No orders in last:</span>
          {[30, 60, 90].map((d) => (
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

      {data?.customers?.length === 0 ? (
        <div className="relative overflow-hidden rounded-none border border-primary/20 bg-card/30 p-8 hud-panel">
          <div className="hud-corner hud-corner-tl" />
          <div className="flex flex-col items-center justify-center gap-2 font-mono text-muted-foreground">
            <AlertTriangle className="h-12 w-12 text-primary/50" />
            <p>No at-risk customers found.</p>
            <p className="text-xs">All customers have ordered within the last {days} days.</p>
            <p className="mt-2 max-w-md text-center text-xs">
              Try 30 days, or load sample data from the dashboard if you have little data.
            </p>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-none border border-primary/20 bg-card/30 p-6 hud-panel">
          <div className="hud-corner hud-corner-tl" />
          <div className="mb-4 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary/80">
            <AlertTriangle className="h-4 w-4" />
            Re-engage ({data?.customers?.length ?? 0})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-xs">
              <thead>
                <tr className="border-b border-primary/20 text-left text-muted-foreground">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4 text-right" title="0–100, higher = more likely to churn">Risk</th>
                  <th className="py-2 pr-4 text-right">Days since order</th>
                  <th className="py-2 pr-4 text-right">Last Order</th>
                  <th className="py-2 pr-4 text-right">Total Spend</th>
                  <th className="py-2 pr-4 max-w-[200px]">Reason</th>
                  <th className="py-2 pr-4"></th>
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
                    <td className="py-2 pr-4 text-muted-foreground">{c.email}</td>
                    <td className="py-2 pr-4 text-right">
                      <span
                        className={`tabular-nums ${
                          c.score >= 70 ? "text-destructive" : c.score >= 40 ? "text-amber-500" : "text-muted-foreground"
                        }`}
                      >
                        {c.score}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">{c.days_since_order}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {c.last_purchase_date
                        ? new Date(c.last_purchase_date).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      ${c.total_purchases.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="max-w-[200px] truncate py-2 pr-4 text-muted-foreground" title={c.reason}>
                      {c.reason}
                    </td>
                    <td className="py-2 pr-4">
                      <Link
                        href={`/customers/${c.id}`}
                        className="inline-flex items-center gap-1 border border-primary/30 px-2 py-1 font-mono text-xs text-primary hover:bg-primary/10"
                      >
                        <User className="h-3 w-3" />
                        Re-engage
                      </Link>
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
