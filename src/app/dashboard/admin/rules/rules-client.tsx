"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ChevronDown, ChevronUp, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import type { RuleCategory, RuleItem } from "@/types/domain";

type CategoryWithItems = RuleCategory & { items: RuleItem[] };

const inputClass =
  "focus-ring w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-sm";

export function RulesClient() {
  const [categories, setCategories] = useState<CategoryWithItems[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const data = await api.get<{ categories: CategoryWithItems[] }>("/api/v1/rules-content");
      setCategories(data.categories);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load rules content.");
    }
  }

  useEffect(() => {
    // Mount-only fetch of server data unavailable during SSR — same intentional pattern as
    // src/components/ui/theme-toggle.tsx.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-medium tracking-tight">Rules & Regulations</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Manage the categorized rules content shown on the public Rules page.
        </p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {categories === null ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-foreground-muted" />
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((category, i) => (
            <CategoryCard
              key={category.id}
              category={category}
              isFirst={i === 0}
              isLast={i === categories.length - 1}
              onChanged={refresh}
            />
          ))}
          <AddCategoryForm onAdded={refresh} />
        </div>
      )}
    </div>
  );
}

function AddCategoryForm({ onAdded }: { onAdded: () => void }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post("/api/v1/rules-content/categories", { name });
      setName("");
      onAdded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add category.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="surface-card flex items-center gap-2 p-4">
      <input
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New category name (e.g. Membership, Loans, Contributions)"
        className={inputClass}
      />
      <Button type="submit" size="sm" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Add category
      </Button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}

function CategoryCard({
  category,
  isFirst,
  isLast,
  onChanged,
}: {
  category: CategoryWithItems;
  isFirst: boolean;
  isLast: boolean;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [busy, setBusy] = useState(false);

  async function move(direction: "up" | "down") {
    setBusy(true);
    try {
      await api.post(`/api/v1/rules-content/categories/${category.id}/move`, { direction });
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function rename() {
    setBusy(true);
    try {
      await api.patch(`/api/v1/rules-content/categories/${category.id}`, { name });
      setEditing(false);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete "${category.name}" and all ${category.items.length} item(s) in it?`)) return;
    setBusy(true);
    try {
      await api.delete(`/api/v1/rules-content/categories/${category.id}`);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="surface-card p-6">
      <div className="flex items-center justify-between gap-2">
        {editing ? (
          <div className="flex flex-1 items-center gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            <Button size="sm" onClick={rename} disabled={busy}>
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setName(category.name);
                setEditing(false);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <h2 className="font-display text-lg font-medium">{category.name}</h2>
        )}

        {!editing && (
          <div className="flex items-center gap-1">
            <IconButton label="Move up" disabled={isFirst || busy} onClick={() => move("up")}>
              <ChevronUp className="h-4 w-4" />
            </IconButton>
            <IconButton label="Move down" disabled={isLast || busy} onClick={() => move("down")}>
              <ChevronDown className="h-4 w-4" />
            </IconButton>
            <IconButton label="Rename category" disabled={busy} onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
            </IconButton>
            <IconButton label="Delete category" disabled={busy} onClick={remove}>
              <Trash2 className="h-4 w-4 text-danger" />
            </IconButton>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {category.items.length === 0 ? (
          <p className="text-sm text-foreground-muted">No rule items in this category yet.</p>
        ) : (
          category.items.map((item, i) => (
            <ItemRow
              key={item.id}
              item={item}
              isFirst={i === 0}
              isLast={i === category.items.length - 1}
              onChanged={onChanged}
            />
          ))
        )}
      </div>

      <div className="mt-4">
        <AddItemForm categoryId={category.id} onAdded={onChanged} />
      </div>
    </div>
  );
}

function ItemRow({
  item,
  isFirst,
  isLast,
  onChanged,
}: {
  item: RuleItem;
  isFirst: boolean;
  isLast: boolean;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [body, setBody] = useState(item.body);
  const [busy, setBusy] = useState(false);

  async function move(direction: "up" | "down") {
    setBusy(true);
    try {
      await api.post(`/api/v1/rules-content/items/${item.id}/move`, { direction });
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    try {
      await api.patch(`/api/v1/rules-content/items/${item.id}`, { title, body });
      setEditing(false);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete rule "${item.title}"?`)) return;
    setBusy(true);
    try {
      await api.delete(`/api/v1/rules-content/items/${item.id}`);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <div className="rounded-[var(--radius-md)] border border-border p-3 space-y-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          className={inputClass}
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={save} disabled={busy}>
            Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setTitle(item.title);
              setBody(item.body);
              setEditing(false);
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-2 rounded-[var(--radius-md)] bg-surface-raised p-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{item.title}</p>
        <p className="mt-0.5 whitespace-pre-wrap text-sm text-foreground-muted">{item.body}</p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-1">
        <IconButton label="Move up" disabled={isFirst || busy} onClick={() => move("up")}>
          <ChevronUp className="h-4 w-4" />
        </IconButton>
        <IconButton label="Move down" disabled={isLast || busy} onClick={() => move("down")}>
          <ChevronDown className="h-4 w-4" />
        </IconButton>
        <IconButton label="Edit rule" disabled={busy} onClick={() => setEditing(true)}>
          <Pencil className="h-4 w-4" />
        </IconButton>
        <IconButton label="Delete rule" disabled={busy} onClick={remove}>
          <Trash2 className="h-4 w-4 text-danger" />
        </IconButton>
      </div>
    </div>
  );
}

function AddItemForm({ categoryId, onAdded }: { categoryId: string; onAdded: () => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post("/api/v1/rules-content/items", { categoryId, title, body });
      setTitle("");
      setBody("");
      setOpen(false);
      onAdded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add rule.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Add rule
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded-[var(--radius-md)] border border-border p-3">
      <input
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Rule title"
        className={inputClass}
      />
      <textarea
        required
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Rule text"
        rows={3}
        className={inputClass}
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" type="submit" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save rule"}
        </Button>
        <Button size="sm" variant="ghost" type="button" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-full text-foreground-muted transition-colors hover:bg-surface hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}
