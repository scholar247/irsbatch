"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils/cn";

const faqs = [
  {
    q: "Who can become a member?",
    a: "Membership is open to anyone the society's rules qualify — you'll go through a short guided application, and staff review it before approval.",
  },
  {
    q: "How is my contribution used?",
    a: "Every contribution is recorded on an immutable ledger and pooled into the community fund, which is then available for member loans.",
  },
  {
    q: "How are loans approved?",
    a: "Every loan passes through a configurable maker-checker chain — no single person can approve and disburse a loan alone.",
  },
  {
    q: "What if I miss a contribution?",
    a: "You'll get a reminder before it affects your streak or loan eligibility, and staff can help you catch up.",
  },
  {
    q: "Is my data visible to other members?",
    a: "No. Every request is authorized on the server — members can only ever see their own records.",
  },
];

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 sm:py-32">
      <Container className="max-w-3xl">
        <div className="text-center">
          <span className="text-sm font-medium text-primary">FAQ</span>
          <h2 className="font-display mt-3 text-3xl font-medium tracking-tight sm:text-4xl">Common questions</h2>
        </div>

        <div className="mt-12 divide-y divide-border border-y border-border">
          {faqs.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="focus-ring flex w-full items-center justify-between gap-4 py-5 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="font-medium">{item.q}</span>
                  <Plus className={cn("h-4 w-4 shrink-0 transition-transform duration-300", isOpen && "rotate-45")} />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="pb-5 text-sm text-foreground-muted">{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
