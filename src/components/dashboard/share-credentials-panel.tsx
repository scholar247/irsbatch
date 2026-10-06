"use client";

import { useState } from "react";
import { Check, Copy, Eye, EyeOff, Loader2, Mail, MessageCircle } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { approvalMessage, buildMailtoLink, buildWhatsAppLink } from "@/lib/utils/share-links";

interface Applicant {
  name: string;
  email: string;
  phone: string;
}

/**
 * Persistent "share login details" block — usable any number of times, not a one-shot
 * reveal. Each click of "Generate new password" issues a fresh one (POST .../reset-password);
 * the previous password was never stored anywhere retrievable, so there's nothing to look up
 * — this is a real password reset each time, exactly like requesting a new one anywhere else.
 */
export function ShareCredentialsPanel({
  resetEndpoint,
  applicant,
  initialCredentials,
}: {
  resetEndpoint: string;
  applicant: Applicant;
  /** Pass this right after a fresh approval, when the password is already in hand from that response — skips the extra reset call. */
  initialCredentials?: { username: string; password: string };
}) {
  const [credentials, setCredentials] = useState(initialCredentials ?? null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.post<{ username: string; password: string }>(resetEndpoint);
      setCredentials(data);
      setShowPassword(false);
      setCopied(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to generate a new password.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!credentials) return;
    try {
      await navigator.clipboard.writeText(credentials.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — password is still visible to copy manually.
    }
  }

  if (!credentials) {
    return (
      <div className="space-y-2">
        <Button size="sm" onClick={handleGenerate} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate password & share"}
        </Button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    );
  }

  const text = approvalMessage({
    name: applicant.name,
    email: applicant.email,
    phone: applicant.phone,
    username: credentials.username,
    password: credentials.password,
  });

  return (
    <div className="space-y-3">
      <p className="text-sm text-foreground-muted">
        Shown once per generation — copy or share it now; generating again invalidates this one.
      </p>

      <div className="space-y-2 rounded-[var(--radius-md)] bg-surface-raised p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground-muted">Username</span>
          <span className="font-medium">{credentials.username}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground-muted">Password</span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-medium">
              {showPassword ? credentials.password : "•".repeat(credentials.password.length)}
            </span>
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded-full text-foreground-muted hover:bg-surface hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded-full text-foreground-muted hover:bg-surface hover:text-foreground"
              aria-label="Copy password"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <a
          href={buildWhatsAppLink(applicant.phone, text)}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-raised"
        >
          <MessageCircle className="h-4 w-4" /> WhatsApp
        </a>
        <a
          href={buildMailtoLink(applicant.email, "Your IRS Batch 2007 membership has been approved", text)}
          className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-raised"
        >
          <Mail className="h-4 w-4" /> Email
        </a>
        <Button size="sm" variant="ghost" onClick={handleGenerate} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate another"}
        </Button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
