"use client";

import { motion } from "framer-motion";
import { UserPlus, PiggyBank, Landmark, HandCoins, RotateCcw, Sprout } from "lucide-react";
import { Container } from "@/components/ui/container";

const steps = [
  { icon: UserPlus, title: "Member", body: "Join the society through a guided onboarding." },
  { icon: PiggyBank, title: "Contribution", body: "Contribute a fixed amount every month." },
  { icon: Landmark, title: "Community Fund", body: "Contributions pool into a transparent shared fund." },
  { icon: HandCoins, title: "Loan Support", body: "Eligible members borrow against the fund when they need it." },
  { icon: RotateCcw, title: "Repayment", body: "Repay in manageable installments, tracked openly." },
  { icon: Sprout, title: "Community Growth", body: "The fund — and the community around it — grows stronger." },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 sm:py-32">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-medium text-primary">How it works</span>
          <h2 className="font-display mt-3 text-3xl font-medium tracking-tight sm:text-4xl">
            A simple cycle of mutual support
          </h2>
          <p className="mt-4 text-foreground-muted">
            No hidden mechanics — every step of the cycle is visible to every member.
          </p>
        </div>

        <div className="relative mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div
            aria-hidden
            className="absolute inset-x-0 top-8 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent lg:block"
          />
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="surface-card relative p-6"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft text-primary">
                <step.icon className="h-5 w-5" />
              </div>
              <p className="mt-4 text-xs font-medium text-foreground-muted">Step {index + 1}</p>
              <h3 className="font-display mt-1 text-lg font-medium">{step.title}</h3>
              <p className="mt-2 text-sm text-foreground-muted">{step.body}</p>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
