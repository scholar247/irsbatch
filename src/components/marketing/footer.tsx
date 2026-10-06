import Link from "next/link";
import { Container } from "@/components/ui/container";

export function Footer() {
  return (
    <footer className="border-t border-border py-12">
      <Container className="flex flex-col items-center justify-between gap-6 sm:flex-row">
        <div>
          <p className="font-display text-lg font-medium">
            IRS Batch <span className="text-gradient-primary">2007</span>
          </p>
          <p className="mt-1 text-sm text-foreground-muted">A community fund, run in the open.</p>
        </div>
        <nav className="flex flex-wrap items-center gap-6 text-sm text-foreground-muted">
          <Link href="/rules" className="hover:text-foreground">
            Rules &amp; Regulations
          </Link>
          <Link href="/about" className="hover:text-foreground">
            About
          </Link>
          <Link href="/contact" className="hover:text-foreground">
            Contact
          </Link>
        </nav>
        <p className="text-xs text-foreground-muted">
          © {new Date().getFullYear()} IRS Batch 2007 Community. All rights reserved.
        </p>
      </Container>
    </footer>
  );
}
