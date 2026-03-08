"use client";

import { useState } from "react";
import { Sparkles, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { aiApi, reportApi } from "@/lib/api";

export default function AIInsightsPage() {
  const [insights, setInsights] = useState<string | null>(null);
  const [report, setReport] = useState<string | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  const generateInsights = async () => {
    setInsightsLoading(true);
    setInsights(null);
    try {
      const res = await aiApi.generateInsights();
      setInsights(res.insights);
    } catch (e) {
      setInsights("Error: " + (e instanceof Error ? e.message : "Failed to generate"));
    } finally {
      setInsightsLoading(false);
    }
  };

  const generateReport = async () => {
    setReportLoading(true);
    setReport(null);
    try {
      const res = await reportApi.generate();
      setReport(res.report);
    } catch (e) {
      setReport("Error: " + (e instanceof Error ? e.message : "Failed to generate"));
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="border-b border-primary/20 pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary/60">AI Module</p>
        <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-primary">
          AI Insights
        </h1>
      </header>

      <div className="relative overflow-hidden rounded-none border-2 border-primary/30 bg-black/30 p-6 hud-panel">
        <div className="hud-corner hud-corner-tl" />
        <div className="hud-corner hud-corner-br" />
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-mono text-xs uppercase tracking-widest text-primary">
              Business Insights
            </span>
          </div>
          <Button
            onClick={generateInsights}
            disabled={insightsLoading}
            className="font-mono text-xs"
          >
            {insightsLoading ? "RUNNING..." : "GENERATE"}
          </Button>
        </div>
        <div className="min-h-[140px] font-mono text-sm leading-relaxed">
          {insights ? (
            <p className="whitespace-pre-wrap text-foreground/90">{insights}</p>
          ) : (
            <p className="text-muted-foreground">
              &gt; Click GENERATE for AI analysis of sales, revenue, customers, products...
            </p>
          )}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-none border-2 border-primary/30 bg-black/30 p-6 hud-panel">
        <div className="hud-corner hud-corner-tl" />
        <div className="hud-corner hud-corner-br" />
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <span className="font-mono text-xs uppercase tracking-widest text-primary">
              Weekly Report
            </span>
          </div>
          <Button
            onClick={generateReport}
            disabled={reportLoading}
            className="font-mono text-xs"
          >
            {reportLoading ? "RUNNING..." : "GENERATE"}
          </Button>
        </div>
        <div className="min-h-[140px] font-mono text-sm leading-relaxed">
          {report ? (
            <div
              className="whitespace-pre-wrap text-foreground/90"
              dangerouslySetInnerHTML={{
                __html: report
                  .replace(/^# (.*$)/gim, '<h2 class="text-lg font-bold mt-4 text-primary">$1</h2>')
                  .replace(/^## (.*$)/gim, '<h3 class="text-base font-semibold mt-3">$1</h3>')
                  .replace(/\*\*(.*?)\*\*/g, "<strong class='text-primary'>$1</strong>")
                  .replace(/\n/g, "<br />"),
              }}
            />
          ) : (
            <p className="text-muted-foreground">
              &gt; Click GENERATE for automated weekly report...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
