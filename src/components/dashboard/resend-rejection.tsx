import { Mail, MessageCircle } from "lucide-react";
import { buildMailtoLink, buildWhatsAppLink, rejectionMessage } from "@/lib/utils/share-links";

/** The rejection reason is stored permanently, so resending it needs no regeneration — always available, any number of times. */
export function ResendRejection({
  applicant,
  reason,
}: {
  applicant: { name: string; email: string; phone: string };
  reason: string;
}) {
  const text = rejectionMessage({ name: applicant.name, reason });
  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={buildWhatsAppLink(applicant.phone, text)}
        target="_blank"
        rel="noopener noreferrer"
        className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-raised"
      >
        <MessageCircle className="h-4 w-4" /> WhatsApp
      </a>
      <a
        href={buildMailtoLink(applicant.email, "Update on your IRS Batch 2007 membership application", text)}
        className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-raised"
      >
        <Mail className="h-4 w-4" /> Email
      </a>
    </div>
  );
}
