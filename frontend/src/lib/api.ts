// Use /api proxy (same-origin) to avoid CORS. Fallback for SSR/build.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

let refreshing = false;

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

function getHeaders(body?: unknown): HeadersInit {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (body instanceof FormData) {
    return headers;
  }
  headers["Content-Type"] = "application/json";
  return headers;
}

function clearAuthAndRedirect() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    window.location.href = "/login";
  }
}

async function refreshTokens(): Promise<boolean> {
  const refreshToken = typeof window !== "undefined" ? localStorage.getItem("refresh_token") : null;
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { body?: BodyInit } = {},
  isRetry = false
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { ...getHeaders(options.body), ...(options.headers || {}) },
    });
  } catch (e) {
    const msg = e instanceof TypeError && e.message === "Failed to fetch"
      ? "Cannot connect to server. Make sure the backend is running on " + API_URL
      : e instanceof Error ? e.message : "Network error";
    throw new Error(msg);
  }

  if (res.status === 401 && !isRetry && path !== "/auth/refresh") {
    if (refreshing) {
      clearAuthAndRedirect();
      throw new Error("Unauthorized");
    }
    refreshing = true;
    const refreshed = await refreshTokens();
    refreshing = false;
    if (refreshed) {
      return apiFetch<T>(path, options, true);
    }
    clearAuthAndRedirect();
    throw new Error("Unauthorized");
  }

  if (res.status === 401) {
    clearAuthAndRedirect();
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as {
      detail?: string | { msg?: string }[];
      message?: string;
    };
    let message = `HTTP ${res.status}`;
    if (err.detail) {
      message = Array.isArray(err.detail)
        ? err.detail.map((e) => e.msg || JSON.stringify(e)).join(". ")
        : String(err.detail);
    } else if (err.message) {
      message = String(err.message);
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// Auth
export const authApi = {
  signup: (data: { email: string; password: string; full_name: string }) =>
    apiFetch<{ access_token: string; refresh_token: string }>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  login: (data: { email: string; password: string }) =>
    apiFetch<{ access_token: string; refresh_token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  me: () => apiFetch<{ id: string; email: string; full_name: string }>("/auth/me"),
};

// Dashboard
export const dashboardApi = {
  kpis: () => apiFetch<{ total_revenue: number; total_orders: number; total_customers: number; monthly_growth: number }>("/dashboard/kpis"),
  revenueChart: (days = 30) => apiFetch<{ date: string; revenue: number }[]>("/dashboard/revenue-chart?days=" + days),
  ordersChart: (days = 14) => apiFetch<{ date: string; orders: number }[]>("/dashboard/orders-chart?days=" + days),
  topProducts: (limit = 5) => apiFetch<{ product: string; revenue: number; quantity: number }[]>("/dashboard/top-products?limit=" + limit),
  recentOrders: (limit = 10) =>
    apiFetch<
      { id: string; order_id: string; product: string; price: number; quantity: number; total: number; purchase_date: string; customer_name: string }[]
    >("/dashboard/recent-orders?limit=" + limit),
  recentCustomers: (limit = 10) =>
    apiFetch<
      { id: string; name: string; email: string; company: string; total_purchases: number; created_at: string }[]
    >("/dashboard/recent-customers?limit=" + limit),
};

// Customers
export const customersApi = {
  list: (params?: { q?: string; page?: number; limit?: number }) => {
    const search = new URLSearchParams();
    if (params?.q) search.set("q", params.q);
    if (params?.page) search.set("page", String(params.page));
    if (params?.limit) search.set("limit", String(params.limit));
    return apiFetch<{ items: Customer[]; total: number; page: number; limit: number }>(
      "/customers?" + search.toString()
    );
  },
  get: (id: string) =>
    apiFetch<Customer & { orders: { id: string; order_id: string; product: string; price: number; quantity: number; purchase_date: string }[] }>(
      "/customers/" + id
    ),
  create: (data: { name: string; email: string; phone?: string; company?: string }) =>
    apiFetch<Customer>("/customers", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<{ name: string; email: string; phone: string; company: string }>) =>
    apiFetch<Customer>("/customers/" + id, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch<void>("/customers/" + id, { method: "DELETE" }),
  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiFetch<{ created: number; errors: string[] }>("/customers/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${getToken()}` },
      body: form,
    });
  },
};

// Orders
export const ordersApi = {
  list: (params?: { date_from?: string; date_to?: string; customer_id?: string; page?: number; limit?: number }) => {
    const search = new URLSearchParams();
    if (params?.date_from) search.set("date_from", params.date_from);
    if (params?.date_to) search.set("date_to", params.date_to);
    if (params?.customer_id) search.set("customer_id", params.customer_id);
    if (params?.page) search.set("page", String(params.page));
    if (params?.limit) search.set("limit", String(params.limit));
    return apiFetch<{ items: Order[]; total: number; page: number; limit: number }>(
      "/orders?" + search.toString()
    );
  },
  create: (data: { customer_id: string; product: string; price: number; quantity: number; purchase_date: string }) =>
    apiFetch<Order>("/orders", { method: "POST", body: JSON.stringify(data) }),
  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiFetch<{ created: number; errors: string[] }>("/orders/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${getToken()}` },
      body: form,
    });
  },
};

// AI Insights
export const aiApi = {
  generateInsights: () =>
    apiFetch<{ insights: string; metrics: unknown }>("/ai-insights/generate", { method: "POST" }),
};

// Predictions
export const predictionsApi = {
  revenue: (days = 30) =>
    apiFetch<{
      historical: { date: string; revenue: number }[];
      predicted: { date: string; predicted_revenue: number }[];
      message?: string;
    }>("/predictions/revenue?days=" + days),
  orders: (days = 30) =>
    apiFetch<{
      historical: { date: string; order_count: number }[];
      predicted: { date: string; predicted_orders: number }[];
      message?: string;
    }>("/predictions/orders?days=" + days),
  summary: (days = 30) =>
    apiFetch<{
      revenue: { historical: { date: string; revenue: number }[]; predicted: { date: string; predicted_revenue: number }[]; message?: string };
      orders: { historical: { date: string; order_count: number }[]; predicted: { date: string; predicted_orders: number }[]; message?: string };
      model_info: { algorithm: string; features: string[] };
    }>("/predictions/summary?days=" + days),
};

// Weekly Report
export const reportApi = {
  generate: () =>
    apiFetch<{ report: string; format: string; generated_at: string }>("/weekly-report", { method: "POST" }),
};

// Smart Alerts
export const alertsApi = {
  list: (revenueDropPct = 30, inactiveDays = 60) =>
    apiFetch<{
      alerts: {
        id: string;
        type: string;
        message: string;
        severity: "high" | "medium";
        data: Record<string, unknown>;
      }[];
    }>("/alerts?revenue_drop_pct=" + revenueDropPct + "&inactive_days=" + inactiveDays),
};

// LTV (Lifetime Value)
export const ltvApi = {
  list: (limit = 50) =>
    apiFetch<{
      customers: {
        id: string;
        name: string;
        email: string;
        historical_ltv: number;
        order_count: number;
        predicted_ltv_6m: number;
        predicted_ltv_12m: number;
      }[];
    }>("/ltv?limit=" + limit),
};

// Recommendations (also bought)
export const recommendationsApi = {
  list: (minCustomers = 2) =>
    apiFetch<{
      recommendations: {
        product: string;
        also_bought: { product: string; strength: number }[];
      }[];
    }>("/recommendations?min_customers=" + minCustomers),
};

// Demand (per-product forecast)
export const demandApi = {
  list: (days = 30, product?: string) => {
    const params = new URLSearchParams();
    params.set("days", String(days));
    if (product) params.set("product", product);
    return apiFetch<{
      products: {
        product: string;
        historical: { date: string; quantity: number }[];
        predicted: { date: string; predicted_quantity: number }[];
        message?: string;
      }[];
    }>("/demand?" + params.toString());
  },
};

// Anomalies
export const anomaliesApi = {
  list: (days = 30) =>
    apiFetch<{
      anomalies: {
        date: string;
        type: "revenue" | "orders";
        actual: number;
        expected: number;
        deviation_pct: number;
      }[];
    }>("/anomalies?days=" + days),
};

// At-Risk (Churn)
export const atRiskApi = {
  list: (days = 60) =>
    apiFetch<{
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
    }>("/at-risk?days=" + days),
};

// Ask Data (natural language)
export const askApi = {
  ask: (question: string) =>
    apiFetch<{
      answer: string;
      data?: unknown;
      chart_type?: string | null;
    }>("/ask", {
      method: "POST",
      body: JSON.stringify({ question }),
    }),
};

// Ask AI Expert (RAG with business docs)
export const aiExpertApi = {
  ask: (issue: string) =>
    apiFetch<{
      answer: string;
      sources: string[];
    }>("/ai-expert/ask", {
      method: "POST",
      body: JSON.stringify({ issue }),
    }),
};

// Period Comparison
export const comparisonApi = {
  get: (mode: "month" | "week" = "month") =>
    apiFetch<{
      mode: string;
      period_label: string;
      this_period_start: string;
      prev_period_start: string;
      prev_period_end: string;
      revenue: { this: number; prev: number; change_pct: number };
      orders: { this: number; prev: number; change_pct: number };
      new_customers: { this: number; prev: number; change_pct: number };
    }>("/comparison?mode=" + mode),
};

// Segments (RFM + K-means)
export const segmentsApi = {
  list: () =>
    apiFetch<{
      segments: {
        name: string;
        customer_count: number;
        customers: { id: string; name: string; email: string; recency: number; frequency: number; monetary: number }[];
      }[];
    }>("/segments"),
};

// Seed
export const seedApi = {
  demoData: () =>
    apiFetch<{ customers_created: number; orders_created: number }>("/seed/demo-data", { method: "POST" }),
};

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  total_purchases: number;
  last_purchase_date: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  order_id: string;
  customer_id: string;
  customer_name?: string;
  product: string;
  price: number;
  quantity: number;
  purchase_date: string;
  created_at: string;
}
