"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api-client";

function ActivateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post("/api/v1/auth/activate", { token, username, password });
      setDone(true);
      setTimeout(() => router.push("/login"), 1800);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong activating your account.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="surface-card w-full max-w-sm p-8 text-center">
        <p className="text-sm text-danger">This activation link is missing its token. Please use the link from your email.</p>
      </div>
    );
  }

  if (done) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="surface-card w-full max-w-sm p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h1 className="font-display mt-4 text-xl font-medium">Account activated</h1>
        <p className="mt-2 text-sm text-foreground-muted">Redirecting you to login...</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="surface-card w-full max-w-sm p-8"
    >
      <h1 className="font-display text-2xl font-medium">Activate your account</h1>
      <p className="mt-1 text-sm text-foreground-muted">Choose a username and password to get started.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Username</span>
          <input
            required
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            className="focus-ring w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3.5 py-2.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Password</span>
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="focus-ring w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3.5 py-2.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Confirm password</span>
          <input
            required
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="focus-ring w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3.5 py-2.5 text-sm"
          />
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Activate account"}
        </Button>
      </form>
    </motion.div>
  );
}

export default function ActivatePage() {
  return (
    <div className="gradient-mesh flex min-h-screen items-center justify-center p-4">
      <Suspense fallback={null}>
        <ActivateForm />
      </Suspense>
    </div>
  );
}
