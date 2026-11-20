"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { promoteManagerAction } from "@/lib/actions/managers";
import { useRealtime } from "@/components/realtime/RealtimeProvider";

export function ManagerAdminAccessButton({ managerId, isAdmin }: { managerId: string; isAdmin?: boolean }) {
  const router = useRouter();
  const { notify } = useRealtime();
  const [granted, setGranted] = useState(Boolean(isAdmin));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (granted) return <span className="rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success">Admin Access</span>;

  function grant() {
    if (!window.confirm("Grant Admin Access?\n\nThis manager will retain Manager access and will also be able to access the Admin Panel.")) return;
    setError(null);
    startTransition(async () => {
      const result = await promoteManagerAction(managerId);
      if (result.status === "success") {
        setGranted(true);
        notify("Admin access granted successfully.");
        router.refresh();
      } else {
        setError(result.message ?? "Unable to grant Admin access.");
      }
    });
  }

  return <div className="grid justify-items-end gap-1"><button type="button" className="btn btn-line btn-sm" onClick={grant} disabled={pending}>{pending ? "Granting…" : "Grant Admin Access"}</button>{error && <span className="max-w-44 text-right text-xs text-destructive" role="alert">{error}</span>}</div>;
}
