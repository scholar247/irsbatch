import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getServerAuthContext } from "@/lib/rbac/server-guard";
import { getPermissionsForRoles } from "@/lib/rbac/permissions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const auth = await getServerAuthContext(); // redirects to /login if not authenticated
  const permissions = Array.from(await getPermissionsForRoles(auth.roles));

  return (
    <DashboardShell roles={auth.roles} permissions={permissions}>
      {children}
    </DashboardShell>
  );
}
