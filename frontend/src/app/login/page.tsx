"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen">
      {/* Left: Brand / Visual */}
      <div className="hidden w-1/2 flex-col justify-between border-r border-primary/20 bg-card/30 p-12 lg:flex">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.4em] text-primary/60">PulseMetrics</p>
          <h1 className="font-display mt-4 text-4xl font-bold tracking-tight text-primary">
            Command Center
          </h1>
        </div>
        <p className="font-mono text-sm text-muted-foreground">
          &gt; Track customers, orders, revenue.
          <br />
          &gt; AI-powered insights and predictions.
        </p>
      </div>

      {/* Right: Form */}
      <div className="flex w-full flex-col justify-center px-4 py-8 sm:px-8 sm:py-12 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <p className="font-mono text-xs uppercase tracking-widest text-primary/80 lg:hidden">
            PulseMetrics
          </p>
          <h2 className="font-display mt-2 text-2xl font-bold text-primary">SIGN IN</h2>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            Enter credentials to access dashboard
          </p>
          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {error && (
              <div className="border border-destructive/50 bg-destructive/10 p-3 font-mono text-sm text-destructive">
                {error}
              </div>
            )}
            <div>
              <Label htmlFor="email" className="font-mono text-xs uppercase tracking-wider">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="founder@startup.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 rounded-none font-mono"
                required
              />
            </div>
            <div>
              <Label htmlFor="password" className="font-mono text-xs uppercase tracking-wider">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 rounded-none font-mono"
                required
              />
            </div>
            <Button type="submit" className="w-full rounded-none font-mono" disabled={isSubmitting}>
              {isSubmitting ? "AUTHENTICATING..." : "SIGN IN"}
            </Button>
            <p className="text-center font-mono text-xs text-muted-foreground">
              No account?{" "}
              <Link href="/signup" className="text-primary underline">
                Create one
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
