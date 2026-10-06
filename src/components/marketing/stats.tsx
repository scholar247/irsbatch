"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import type { PublicStats } from "@/lib/reports/public-stats";

export function Stats({ stats }: { stats: PublicStats }) {
  const items = [
    { label: "Active members", value: stats.activeMembers, prefix: "", suffix: "" },
    { label: "Contributed to date", value: stats.totalContributed, prefix: "₹", suffix: "" },
    { label: "Disbursed in loans", value: stats.totalDisbursed, prefix: "₹", suffix: "" },
    { label: "Loans supported", value: stats.loansSupported, prefix: "", suffix: "" },
  ];

  return (
    <section className="border-y border-border bg-surface py-20">
      <Container className="grid grid-cols-2 gap-8 sm:grid-cols-4">
        {items.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.08 }}
            className="text-center"
          >
            <p className="font-display text-3xl font-medium sm:text-4xl">
              <AnimatedCounter value={item.value} prefix={item.prefix} suffix={item.suffix} />
            </p>
            <p className="mt-2 text-sm text-foreground-muted">{item.label}</p>
          </motion.div>
        ))}
      </Container>
    </section>
  );
}
