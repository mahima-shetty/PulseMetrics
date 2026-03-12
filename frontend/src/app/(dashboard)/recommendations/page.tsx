"use client";

import { useEffect, useState } from "react";
import { Repeat, Package, Users } from "lucide-react";
import { recommendationsApi } from "@/lib/api";

export default function RecommendationsPage() {
  const [data, setData] = useState<{
    recommendations: {
      product: string;
      also_bought: { product: string; strength: number }[];
    }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [minCustomers, setMinCustomers] = useState(2);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await recommendationsApi.list(minCustomers);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load recommendations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [minCustomers]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="space-y-6">
        <header className="border-b border-primary/20 pb-6">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary/60">ML Module</p>
          <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-primary">
            Recommendations
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
            Recommendations
          </h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            Product bundles — what customers buy together
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs text-muted-foreground">
            Show pairs bought by at least:
          </span>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 5].map((n) => (
              <button
                key={n}
                onClick={() => setMinCustomers(n)}
                className={`flex items-center gap-1 border px-3 py-1 font-mono text-xs transition-colors ${
                  minCustomers === n ? "border-primary bg-primary/10 text-primary" : "border-primary/30 text-muted-foreground hover:border-primary/50"
                }`}
                title={`Show pairs bought by at least ${n} customer${n > 1 ? "s" : ""}`}
              >
                <Users className="h-3 w-3" />
                {n}+
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

      <div className="rounded-none border border-primary/20 bg-primary/5 p-4 font-mono text-xs text-muted-foreground">
        <strong className="text-primary">How it works:</strong> For each product, we show what else customers bought. Use this for cross-sell (e.g. &quot;Customers who bought X also bought Y&quot;). Raise the filter to show only strong patterns.
      </div>

      {data?.recommendations?.length === 0 ? (
        <div className="relative overflow-hidden rounded-none border border-primary/20 bg-card/30 p-8 hud-panel">
          <div className="hud-corner hud-corner-tl" />
          <div className="flex flex-col items-center justify-center gap-3 font-mono text-muted-foreground">
            <Repeat className="h-12 w-12 text-primary/50" />
            <p className="font-medium">No recommendations found.</p>
            <p className="max-w-md text-center text-xs">
              Try &quot;1+&quot; or add more orders so customers buy multiple products.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data?.recommendations?.map((rec) => (
            <div
              key={rec.product}
              className="relative overflow-hidden rounded-none border border-primary/20 bg-card/30 p-6 hud-panel"
            >
              <div className="hud-corner hud-corner-tl" />
              <div className="mb-3 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary/80">
                <Package className="h-4 w-4" />
                {rec.product}
              </div>
              <div className="space-y-2 font-mono text-sm">
                <span className="text-muted-foreground">Often bought with:</span>
                <ul className="space-y-1.5">
                  {rec.also_bought.map((ab) => (
                    <li
                      key={ab.product}
                      className="flex items-center justify-between gap-2 border-b border-primary/10 pb-1 last:border-0"
                    >
                      <span className="text-foreground/90">{ab.product}</span>
                      <span
                        className="shrink-0 tabular-nums text-primary"
                        title={`${ab.strength} customer${ab.strength !== 1 ? "s" : ""} bought both`}
                      >
                        {ab.strength} customer{ab.strength !== 1 ? "s" : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
