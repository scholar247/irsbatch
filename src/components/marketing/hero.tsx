"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { ShieldCheck, TrendingUp, Users } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { AnimatedCounter } from "@/components/ui/animated-counter";

const EASE_PREMIUM: [number, number, number, number] = [0.16, 1, 0.3, 1];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.08, ease: EASE_PREMIUM },
  }),
};

export function Hero({ totalContributed }: { totalContributed: number }) {
  return (
    <section className="gradient-mesh relative overflow-hidden pb-24 pt-20 sm:pt-28">
      <Container className="grid items-center gap-16 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-medium text-foreground-muted">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              A community fund built on trust, not paperwork
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={1}
            className="font-display mt-6 text-4xl leading-[1.08] font-medium tracking-tight text-balance sm:text-5xl lg:text-6xl"
          >
            Your community,
            <br />
            <span className="text-gradient-primary">growing together.</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={2}
            className="mt-6 max-w-lg text-lg text-foreground-muted"
          >
            Contribute monthly, watch the community fund grow, and lean on each other through
            life&apos;s bigger moments — with every rupee tracked, every decision accountable,
            and every member seen.
          </motion.p>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={3}
            className="mt-9 flex flex-wrap items-center gap-4"
          >
            <Link href="/register">
              <Button size="lg">Become a Member</Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                Member Login
              </Button>
            </Link>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={4}
            className="mt-10 flex items-center gap-6 text-sm text-foreground-muted"
          >
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-primary" /> Member-governed
            </span>
            <span className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-primary" /> Transparent ledger
            </span>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto w-full max-w-sm"
        >
          <div className="surface-card relative overflow-hidden p-6">
            <p className="text-sm text-foreground-muted">Community Fund</p>
            <p className="font-display mt-1 text-3xl font-medium">
              <AnimatedCounter value={totalContributed} prefix="₹" />
            </p>
            <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-primary-soft">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "78%" }}
                transition={{ duration: 1.2, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="h-full rounded-full bg-primary"
              />
            </div>
            <p className="mt-2 text-xs text-foreground-muted">Growing steadily, month over month</p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-[var(--radius-md)] bg-surface-raised p-3">
                <p className="text-xs text-foreground-muted">Streak</p>
                <p className="font-display text-lg font-medium">12 months</p>
              </div>
              <div className="rounded-[var(--radius-md)] bg-surface-raised p-3">
                <p className="text-xs text-foreground-muted">Status</p>
                <p className="font-display text-lg font-medium text-success">Debt-free</p>
              </div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10, rotate: -4 }}
            animate={{ opacity: 1, y: 0, rotate: -4 }}
            transition={{ duration: 0.7, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="surface-card absolute -bottom-6 -left-8 hidden w-44 p-3.5 sm:block"
          >
            <p className="text-xs text-foreground-muted">Badge unlocked</p>
            <p className="mt-0.5 text-sm font-medium">Consistent Contributor</p>
          </motion.div>
        </motion.div>
      </Container>
    </section>
  );
}
