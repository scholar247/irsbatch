import { collections } from "@/lib/db/collections";
import { requireServerPermission } from "@/lib/rbac/server-guard";

export default async function RulesRequestsPage() {
  await requireServerPermission("content.manage"); // redirects to /dashboard if not staff

  const requests = await collections
    .rulesAccessRequests()
    .orderBy("requestedAt", "desc")
    .limit(100)
    .get()
    .then((snap) => snap.docs.map((d) => d.data()));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-medium tracking-tight">Rules Access Requests</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Everyone who has filled the lead-capture form to view Rules & Regulations, most recent first.
        </p>
      </div>

      <div className="surface-card p-2">
        {requests.length === 0 ? (
          <p className="px-3 py-10 text-center text-sm text-foreground-muted">No requests yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-foreground-muted">
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">Phone</th>
                <th className="px-3 py-2 font-medium">Viewed at</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {requests.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-3 font-medium">{r.name}</td>
                  <td className="px-3 py-3 text-foreground-muted">{r.email}</td>
                  <td className="px-3 py-3 text-foreground-muted">{r.phone}</td>
                  <td className="px-3 py-3 text-foreground-muted">
                    {new Date(r.requestedAt).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
