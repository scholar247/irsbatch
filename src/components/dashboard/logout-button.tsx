"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { api } from "@/lib/api-client";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        await api.post("/api/v1/auth/logout").catch(() => {});
        router.push("/login");
        router.refresh();
      }}
      className="focus-ring flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-sm text-foreground-muted transition-colors hover:bg-surface-raised disabled:opacity-50"
    >
      <LogOut className="h-3.5 w-3.5" /> Log out
    </button>
  );
}
