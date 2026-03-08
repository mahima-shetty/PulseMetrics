"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user) router.replace("/dashboard");
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { access_token, refresh_token } = await authApi.signup({
        email,
        password,
        full_name: fullName,
      });
      localStorage.setItem("access_token", access_token);
      localStorage.setItem("refresh_token", refresh_token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen">
      {/* Left: Brand */}
      <div className="hidden w-1/2 flex-col justify-between border-r border-primary/20 bg-card/30 p-12 lg:flex">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.4em] text-primary/60">PulseMetrics</p>
          <h1 className="font-display mt-4 text-4xl font-bold tracking-tight text-primary">
            Command Center
          </h1>
        </div>
        <p className="font-mono text-sm text-muted-foreground">
          &gt; Create your account to start tracking metrics.
          <br />
          &gt; Get AI insights and revenue predictions.
        </p>
      </div>

      {/* Right: Form */}
      <div className="flex w-full flex-col justify-center px-8 py-12 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <p className="font-mono text-xs uppercase tracking-widest text-primary/80 lg:hidden">
            PulseMetrics
          </p>
          <h2 className="font-display mt-2 text-2xl font-bold text-primary">CREATE ACCOUNT</h2>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            Register to access the dashboard
          </p>
          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {error && (
              <div className="border border-destructive/50 bg-destructive/10 p-3 font-mono text-sm text-destructive">
                {error}
              </div>
            )}
            <div>
              <Label htmlFor="fullName" className="font-mono text-xs uppercase tracking-wider">
                Full name
              </Label>
              <Input
                id="fullName"
                placeholder="Jane Founder"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-2 rounded-none font-mono"
                required
              />
            </div>
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
            <Button type="submit" className="w-full rounded-none font-mono" disabled={loading}>
              {loading ? "CREATING..." : "SIGN UP"}
            </Button>
            <p className="text-center font-mono text-xs text-muted-foreground">
              Have an account?{" "}
              <Link href="/login" className="text-primary underline">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
