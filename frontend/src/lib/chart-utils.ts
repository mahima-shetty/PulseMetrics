/**
 * Shared formatters for Recharts visualizations.
 */

export function formatChartDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

export function formatCurrency(value: number): string {
  if (value == null || !Number.isFinite(value)) return "";
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`;
  }
  return `$${Math.round(value).toLocaleString()}`;
}

export function formatCurrencyFull(value: number): string {
  if (value == null || !Number.isFinite(value)) return "$0";
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}
