"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import type { Member, MemberStatus } from "@/types/domain";

const inputClass =
  "focus-ring w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-sm";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="text-foreground-muted">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

export function MemberForm({
  member,
  canEdit,
  canSuspend,
}: {
  member: Member;
  canEdit: boolean;
  canSuspend: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    fullName: member.personal.fullName,
    fatherOrSpouseName: member.personal.fatherOrSpouseName,
    phone: member.contact.phone,
    addressLine1: member.contact.addressLine1,
    addressLine2: member.contact.addressLine2 ?? "",
    city: member.contact.city,
    state: member.contact.state,
    pincode: member.contact.pincode,
  });
  const [status, setStatus] = useState<MemberStatus>(member.status);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.patch(`/api/v1/members/${member.id}`, {
        personal: { fullName: form.fullName, fatherOrSpouseName: form.fatherOrSpouseName },
        contact: {
          phone: form.phone,
          addressLine1: form.addressLine1,
          addressLine2: form.addressLine2 || undefined,
          city: form.city,
          state: form.state,
          pincode: form.pincode,
        },
      });
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save changes.");
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(next: MemberStatus) {
    setLoading(true);
    setError(null);
    try {
      await api.patch(`/api/v1/members/${member.id}`, { status: next });
      setStatus(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update status.");
    } finally {
      setLoading(false);
    }
  }

  if (!editing) {
    return (
      <div className="space-y-4">
        {canEdit && (
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setEditing(true)}>
              Edit
            </Button>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="surface-card p-6">
            <p className="mb-3 text-sm font-medium text-foreground-muted">Personal</p>
            <dl className="space-y-2">
              <Field label="Full name" value={member.personal.fullName} />
              <Field label="Date of birth" value={member.personal.dateOfBirth} />
              <Field label="Gender" value={member.personal.gender} />
              <Field label="Father / spouse name" value={member.personal.fatherOrSpouseName} />
            </dl>
          </div>
          <div className="surface-card p-6">
            <p className="mb-3 text-sm font-medium text-foreground-muted">Contact</p>
            <dl className="space-y-2">
              <Field label="Email" value={member.contact.email} />
              <Field label="Phone" value={member.contact.phone} />
              <Field
                label="Address"
                value={`${member.contact.addressLine1}${
                  member.contact.addressLine2 ? ", " + member.contact.addressLine2 : ""
                }, ${member.contact.city}, ${member.contact.state} ${member.contact.pincode}`}
              />
            </dl>
          </div>
        </div>

        {canSuspend && (
          <div className="surface-card p-6">
            <p className="mb-3 text-sm font-medium text-foreground-muted">Membership status</p>
            <div className="flex gap-2">
              {(["ACTIVE", "SUSPENDED", "CANCELLED"] as const).map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={status === s ? "primary" : "outline"}
                  disabled={loading || status === s}
                  onClick={() => handleStatusChange(s)}
                >
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </Button>
              ))}
            </div>
          </div>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="surface-card space-y-3 p-6">
          <p className="mb-1 text-sm font-medium text-foreground-muted">Personal</p>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Full name</span>
            <input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Father / spouse name</span>
            <input
              value={form.fatherOrSpouseName}
              onChange={(e) => setForm({ ...form, fatherOrSpouseName: e.target.value })}
              className={inputClass}
            />
          </label>
        </div>
        <div className="surface-card space-y-3 p-6">
          <p className="mb-1 text-sm font-medium text-foreground-muted">Contact</p>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Phone</span>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Address line 1</span>
            <input
              value={form.addressLine1}
              onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Address line 2</span>
            <input
              value={form.addressLine2}
              onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
              className={inputClass}
            />
          </label>
          <div className="grid grid-cols-3 gap-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">City</span>
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">State</span>
              <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Pincode</span>
              <input
                value={form.pincode}
                onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                className={inputClass}
              />
            </label>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
