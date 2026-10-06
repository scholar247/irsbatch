/** Builds a wa.me deep link that opens WhatsApp with the chat + message pre-filled. */
export function buildWhatsAppLink(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, "");
  const withCountryCode = digits.length <= 10 ? `91${digits}` : digits; // this app is India-only (IFSC, pincode)
  return `https://wa.me/${withCountryCode}?text=${encodeURIComponent(text)}`;
}

/** Builds a mailto: link that opens the default mail client with subject + body pre-filled. */
export function buildMailtoLink(email: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function approvalMessage(input: {
  name: string;
  email: string;
  phone: string;
  username: string;
  password: string;
}): string {
  return [
    `Hi ${input.name}, your IRS Batch 2007 membership application has been approved.`,
    "",
    `Email: ${input.email}`,
    `Phone: ${input.phone}`,
    `Username: ${input.username}`,
    `Password: ${input.password}`,
    "",
    "Please log in and change your password after your first login. Welcome to the community!",
  ].join("\n");
}

export function rejectionMessage(input: { name: string; reason: string }): string {
  return [
    `Hi ${input.name}, thank you for your interest in joining IRS Batch 2007.`,
    "",
    "Unfortunately, we're unable to approve your membership application at this time.",
    `Reason: ${input.reason}`,
    "",
    "If you have questions, please reach out to us.",
  ].join("\n");
}
