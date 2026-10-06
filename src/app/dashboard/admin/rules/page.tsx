import { requireServerPermission } from "@/lib/rbac/server-guard";
import { RulesClient } from "@/app/dashboard/admin/rules/rules-client";

export default async function AdminRulesPage() {
  await requireServerPermission("content.manage"); // redirects to /dashboard if not staff
  return <RulesClient />;
}
