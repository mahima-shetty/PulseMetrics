"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, DollarSign, Users, ShoppingCart } from "lucide-react";
import { alertsApi } from "@/lib/api";

export default function AlertsPage() {
  const [data, setData] = useState<{
    alerts: {
      id: string;
      type: string;
      message: string;
      severity: "high" | "medium";
      data: Record<string, unknown>;
    }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await alertsApi.list();
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const getIcon = (type: string) => {
    if (type === "revenue_drop") return DollarSign;
    if (type === "inactive_high_value") return Users;
    return ShoppingCart;
  };

  const getLink = (alert: { type: string; data: Record<string, unknown> }) => {
    if (alert.type === "inactive_high_value") return "/at-risk";
    if (alert.type === "revenue_drop" || alert.type === "order_drop") return "/dashboard";
    return null;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <header className="border-b border-primary/20 pb-6">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary/60">ML Module</p>
          <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-primary">
            Smart Alerts
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
          Smart Alerts
        </h1>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          Automatic alerts when revenue drops, top customers go quiet, or orders decline
        </p>
      </header>

      {error && (
        <div className="border border-destructive/50 bg-destructive/10 p-4 font-mono text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-none border border-primary/20 bg-primary/5 p-4 font-mono text-xs text-muted-foreground">
        <strong className="text-primary">What we watch:</strong> (1) Revenue down vs last week (2) Big spenders with no orders in 60+ days (3) Order count down vs last week
      </div>

      {data?.alerts?.length === 0 ? (
        <div className="relative overflow-hidden rounded-none border border-primary/20 bg-card/30 p-8 hud-panel">
          <div className="hud-corner hud-corner-tl" />
          <div className="flex flex-col items-center justify-center gap-2 font-mono text-muted-foreground">
            <Bell className="h-12 w-12 text-primary/50" />
            <p className="font-medium">All clear.</p>
            <p className="text-xs">No alerts triggered. Metrics are within expected ranges.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {data?.alerts?.map((alert) => {
            const Icon = getIcon(alert.type);
            const href = getLink(alert);
            return (
              <div
                key={alert.id}
                className={`relative overflow-hidden rounded-none border p-6 hud-panel ${
                  alert.severity === "high"
                    ? "border-destructive/50 bg-destructive/5"
                    : "border-primary/20 bg-card/30"
                }`}
              >
                <div className="hud-corner hud-corner-tl" />
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center ${
                        alert.severity === "high" ? "text-destructive" : "text-primary"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <span
                        className={`mb-1 inline-block font-mono text-xs uppercase tracking-wider ${
                          alert.severity === "high" ? "text-destructive" : "text-amber-500"
                        }`}
                      >
                        {alert.severity}
                      </span>
                      <p className="font-mono text-sm text-foreground">{alert.message}</p>
                    </div>
                  </div>
                  {href && (
                    <Link
                      href={href}
                      className="shrink-0 border border-primary/30 px-3 py-1.5 font-mono text-xs text-primary hover:bg-primary/10"
                    >
                      View
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
