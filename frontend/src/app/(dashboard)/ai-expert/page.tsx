"use client";

import { useState } from "react";
import { Bot, Send, BookOpen } from "lucide-react";
import { aiExpertApi } from "@/lib/api";

type ResponseShape = {
  answer: string;
  sources: string[];
};

export default function AIExpertPage() {
  const [issue, setIssue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<ResponseShape | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = issue.trim();
    if (!text) return;
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const res = await aiExpertApi.ask(text);
      setResponse(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to get recommendations");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="border-b border-primary/20 pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary/60">AI Expert</p>
        <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-primary">
          Ask AI Expert
        </h1>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          Describe your business issue. Get expert recommendations using your real dashboard data + 5 reference business docs (RAG).
        </p>
      </header>

      <form onSubmit={submit} className="space-y-4">
          <textarea
          value={issue}
          onChange={(e) => setIssue(e.target.value)}
          placeholder="E.g. My revenue is declining and I don't know why. Customers seem to be churning..."
          disabled={loading}
          rows={4}
          className="min-h-[120px] min-w-0 w-full border border-primary/30 bg-background px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-60 resize-y"
        />
        <button
          type="submit"
          disabled={loading || !issue.trim()}
          className="flex items-center gap-2 border border-primary bg-primary/20 px-6 py-3 font-mono text-xs uppercase tracking-wider text-primary transition-colors hover:bg-primary/30 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {loading ? "Generating..." : "Get Recommendations"}
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
              <Bot className="h-4 w-4" />
              Recommendations
            </div>
            <div className="prose prose-invert prose-sm max-w-none font-mono text-foreground whitespace-pre-wrap">
              {response.answer}
            </div>
          </div>

          {response.sources && response.sources.length > 0 && (
            <div className="relative overflow-hidden rounded-none border border-primary/20 bg-card/30 p-4 hud-panel">
              <div className="hud-corner hud-corner-tl" />
              <div className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary/80">
                <BookOpen className="h-4 w-4" />
                Sources
              </div>
              <div className="flex flex-wrap gap-2">
                {response.sources.map((s) => (
                  <span
                    key={s}
                    className="border border-primary/30 px-2 py-1 font-mono text-xs text-muted-foreground"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!response && !loading && (
        <div className="relative overflow-hidden rounded-none border border-primary/20 bg-card/30 p-8 hud-panel">
          <div className="hud-corner hud-corner-tl" />
          <div className="flex flex-col items-center justify-center gap-2 font-mono text-muted-foreground">
            <Bot className="h-12 w-12 text-primary/50" />
            <p>Describe your business issue above.</p>
            <p className="text-xs text-center max-w-md">
              Uses your real metrics (revenue, orders, segments, at-risk, alerts) + reference docs. Expert tactics to improve sales.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
