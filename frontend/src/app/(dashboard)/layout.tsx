"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Sidebar } from "@/components/layout/Sidebar";
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
    <div className="min-h-screen">
      <Sidebar />
      <main className="pl-56">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-end border-b border-primary/20 bg-background/95 px-6 backdrop-blur shadow-[0_0_30px_hsl(180_100%_50%_/_0.04)]">
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
