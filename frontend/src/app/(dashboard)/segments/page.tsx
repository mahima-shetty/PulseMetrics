"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PieChart, Users } from "lucide-react";
import { segmentsApi } from "@/lib/api";
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const COLORS = ["#00fff5", "#00ff88", "#ff00ff", "#b946ff"];

export default function SegmentsPage() {
  const [data, setData] = useState<{
    segments: {
      name: string;
      customer_count: number;
      customers: { id: string; name: string; email: string; recency: number; frequency: number; monetary: number }[];
    }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await segmentsApi.list();
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load segments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const pieData = data?.segments?.map((s) => ({ name: s.name, value: s.customer_count })) ?? [];

  if (loading) {
    return (
      <div className="space-y-6">
        <header className="border-b border-primary/20 pb-6">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary/60">ML Module</p>
          <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-primary">
            Customer Segments
          </h1>
        </header>
        <div className="flex h-64 items-center justify-center font-mono text-muted-foreground">
          Loading segments...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="border-b border-primary/20 pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary/60">ML Module</p>
        <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-primary">
          Customer Segments
        </h1>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          Group customers by recency, frequency, and spend — Champions, Loyal, At-Risk, Lost
        </p>
      </header>

      {error && (
        <div className="border border-destructive/50 bg-destructive/10 p-4 font-mono text-sm text-destructive">
          {error}
        </div>
      )}

      {data?.segments?.length === 0 ? (
        <div className="flex h-48 items-center justify-center border border-primary/20 bg-card/30 font-mono text-muted-foreground">
          Add at least 2 customers with order history to see segments.
        </div>
      ) : (
        <>
          {/* Pie chart */}
          {pieData.length > 0 && (
            <div className="relative overflow-hidden rounded-none border border-primary/20 bg-card/30 p-6 hud-panel">
              <div className="hud-corner hud-corner-tl" />
              <div className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary/80">
                <PieChart className="h-4 w-4" />
                Segment distribution
              </div>
              <p className="mb-4 font-mono text-xs text-muted-foreground">
                Champions = best customers · Loyal = regular buyers · At-Risk = slipping · Lost = inactive
              </p>
              <ResponsiveContainer width="100%" height={240}>
                <RechartsPie>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(240 12% 8%)",
                      border: "1px solid hsl(180 100% 50% / 0.3)",
                      borderRadius: 0,
                    }}
                  />
                  <Legend />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          )}

          {/* Segment cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {data?.segments?.map((segment, i) => (
              <div
                key={segment.name}
                className="relative overflow-hidden rounded-none border border-primary/20 bg-card/30 p-6 hud-panel"
              >
                <div className="hud-corner hud-corner-tl" />
                <div className="mb-3 flex items-center justify-between">
                  <span
                    className="font-mono text-xs uppercase tracking-widest"
                    style={{ color: COLORS[i % COLORS.length] }}
                  >
                    {segment.name}
                  </span>
                  <span className="font-mono text-lg font-bold tabular-nums text-primary">
                    {segment.customer_count}
                  </span>
                </div>
                <div className="space-y-1 font-mono text-xs text-muted-foreground">
                  {segment.customers.slice(0, 5).map((c) => (
                    <Link
                      key={c.id}
                      href={`/customers/${c.id}`}
                      className="block truncate text-foreground/80 hover:text-primary"
                    >
                      {c.name}
                    </Link>
                  ))}
                  {segment.customers.length > 5 && (
                    <span className="text-muted-foreground">+{segment.customers.length - 5} more</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Detailed tables per segment */}
          <div className="space-y-6">
            {data?.segments?.map((segment) => (
              <div
                key={segment.name}
                className="relative overflow-hidden rounded-none border border-primary/20 bg-card/30 p-6 hud-panel"
              >
                <div className="hud-corner hud-corner-tl" />
                <div className="mb-4 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary/80">
                  <Users className="h-4 w-4" />
                  {segment.name} ({segment.customer_count})
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full font-mono text-xs">
                    <thead>
                      <tr className="border-b border-primary/20 text-left text-muted-foreground">
                        <th className="py-2 pr-4">Name</th>
                        <th className="py-2 pr-4">Email</th>
                        <th className="py-2 pr-4 text-right" title="Days since last order">Days since order</th>
                        <th className="py-2 pr-4 text-right" title="Number of orders">Orders</th>
                        <th className="py-2 pr-4 text-right" title="Total amount spent">Total spend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {segment.customers.map((c) => (
                        <tr key={c.id} className="border-b border-primary/10">
                          <td className="py-2 pr-4">
                            <Link href={`/customers/${c.id}`} className="text-primary hover:underline">
                              {c.name}
                            </Link>
                          </td>
                          <td className="py-2 pr-4 text-muted-foreground">{c.email}</td>
                          <td className="py-2 pr-4 text-right tabular-nums">{c.recency}d</td>
                          <td className="py-2 pr-4 text-right tabular-nums">{c.frequency}</td>
                          <td className="py-2 pr-4 text-right tabular-nums">
                            ${c.monetary.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
