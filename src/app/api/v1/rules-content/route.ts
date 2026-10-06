import { collections } from "@/lib/db/collections";
import { ok, withErrorHandling } from "@/lib/api/response";
import type { RuleCategory, RuleItem } from "@/types/domain";

/**
 * Public aggregate read for the Rules & Regulations gate (no auth — same public-content
 * model as the old content/[key] "rules" key it replaces). Returns categories, each with
 * its items nested and both sorted by `order`.
 */
export const GET = withErrorHandling(async () => {
  const [categoriesSnap, itemsSnap] = await Promise.all([
    collections.ruleCategories().orderBy("order", "asc").get(),
    collections.ruleItems().orderBy("order", "asc").get(),
  ]);

  const itemsByCategory = new Map<string, RuleItem[]>();
  itemsSnap.docs.forEach((doc) => {
    const item = doc.data();
    const list = itemsByCategory.get(item.categoryId) ?? [];
    list.push(item);
    itemsByCategory.set(item.categoryId, list);
  });

  const categories = categoriesSnap.docs.map((doc) => {
    const category = doc.data() as RuleCategory;
    return { ...category, items: itemsByCategory.get(category.id) ?? [] };
  });

  return ok({ categories });
});
