"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { api, ApiError } from "@/lib/api-client";

const STEPS = [
  "Personal",
  "Contact",
  "Professional",
  "Nominee",
  "Bank",
  "Declaration",
  "Review",
] as const;

interface FormState {
  personal: { fullName: string; dateOfBirth: string; gender: string; fatherOrSpouseName: string };
  contact: {
    email: string;
    phone: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    pincode: string;
  };
  professional: { occupation: string; employer: string; monthlyIncome: string; employmentType: string };
  nominee: { fullName: string; relationship: string; dateOfBirth: string; phone: string; sharePercentage: string };
  bank: { accountHolderName: string; accountNumber: string; ifscCode: string; bankName: string; branch: string };
  declaration: { agreedToRules: boolean; agreedToDataUsage: boolean };
}

const initialState: FormState = {
  personal: { fullName: "", dateOfBirth: "", gender: "PREFER_NOT_TO_SAY", fatherOrSpouseName: "" },
  contact: { email: "", phone: "", addressLine1: "", addressLine2: "", city: "", state: "", pincode: "" },
  professional: { occupation: "", employer: "", monthlyIncome: "", employmentType: "SALARIED" },
  nominee: { fullName: "", relationship: "", dateOfBirth: "", phone: "", sharePercentage: "100" },
  bank: { accountHolderName: "", accountNumber: "", ifscCode: "", bankName: "", branch: "" },
  declaration: { agreedToRules: false, agreedToDataUsage: false },
};

export function RegistrationWizard() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLastStep = step === STEPS.length - 1;

  async function handleNext() {
    if (!isLastStep) {
      setStep((s) => s + 1);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/api/v1/applications", {
        personal: form.personal,
        contact: form.contact,
        professional: {
          ...form.professional,
          monthlyIncome: form.professional.monthlyIncome ? Number(form.professional.monthlyIncome) : undefined,
        },
        nominee: { ...form.nominee, sharePercentage: Number(form.nominee.sharePercentage) },
        bank: form.bank,
        declaration: form.declaration,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong submitting your application.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="surface-card mx-auto max-w-lg p-10 text-center"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
          <PartyPopper className="h-6 w-6" />
        </div>
        <h1 className="font-display mt-5 text-2xl font-medium">Application submitted</h1>
        <p className="mt-2 text-sm text-foreground-muted">
          Thank you for applying. Our team will review your details, and you&apos;ll receive an email with next
          steps once a decision is made.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <ol className="mb-10 flex flex-wrap items-center gap-x-2 gap-y-3">
        {STEPS.map((label, index) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors",
                index < step && "bg-primary text-primary-foreground",
                index === step && "bg-primary-soft text-primary ring-2 ring-primary",
                index > step && "bg-surface-raised text-foreground-muted"
              )}
            >
              {index < step ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </span>
            <span className={cn("hidden text-xs sm:inline", index === step ? "font-medium" : "text-foreground-muted")}>
              {label}
            </span>
            {index < STEPS.length - 1 && <span className="h-px w-4 bg-border sm:w-6" />}
          </li>
        ))}
      </ol>

      <div className="surface-card overflow-hidden p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {step === 0 && <PersonalStep value={form.personal} onChange={(v) => setForm({ ...form, personal: v })} />}
            {step === 1 && <ContactStep value={form.contact} onChange={(v) => setForm({ ...form, contact: v })} />}
            {step === 2 && (
              <ProfessionalStep value={form.professional} onChange={(v) => setForm({ ...form, professional: v })} />
            )}
            {step === 3 && <NomineeStep value={form.nominee} onChange={(v) => setForm({ ...form, nominee: v })} />}
            {step === 4 && <BankStep value={form.bank} onChange={(v) => setForm({ ...form, bank: v })} />}
            {step === 5 && (
              <DeclarationStep value={form.declaration} onChange={(v) => setForm({ ...form, declaration: v })} />
            )}
            {step === 6 && <ReviewStep form={form} />}
          </motion.div>
        </AnimatePresence>

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}

        <div className="mt-8 flex items-center justify-between">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={submitting || (step === 5 && (!form.declaration.agreedToRules || !form.declaration.agreedToDataUsage))}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : isLastStep ? "Submit Application" : "Continue"}
          </Button>
        </div>
      </div>
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

const inputClass =
  "focus-ring w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3.5 py-2.5 text-sm";

function PersonalStep({
  value,
  onChange,
}: {
  value: FormState["personal"];
  onChange: (v: FormState["personal"]) => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-medium">Personal Details</h2>
      <Field label="Full name">
        <input
          className={inputClass}
          value={value.fullName}
          onChange={(e) => onChange({ ...value, fullName: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Date of birth">
          <input
            type="date"
            className={inputClass}
            value={value.dateOfBirth}
            onChange={(e) => onChange({ ...value, dateOfBirth: e.target.value })}
          />
        </Field>
        <Field label="Gender">
          <select
            className={inputClass}
            value={value.gender}
            onChange={(e) => onChange({ ...value, gender: e.target.value })}
          >
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
            <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
          </select>
        </Field>
      </div>
      <Field label="Father's / Spouse's name">
        <input
          className={inputClass}
          value={value.fatherOrSpouseName}
          onChange={(e) => onChange({ ...value, fatherOrSpouseName: e.target.value })}
        />
      </Field>
    </div>
  );
}

function ContactStep({ value, onChange }: { value: FormState["contact"]; onChange: (v: FormState["contact"]) => void }) {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-medium">Contact</h2>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Email">
          <input
            type="email"
            className={inputClass}
            value={value.email}
            onChange={(e) => onChange({ ...value, email: e.target.value })}
          />
        </Field>
        <Field label="Phone">
          <input
            className={inputClass}
            value={value.phone}
            onChange={(e) => onChange({ ...value, phone: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Address line 1">
        <input
          className={inputClass}
          value={value.addressLine1}
          onChange={(e) => onChange({ ...value, addressLine1: e.target.value })}
        />
      </Field>
      <Field label="Address line 2 (optional)">
        <input
          className={inputClass}
          value={value.addressLine2}
          onChange={(e) => onChange({ ...value, addressLine2: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-3 gap-4">
        <Field label="City">
          <input
            className={inputClass}
            value={value.city}
            onChange={(e) => onChange({ ...value, city: e.target.value })}
          />
        </Field>
        <Field label="State">
          <input
            className={inputClass}
            value={value.state}
            onChange={(e) => onChange({ ...value, state: e.target.value })}
          />
        </Field>
        <Field label="Pincode">
          <input
            className={inputClass}
            value={value.pincode}
            onChange={(e) => onChange({ ...value, pincode: e.target.value })}
          />
        </Field>
      </div>
    </div>
  );
}

function ProfessionalStep({
  value,
  onChange,
}: {
  value: FormState["professional"];
  onChange: (v: FormState["professional"]) => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-medium">Professional Details</h2>
      <Field label="Occupation">
        <input
          className={inputClass}
          value={value.occupation}
          onChange={(e) => onChange({ ...value, occupation: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Employer (optional)">
          <input
            className={inputClass}
            value={value.employer}
            onChange={(e) => onChange({ ...value, employer: e.target.value })}
          />
        </Field>
        <Field label="Employment type">
          <select
            className={inputClass}
            value={value.employmentType}
            onChange={(e) => onChange({ ...value, employmentType: e.target.value })}
          >
            <option value="SALARIED">Salaried</option>
            <option value="SELF_EMPLOYED">Self-employed</option>
            <option value="RETIRED">Retired</option>
            <option value="OTHER">Other</option>
          </select>
        </Field>
      </div>
      <Field label="Monthly income (optional)">
        <input
          type="number"
          className={inputClass}
          value={value.monthlyIncome}
          onChange={(e) => onChange({ ...value, monthlyIncome: e.target.value })}
        />
      </Field>
    </div>
  );
}

function NomineeStep({ value, onChange }: { value: FormState["nominee"]; onChange: (v: FormState["nominee"]) => void }) {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-medium">Nominee Details</h2>
      <Field label="Full name">
        <input
          className={inputClass}
          value={value.fullName}
          onChange={(e) => onChange({ ...value, fullName: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Relationship">
          <input
            className={inputClass}
            value={value.relationship}
            onChange={(e) => onChange({ ...value, relationship: e.target.value })}
          />
        </Field>
        <Field label="Date of birth">
          <input
            type="date"
            className={inputClass}
            value={value.dateOfBirth}
            onChange={(e) => onChange({ ...value, dateOfBirth: e.target.value })}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Phone (optional)">
          <input
            className={inputClass}
            value={value.phone}
            onChange={(e) => onChange({ ...value, phone: e.target.value })}
          />
        </Field>
        <Field label="Share %">
          <input
            type="number"
            className={inputClass}
            value={value.sharePercentage}
            onChange={(e) => onChange({ ...value, sharePercentage: e.target.value })}
          />
        </Field>
      </div>
    </div>
  );
}

function BankStep({ value, onChange }: { value: FormState["bank"]; onChange: (v: FormState["bank"]) => void }) {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-medium">Bank Details</h2>
      <Field label="Account holder name">
        <input
          className={inputClass}
          value={value.accountHolderName}
          onChange={(e) => onChange({ ...value, accountHolderName: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Account number">
          <input
            className={inputClass}
            value={value.accountNumber}
            onChange={(e) => onChange({ ...value, accountNumber: e.target.value })}
          />
        </Field>
        <Field label="IFSC code">
          <input
            className={inputClass}
            value={value.ifscCode}
            onChange={(e) => onChange({ ...value, ifscCode: e.target.value })}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Bank name">
          <input
            className={inputClass}
            value={value.bankName}
            onChange={(e) => onChange({ ...value, bankName: e.target.value })}
          />
        </Field>
        <Field label="Branch">
          <input
            className={inputClass}
            value={value.branch}
            onChange={(e) => onChange({ ...value, branch: e.target.value })}
          />
        </Field>
      </div>
    </div>
  );
}

function DeclarationStep({
  value,
  onChange,
}: {
  value: FormState["declaration"];
  onChange: (v: FormState["declaration"]) => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-medium">Declaration</h2>
      <label className="flex items-start gap-3 rounded-[var(--radius-md)] border border-border p-4 text-sm">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={value.agreedToRules}
          onChange={(e) => onChange({ ...value, agreedToRules: e.target.checked })}
        />
        I have read and agree to the society&apos;s Rules &amp; Regulations.
      </label>
      <label className="flex items-start gap-3 rounded-[var(--radius-md)] border border-border p-4 text-sm">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={value.agreedToDataUsage}
          onChange={(e) => onChange({ ...value, agreedToDataUsage: e.target.checked })}
        />
        I consent to my data being used for membership administration purposes.
      </label>
    </div>
  );
}

function ReviewStep({ form }: { form: FormState }) {
  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl font-medium">Review</h2>
      <ReviewSection title="Personal" rows={form.personal} />
      <ReviewSection title="Contact" rows={form.contact} />
      <ReviewSection title="Professional" rows={form.professional} />
      <ReviewSection title="Nominee" rows={form.nominee} />
      <ReviewSection title="Bank" rows={form.bank} />
    </div>
  );
}

function ReviewSection({ title, rows }: { title: string; rows: Record<string, string> }) {
  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-foreground-muted uppercase">{title}</p>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {Object.entries(rows).map(([key, val]) => (
          <div key={key} className="contents">
            <dt className="text-foreground-muted">{humanize(key)}</dt>
            <dd className="truncate">{val || "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function humanize(key: string): string {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}
