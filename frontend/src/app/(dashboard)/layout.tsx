"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { MobileNavProvider } from "@/contexts/MobileNavContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileHeader } from "@/components/layout/MobileHeader";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent shadow-[0_0_20px_hsl(180_100%_50%_/_0.4)]" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <MobileNavProvider>
      <div className="min-h-screen">
        <Sidebar />
        <main className="pl-0 lg:pl-56">
          <MobileHeader />
          <header className="hidden lg:flex sticky top-0 z-30 h-16 items-center justify-end border-b border-primary/20 bg-background/95 px-6 backdrop-blur shadow-[0_0_30px_hsl(180_100%_50%_/_0.04)]" />
          <div className="p-4 sm:p-6">{children}</div>
        </main>
      </div>
    </MobileNavProvider>
  );
}
