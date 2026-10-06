"use client";

import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RuleItemDoc {
  id: string;
  title: string;
  body: string;
}

interface RuleCategoryDoc {
  id: string;
  name: string;
  items: RuleItemDoc[];
}

export function RulesGate() {
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<RuleCategoryDoc[]>([]);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/rules-access-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await res.json();
      if (!payload.success) throw new Error(payload.error?.message ?? "Something went wrong");

      const contentRes = await fetch("/api/v1/rules-content");
      const contentPayload = await contentRes.json();
      setCategories(contentPayload.data.categories);
      setUnlocked(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <AnimatePresence mode="wait">
        {!unlocked ? (
          <motion.div
            key="gate"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="surface-card p-8"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
              <BookOpen className="h-5 w-5" />
            </div>
            <h1 className="font-display mt-5 text-2xl font-medium">Rules &amp; Regulations</h1>
            <p className="mt-2 text-sm text-foreground-muted">
              Leave a few details and we&apos;ll unlock the society&apos;s rules right away — no waiting, no
              spam.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <Field label="Full name">
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="focus-ring w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3.5 py-2.5 text-sm"
                  placeholder="Your name"
                />
              </Field>
              <Field label="Email">
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="focus-ring w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3.5 py-2.5 text-sm"
                  placeholder="you@example.com"
                />
              </Field>
              <Field label="Phone">
                <input
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="focus-ring w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3.5 py-2.5 text-sm"
                  placeholder="+91 90000 00000"
                />
              </Field>

              {error && <p className="text-sm text-danger">{error}</p>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "View the Rules"}
              </Button>
              <p className="flex items-center gap-1.5 text-xs text-foreground-muted">
                <ShieldCheck className="h-3.5 w-3.5" /> We only use this to follow up if you have questions.
              </p>
            </form>
          </motion.div>
        ) : (
          <motion.article
            key="content"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="surface-card p-8"
          >
            <h1 className="font-display text-2xl font-medium">Rules &amp; Regulations</h1>
            {categories.length === 0 ? (
              <p className="mt-4 text-sm text-foreground-muted">
                Rules content hasn&apos;t been published yet. An administrator can add it from the content
                management screen.
              </p>
            ) : (
              <div className="mt-6 space-y-8">
                {categories.map((category) => (
                  <div key={category.id}>
                    <h2 className="font-display text-lg font-medium">{category.name}</h2>
                    <div className="mt-3 space-y-4">
                      {category.items.map((item) => (
                        <div key={item.id}>
                          <p className="text-sm font-medium">{item.title}</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground-muted">
                            {item.body}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.article>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
