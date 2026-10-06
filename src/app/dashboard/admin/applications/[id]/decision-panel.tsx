"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { ShareCredentialsPanel } from "@/components/dashboard/share-credentials-panel";
import { ResendRejection } from "@/components/dashboard/resend-rejection";
import type { ApplicationStatus } from "@/types/domain";

const inputClass =
  "focus-ring w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-sm";

interface Applicant {
  name: string;
  email: string;
  phone: string;
}

export function DecisionPanel({
  applicationId,
  applicant,
  status,
  canDecide,
  rejectionReason,
}: {
  applicationId: string;
  applicant: Applicant;
  status: ApplicationStatus;
  canDecide: boolean;
  rejectionReason: string | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "approve" | "reject">("idle");
  const [message, setMessage] = useState("");
  const [privateNote, setPrivateNote] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [freshCredentials, setFreshCredentials] = useState<{ username: string; password: string } | null>(null);
  const [freshRejectionReason, setFreshRejectionReason] = useState<string | null>(null);

  async function handleApprove(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await api.post<{ username: string; password: string }>(
        `/api/v1/applications/${applicationId}/approve`,
        { message: message || undefined, privateNote: privateNote || undefined }
      );
      setFreshCredentials({ username: data.username, password: data.password });
      setMode("idle");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to approve application.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReject(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post(`/api/v1/applications/${applicationId}/reject`, { reason });
      setFreshRejectionReason(reason);
      setMode("idle");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to reject application.");
    } finally {
      setLoading(false);
    }
  }

  if ((status === "PENDING" || status === "UNDER_REVIEW") && canDecide) {
    if (mode === "idle") {
      return (
        <div className="flex gap-3">
          <Button onClick={() => setMode("approve")}>Approve</Button>
          <Button variant="outline" onClick={() => setMode("reject")}>
            Reject
          </Button>
        </div>
      );
    }

    if (mode === "approve") {
      return (
        <form onSubmit={handleApprove} className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Message to applicant (optional)</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              placeholder="Included with the approval notification."
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Private note (optional)</span>
            <textarea
              value={privateNote}
              onChange={(e) => setPrivateNote(e.target.value)}
              rows={2}
              placeholder="Visible only to this member on their own dashboard once registered — nobody else sees this."
              className={inputClass}
            />
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm approval"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setMode("idle")}>
              Cancel
            </Button>
          </div>
        </form>
      );
    }

    return (
      <form onSubmit={handleReject} className="space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Reason (sent to the applicant)</span>
          <textarea
            required
            minLength={5}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className={inputClass}
          />
        </label>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" variant="outline" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm rejection"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setMode("idle")}>
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  if (status === "APPROVED") {
    if (!canDecide) return null; // resharing credentials is as privileged as issuing them
    return (
      <ShareCredentialsPanel
        resetEndpoint={`/api/v1/members/${applicationId}/reset-password`}
        applicant={applicant}
        initialCredentials={freshCredentials ?? undefined}
      />
    );
  }

  if (status === "REJECTED") {
    const effectiveReason = freshRejectionReason ?? rejectionReason;
    if (!effectiveReason) return null;
    return <ResendRejection applicant={applicant} reason={effectiveReason} />;
  }

  return null; // PENDING/UNDER_REVIEW and no application.approve permission: nothing to act on here
}
