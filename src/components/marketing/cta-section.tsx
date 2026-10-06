"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";

export function CtaSection() {
  return (
    <section className="py-24">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="gradient-mesh surface-card relative overflow-hidden px-8 py-16 text-center sm:px-16"
        >
          <h2 className="font-display text-3xl font-medium tracking-tight text-balance sm:text-4xl">
            Ready to build something lasting, together?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-foreground-muted">
            Join a community that treats financial discipline as care, not obligation.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg">Become a Member</Button>
            </Link>
            <Link href="/rules">
              <Button size="lg" variant="outline">
                Read the Rules
              </Button>
            </Link>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
