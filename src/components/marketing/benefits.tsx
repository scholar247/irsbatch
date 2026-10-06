"use client";

import { motion } from "framer-motion";
import { BadgeCheck, Bell, LineChart, Lock, ScrollText, Sparkles } from "lucide-react";
import { Container } from "@/components/ui/container";

const benefits = [
  {
    icon: LineChart,
    title: "A fund you can watch grow",
    body: "Every contribution, disbursement, and repayment lands on an immutable ledger — nothing is ever quietly overwritten.",
  },
  {
    icon: ScrollText,
    title: "Rules, not favors",
    body: "Loan eligibility and approvals follow the same configurable, published rules for every member.",
  },
  {
    icon: Bell,
    title: "You're always in the loop",
    body: "In-app, email, SMS and push notifications keep you posted the moment something about your account changes.",
  },
  {
    icon: Sparkles,
    title: "Recognition that means something",
    body: "Consistency streaks and milestone badges celebrate discipline — not competition.",
  },
  {
    icon: Lock,
    title: "Built to keep your data yours",
    body: "Every request is authorized server-side; no member can ever see another member's records.",
  },
  {
    icon: BadgeCheck,
    title: "Checked, not just trusted",
    body: "A maker-checker chain reviews every loan and every large decision before it's final.",
  },
];

export function Benefits() {
  return (
    <section id="benefits" className="py-24 sm:py-32">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-medium text-primary">Why members stay</span>
          <h2 className="font-display mt-3 text-3xl font-medium tracking-tight sm:text-4xl">
            Built for long-term belonging
          </h2>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.5, delay: (index % 3) * 0.08 }}
              className="rounded-[var(--radius-lg)] border border-border p-6 transition-colors hover:bg-surface-raised"
            >
              <benefit.icon className="h-6 w-6 text-accent" />
              <h3 className="font-display mt-4 text-lg font-medium">{benefit.title}</h3>
              <p className="mt-2 text-sm text-foreground-muted">{benefit.body}</p>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
