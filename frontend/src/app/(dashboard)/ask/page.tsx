"use client";

import { useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { askApi } from "@/lib/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

const CHART_COLOR = "#00fff5";

type ResponseShape = {
  answer: string;
  data?: unknown;
  chart_type?: string | null;
};

export default function AskPage() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<ResponseShape | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const res = await askApi.ask(q);
      setResponse(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to get answer");
    } finally {
      setLoading(false);
    }
  };

  const chartData = Array.isArray(response?.data) ? response!.data : [];
  const chartType = response?.chart_type ?? null;
  const isRevenueChart = chartType === "revenue_chart";
  const isOrdersChart = chartType === "orders_chart";
  const isTable = !chartType && Array.isArray(response?.data) && response!.data.length > 0;
  const tableRows = isTable ? (response!.data as Record<string, unknown>[]) : [];
  const tableKeys = tableRows.length > 0 ? Object.keys(tableRows[0]) : [];

  return (
    <div className="space-y-6">
      <header className="border-b border-primary/20 pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary/60">ML Module</p>
        <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-primary">
          Ask Data
        </h1>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          Ask questions in plain language. Try: &quot;What&apos;s my total revenue?&quot;, &quot;Top 5 products&quot;, &quot;List orders&quot;, &quot;Customer segments&quot;, &quot;At-risk customers&quot;, &quot;Alerts&quot;, &quot;LTV&quot;
        </p>
      </header>

      <form onSubmit={submit} className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question..."
          disabled={loading}
          className="flex-1 border border-primary/30 bg-background px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="flex items-center gap-2 border border-primary bg-primary/20 px-6 py-3 font-mono text-xs uppercase tracking-wider text-primary transition-colors hover:bg-primary/30 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {loading ? "..." : "Ask"}
        </button>
      </form>

      {error && (
        <div className="border border-destructive/50 bg-destructive/10 p-4 font-mono text-sm text-destructive">
          {error}
        </div>
      )}

      {response && (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-none border border-primary/20 bg-card/30 p-6 hud-panel">
            <div className="hud-corner hud-corner-tl" />
            <div className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary/80">
              <MessageSquare className="h-4 w-4" />
              Answer
            </div>
            <p className="font-mono text-sm text-foreground">{response.answer}</p>
          </div>

          {isRevenueChart && chartData.length > 0 && (
            <div className="relative overflow-hidden rounded-none border border-primary/20 bg-card/30 p-6 hud-panel">
              <div className="hud-corner hud-corner-tl" />
              <div className="mb-4 font-mono text-xs uppercase tracking-widest text-primary/80">
                Revenue over time
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
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
                  <Bar dataKey="revenue" fill={CHART_COLOR} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {isOrdersChart && chartData.length > 0 && (
            <div className="relative overflow-hidden rounded-none border border-primary/20 bg-card/30 p-6 hud-panel">
              <div className="hud-corner hud-corner-tl" />
              <div className="mb-4 font-mono text-xs uppercase tracking-widest text-primary/80">
                Orders over time
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
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
                  <Line type="monotone" dataKey="orders" stroke={CHART_COLOR} dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {isTable && tableRows.length > 0 && (
            <div className="relative overflow-hidden rounded-none border border-primary/20 bg-card/30 p-6 hud-panel">
              <div className="hud-corner hud-corner-tl" />
              <div className="mb-4 font-mono text-xs uppercase tracking-widest text-primary/80">
                Data
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse font-mono text-xs">
                  <thead>
                    <tr className="border-b border-primary/30">
                      {tableKeys.map((k) => (
                        <th key={k} className="px-4 py-2 text-left text-primary/80">
                          {k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((row, i) => (
                      <tr key={i} className="border-b border-primary/10">
                        {tableKeys.map((k) => (
                          <td key={k} className="max-w-[200px] truncate px-4 py-2 text-foreground" title={typeof row[k] === "string" ? (row[k] as string) : undefined}>
                            {typeof row[k] === "number"
                              ? (row[k] as number).toLocaleString()
                              : row[k] !== null && row[k] !== undefined && typeof row[k] === "object"
                                ? JSON.stringify(row[k])
                                : String(row[k] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {response.data && typeof response.data === "object" && !Array.isArray(response.data) && (
            <div className="relative overflow-hidden rounded-none border border-primary/20 bg-card/30 p-6 hud-panel">
              <div className="hud-corner hud-corner-tl" />
              <div className="mb-4 font-mono text-xs uppercase tracking-widest text-primary/80">
                Details
              </div>
              <pre className="overflow-x-auto font-mono text-xs text-foreground">
                {JSON.stringify(response.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {!response && !loading && (
        <div className="relative overflow-hidden rounded-none border border-primary/20 bg-card/30 p-8 hud-panel">
          <div className="hud-corner hud-corner-tl" />
          <div className="flex flex-col items-center justify-center gap-2 font-mono text-muted-foreground">
            <MessageSquare className="h-12 w-12 text-primary/50" />
            <p>Ask a question above to get started.</p>
            <p className="text-xs">Examples: total revenue, top products, list orders, customer segments, at-risk customers</p>
          </div>
        </div>
      )}
    </div>
  );
}
