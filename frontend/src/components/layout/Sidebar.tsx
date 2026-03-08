"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  LogOut,
  PieChart,
  AlertTriangle,
  Activity,
  BarChart3,
  Repeat,
  Banknote,
  Bell,
  MessageSquare,
  Bot,
  GitCompare,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useMobileNav } from "@/contexts/MobileNavContext";

const nav = [
  { href: "/dashboard", label: "DASHBOARD", icon: LayoutDashboard },
  { href: "/customers", label: "CUSTOMERS", icon: Users },
  { href: "/orders", label: "ORDERS", icon: ShoppingCart },
  { href: "/predictions", label: "PREDICTIONS", icon: TrendingUp },
  { href: "/comparison", label: "PERIOD COMPARE", icon: GitCompare },
  { href: "/segments", label: "SEGMENTS", icon: PieChart },
  { href: "/at-risk", label: "CHURN RISK", icon: AlertTriangle },
  { href: "/anomalies", label: "ANOMALIES", icon: Activity },
  { href: "/demand", label: "DEMAND", icon: BarChart3 },
  { href: "/recommendations", label: "BUNDLES", icon: Repeat },
  { href: "/ltv", label: "LIFETIME VALUE", icon: Banknote },
  { href: "/alerts", label: "ALERTS", icon: Bell },
  { href: "/ask", label: "ASK DATA", icon: MessageSquare },
  { href: "/ai-expert", label: "ASK AI EXPERT", icon: Bot },
  { href: "/ai-insights", label: "AI INSIGHTS", icon: Sparkles },
];

function NavContent({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-4">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onLinkClick}
            className={cn(
              "flex items-center gap-3 border-l-2 px-4 py-3 font-mono text-xs tracking-wider transition-all",
              pathname === item.href
                ? "border-primary bg-primary/10 text-primary"
                : "border-transparent text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="border-t border-primary/20 p-4">
        <Button
          variant="ghost"
          className="w-full justify-start font-mono text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          onClick={logout}
        >
          <LogOut className="mr-3 h-4 w-4 shrink-0" />
          LOGOUT
        </Button>
      </div>
    </>
  );
}

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useMobileNav();

  return (
    <>
      {/* Desktop sidebar - hidden on mobile */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 hidden h-screen w-56 flex-col border-r border-primary/20 bg-background",
          "lg:flex"
        )}
      >
        <div className="flex h-16 shrink-0 items-center border-b border-primary/20 px-4 lg:px-6">
          <Link href="/dashboard" className="font-display text-lg font-bold tracking-wider text-primary">
            PULSEMETRICS
          </Link>
        </div>
        <NavContent />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-72 max-w-[85vw] flex-col border-r border-primary/20 bg-background shadow-xl transition-transform duration-200 ease-out",
          "lg:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-primary/20 px-4">
          <Link
            href="/dashboard"
            className="font-display text-base font-bold tracking-wider text-primary"
            onClick={() => setSidebarOpen(false)}
          >
            PULSEMETRICS
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <NavContent onLinkClick={() => setSidebarOpen(false)} />
      </aside>
    </>
  );
}
